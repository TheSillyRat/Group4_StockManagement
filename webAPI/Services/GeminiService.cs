using System.Text.Json;
using System.Text.RegularExpressions;
using System.Net.Http.Headers;
using webAPI.DTOs;

namespace webAPI.Services;

/// <summary>
/// Implementation of DeepSeek AI Service (Requirement R4 - Sang Huỳnh)
/// Extracts structured transaction data from natural language, handles ambiguity,
/// and falls back to deterministic extraction when offline or API key is absent.
/// </summary>
public class GeminiService : IGeminiService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiService> _logger;
    private readonly HttpClient _httpClient;

    public GeminiService(IConfiguration configuration, ILogger<GeminiService> logger, HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<ExtractedTransactionDto> ExtractInventoryDataAsync(string naturalLanguageText)
    {
        if (string.IsNullOrWhiteSpace(naturalLanguageText))
        {
            return new ExtractedTransactionDto
            {
                IsAmbiguous = true,
                ClarificationMessage = "Prompt is empty. Please enter an inventory request."
            };
        }

        var trimmedText = naturalLanguageText.Trim();

        // 1. Retrieve DEEPSEEK_API_KEY from environment or appsettings
        var apiKey = Environment.GetEnvironmentVariable("DEEPSEEK_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = _configuration["DeepSeek:ApiKey"];
        }

        // 2. If API Key is configured, attempt call to DeepSeek
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var extracted = await CallDeepSeekApiAsync(apiKey, trimmedText);
                if (extracted != null)
                {
                    PostProcessDto(extracted, trimmedText);
                    return extracted;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DeepSeek API call failed. Falling back to deterministic rule-based extractor.");
            }
        }
        else
        {
            _logger.LogInformation("No DEEPSEEK_API_KEY provided. Using deterministic rule-based extraction fallback.");
        }

        // 3. Fallback: Deterministic Rule-Based Extraction
        var fallbackDto = ExtractViaRules(trimmedText);
        PostProcessDto(fallbackDto, trimmedText);
        return fallbackDto;
    }

    private async Task<ExtractedTransactionDto?> CallDeepSeekApiAsync(string apiKey, string promptText)
    {
        var systemPrompt = @"You are an expert warehouse inventory extraction assistant.
Analyze the user's natural language inventory request and extract structured transaction data.

Return ONLY a valid JSON object with the following schema:
{
  ""transactionType"": ""Receive"" or ""Dispatch"",
  ""productName"": ""<Name of product, e.g. Product A>"",
  ""supplierName"": ""<Name of supplier if provided, e.g. Supplier X, otherwise null>"",
  ""warehouseName"": ""<Name of warehouse, e.g. Binh Tan Warehouse>"",
  ""quantity"": <positive integer, e.g. 20>,
  ""unit"": ""<unit of measurement, e.g. box, kg, item>"",
  ""isAmbiguous"": <boolean, true if any required detail is missing, vague, or unclear>,
  ""clarificationMessage"": ""<clarification message explaining what is missing if isAmbiguous is true, otherwise null>""
}

Rules:
1. Transaction type must be strictly ""Receive"" or ""Dispatch"".
2. If the user request lacks essential details such as product name, target warehouse, or quantity (for example: ""Send some items to warehouse"", ""Nhập một ít hàng"", ""Move items""), set ""isAmbiguous"": true and provide a specific clarificationMessage listing what is missing.
3. For ""Receive"" transactions, extract supplierName if mentioned. For ""Dispatch"" transactions, supplierName should be null unless explicitly stated.
4. Quantity must be a positive integer > 0. If missing or non-numeric, mark ""isAmbiguous"": true.
5. Return RAW JSON only, without markdown fences (no ```json or ```).
6. Preserve the exact product name from the request, including new or unfamiliar products. Never replace it with an example product. Product existence is checked against the database by the application, not by you.";

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.deepseek.com/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = JsonContent.Create(new
        {
            model = _configuration["DeepSeek:Model"] ?? "deepseek-flash",
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = promptText }
            },
            thinking = new { type = "disabled" },
            response_format = new { type = "json_object" },
            max_tokens = 1024,
            temperature = 0
        });
        using var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        using var responseJson = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var choice = responseJson.RootElement.GetProperty("choices")[0];
        if (choice.GetProperty("finish_reason").GetString() != "stop")
            throw new InvalidOperationException("DeepSeek returned an incomplete extraction.");
        var rawResponse = choice.GetProperty("message").GetProperty("content").GetString()?.Trim();

        if (string.IsNullOrWhiteSpace(rawResponse))
        {
            return null;
        }

        // Clean markdown backticks if present
        if (rawResponse.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            rawResponse = rawResponse.Substring(7);
        }
        else if (rawResponse.StartsWith("```"))
        {
            rawResponse = rawResponse.Substring(3);
        }

        if (rawResponse.EndsWith("```"))
        {
            rawResponse = rawResponse.Substring(0, rawResponse.Length - 3);
        }

        rawResponse = rawResponse.Trim();

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        var parsed = JsonSerializer.Deserialize<ExtractedTransactionDto>(rawResponse, options);
        return parsed;
    }

    /// <summary>
    /// Deterministic rule-based parser that handles standard benchmark test cases
    /// and ambiguous input scenarios when Gemini API is unavailable or offline.
    /// </summary>
    private static void PostProcessDto(ExtractedTransactionDto dto, string originalText)
    {
        if (dto.IsAmbiguous)
        {
            if (string.IsNullOrWhiteSpace(dto.ClarificationMessage))
            {
                dto.ClarificationMessage = "Request is ambiguous. Please provide complete product name, quantity, and warehouse.";
            }
            return;
        }

        // Normalize TransactionType
        if (!string.IsNullOrWhiteSpace(dto.TransactionType))
        {
            var lower = dto.TransactionType.ToLowerInvariant();
            if (lower.Contains("receive") || lower.Contains("nhập") || lower.Contains("import"))
            {
                dto.TransactionType = "Receive";
            }
            else if (lower.Contains("dispatch") || lower.Contains("xuất") || lower.Contains("export") || lower.Contains("send"))
            {
                dto.TransactionType = "Dispatch";
            }
        }

        // Secondary sanity check for ambiguity
        if (dto.Quantity <= 0 || string.IsNullOrWhiteSpace(dto.ProductName) || string.IsNullOrWhiteSpace(dto.WarehouseName))
        {
            dto.IsAmbiguous = true;
            dto.ClarificationMessage = "Incomplete transaction parameters detected. Please specify product, valid quantity, and warehouse.";
        }
    }

    public static ExtractedTransactionDto ExtractViaRules(string text)
    {
        var dto = new ExtractedTransactionDto();
        var lower = text.ToLowerInvariant();

        // Check for ambiguous phrases in English and Vietnamese
        bool hasAmbiguousWords = lower.Contains("some items") || 
                                 lower.Contains("some goods") || 
                                 lower.Contains("một số") || 
                                 lower.Contains("vài món") ||
                                 lower.Contains("vài thứ") ||
                                 lower.Contains("ít hàng") ||
                                 lower.Contains("chút hàng");

        // Determine Transaction Type
        if (lower.Contains("receive") || lower.Contains("nhập") || lower.Contains("import") || lower.Contains("inbound"))
        {
            dto.TransactionType = "Receive";
        }
        else if (lower.Contains("dispatch") || lower.Contains("xuất") || lower.Contains("export") || lower.Contains("send") || lower.Contains("outbound"))
        {
            dto.TransactionType = "Dispatch";
        }

        // Parse Quantity and Unit
        var qtyMatch = Regex.Match(text, @"(?<![\w.,])(?<qty>[+-]?\d+(?:[.,]\d+)?)\s*(?<unit>boxes|box|kg|cartons|carton|items|item|thùng|hộp|cái|gói|cuộn|pack|roll)?\b", RegexOptions.IgnoreCase);
        if (qtyMatch.Success && int.TryParse(qtyMatch.Groups["qty"].Value, out int q))
        {
            dto.Quantity = q;
            var rawUnit = qtyMatch.Groups["unit"].Value;
            dto.Unit = NormalizeUnit(rawUnit);
        }

        // Parse Product Name
        if (lower.Contains("product a"))
        {
            dto.ProductName = "Product A";
        }
        else if (lower.Contains("product b"))
        {
            dto.ProductName = "Product B";
        }
        else if (lower.Contains("product c"))
        {
            dto.ProductName = "Product C";
        }
        else
        {
            var productMatch = Regex.Match(text, @"(?:of|mặt hàng|sản phẩm)\s+(?<product>Product\s+[A-Za-z0-9]+|[^,\.]+?)(?=\s+from|\s+into|\s+to|\s+từ|\s+vào|\s+tại|$)", RegexOptions.IgnoreCase);
            if (productMatch.Success)
            {
                var candidate = CleanEntityName(productMatch.Groups["product"].Value);
                if (!candidate.Equals("some items", StringComparison.OrdinalIgnoreCase) && !candidate.Equals("items", StringComparison.OrdinalIgnoreCase))
                {
                    dto.ProductName = candidate;
                }
            }
        }

        // Parse Supplier Name (Only for Receive or when explicitly identified)
        var supplierMatch = Regex.Match(text, @"(?:from|từ|nhà cung cấp)\s+(?<supplier>Supplier\s+[A-Za-z0-9]+|NCC\s+[A-Za-z0-9]+)(?=\s+into|\s+to|\s+vào|\s+tại|$)", RegexOptions.IgnoreCase);
        if (supplierMatch.Success)
        {
            dto.SupplierName = CleanEntityName(supplierMatch.Groups["supplier"].Value);
        }

        // Parse Warehouse Name
        if (lower.Contains("binh tan") || lower.Contains("bình tân"))
        {
            dto.WarehouseName = "Binh Tan Warehouse";
        }
        else if (lower.Contains("thu duc") || lower.Contains("thủ đức"))
        {
            dto.WarehouseName = "Thu Duc Warehouse";
        }
        else if (lower.Contains("tan binh") || lower.Contains("tân bình"))
        {
            dto.WarehouseName = "Tan Binh Warehouse";
        }
        else
        {
            // Destination warehouse (Receive)
            var destMatch = Regex.Match(text, @"(?:into|in|to|vào|tại)\s+(?<warehouse>[A-Za-z0-9\s]+?Warehouse|Kho\s+[A-Za-z0-9\s]+)", RegexOptions.IgnoreCase);
            if (destMatch.Success)
            {
                var w = CleanEntityName(destMatch.Groups["warehouse"].Value);
                if (!w.Equals("warehouse", StringComparison.OrdinalIgnoreCase))
                {
                    dto.WarehouseName = w;
                }
            }
            else if (dto.TransactionType == "Dispatch")
            {
                // Source warehouse (Dispatch)
                var srcMatch = Regex.Match(text, @"(?:from|từ)\s+(?<warehouse>[A-Za-z0-9\s]+?Warehouse|Kho\s+[A-Za-z0-9\s]+)", RegexOptions.IgnoreCase);
                if (srcMatch.Success)
                {
                    var w = CleanEntityName(srcMatch.Groups["warehouse"].Value);
                    if (!w.Equals("warehouse", StringComparison.OrdinalIgnoreCase))
                    {
                        dto.WarehouseName = w;
                    }
                }
            }
        }

        // Ambiguity Detection
        var missingFields = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.TransactionType)) missingFields.Add("transaction type (Receive / Dispatch)");
        if (string.IsNullOrWhiteSpace(dto.ProductName) || dto.ProductName.Equals("items", StringComparison.OrdinalIgnoreCase)) missingFields.Add("product name");
        if (dto.Quantity <= 0) missingFields.Add("quantity");
        if (string.IsNullOrWhiteSpace(dto.WarehouseName) || dto.WarehouseName.Equals("warehouse", StringComparison.OrdinalIgnoreCase)) missingFields.Add("warehouse name");

        if (hasAmbiguousWords || missingFields.Count > 0)
        {
            dto.IsAmbiguous = true;
            dto.ClarificationMessage = $"Request is ambiguous. Missing or unclear: {string.Join(", ", missingFields)}. Please specify the exact product, quantity, and warehouse.";
        }
        else
        {
            dto.IsAmbiguous = false;
            dto.ClarificationMessage = null;
        }

        return dto;
    }

    private static string NormalizeUnit(string rawUnit)
    {
        if (string.IsNullOrWhiteSpace(rawUnit)) return "item";
        var lower = rawUnit.Trim().ToLowerInvariant();
        if (lower.StartsWith("box")) return "box";
        if (lower == "kg" || lower == "kilogram") return "kg";
        if (lower.StartsWith("carton")) return "box";
        if (lower == "hộp" || lower == "thùng") return "box";
        if (lower == "cái") return "item";
        if (lower == "cuộn") return "roll";
        if (lower == "gói") return "pack";
        return lower;
    }

    private static string CleanEntityName(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        return raw.Trim().TrimEnd('.', ',', ';', ':');
    }
}
