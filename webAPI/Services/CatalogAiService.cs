using System.Net.Http.Headers;
using System.Text.Json;
using webAPI.DTOs;
namespace webAPI.Services;

public class CatalogAiService(HttpClient client, IConfiguration configuration)
{
    public async Task<AiCatalogResult> ExtractAsync(AiCatalogRequest input, CancellationToken cancellationToken)
    {
        var apiKey = Environment.GetEnvironmentVariable("DEEPSEEK_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey)) apiKey = configuration["DeepSeek:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Chưa cấu hình AI.");
        var system = """
            You fill a SINGLE catalog creation form from a Vietnamese or English chat.
            Extract from the whole conversation, applying the latest corrections. Only extract the entity type specified below.
            Return ONLY JSON: {"productName":null,"unit":null,"stockQuantity":null,"warehouseName":null,"supplierName":null,"isAmbiguous":false,"message":"Vietnamese reply"}.
            For product: preserve exact product name, extract unit, non-negative integer initial stock, and supplierName/warehouseName if mentioned for an initial receipt. Never invent supplier or warehouse.
            Never confuse numbers in names (Solar Panel 400W) with stock quantity. Do not invent units.
            Product essentials are name and unit. Stock is optional: if omitted return null and use the form default zero, not an ambiguity.
            If unit is omitted return null and ask.
            If stock is negative, decimal or above 2147483647, return null, isAmbiguous=true and ask for a valid integer.
            For warehouse: extract only warehouseName, preserving the full name. Never invent unsupported fields or an address.
            Missing essential details or multiple entities: ask a brief clarification and set isAmbiguous=true.
            Retain previous values when the user supplies missing details or corrects one field.
            Unknown fields must be null. Never copy example names. Never claim anything was saved.
            """;
        var messages = new List<object> { new { role = "system", content = system + "\nEntity type: " + input.EntityType } };
        messages.AddRange(input.Messages.Select(m => (object)new { role = m.Role, content = m.Content }));
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.deepseek.com/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = JsonContent.Create(new {
            model = configuration["DeepSeek:Model"] ?? "deepseek-flash", messages,
            thinking = new { type = "disabled" }, response_format = new { type = "json_object" }, temperature = 0, max_tokens = 700
        });
        using var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        var choice = body.RootElement.GetProperty("choices")[0];
        if (choice.GetProperty("finish_reason").GetString() != "stop") throw new JsonException("Incomplete AI response.");
        var result = JsonSerializer.Deserialize<AiCatalogResult>(choice.GetProperty("message").GetProperty("content").GetString()!,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? throw new JsonException("Empty AI response.");
        result.ProductName = result.ProductName?.Trim(); result.Unit = result.Unit?.Trim(); result.WarehouseName = result.WarehouseName?.Trim();
        result.AlreadyExists = false;
        var missing = new List<string>();
        if (input.EntityType == "product") {
            if (string.IsNullOrWhiteSpace(result.ProductName) || result.ProductName.Length > 200) { result.ProductName = null; missing.Add("tên sản phẩm (tối đa 200 ký tự)"); }
            if (string.IsNullOrWhiteSpace(result.Unit) || result.Unit.Length > 50) { result.Unit = null; missing.Add("đơn vị tính (tối đa 50 ký tự)"); }
            if (result.StockQuantity < 0) { result.StockQuantity = null; missing.Add("số lượng tồn ban đầu là số nguyên không âm"); result.IsAmbiguous = true; }
        } else {
            result.ProductName = result.Unit = result.SupplierName = null; result.StockQuantity = null;
            if (string.IsNullOrWhiteSpace(result.WarehouseName) || result.WarehouseName.Length > 200) { result.WarehouseName = null; missing.Add("tên kho hàng (tối đa 200 ký tự)"); }
        }
        result.IsComplete = missing.Count == 0 && !result.IsAmbiguous;
        if (result.IsComplete)
            result.Message = input.EntityType == "product"
                ? $"Đã điền sản phẩm: {result.ProductName}; đơn vị: {result.Unit}; tồn ban đầu: {result.StockQuantity ?? 0}. Kiểm tra biểu mẫu và bấm Tạo sản phẩm để lưu."
                : $"Đã điền tên kho: {result.WarehouseName}. Kiểm tra biểu mẫu và bấm Lưu kho hàng để lưu.";
        else if (missing.Count > 0) result.Message = $"Vui lòng bổ sung {string.Join(", ", missing)}. Các thông tin đã nhận được vẫn được điền vào biểu mẫu.";
        else if (string.IsNullOrWhiteSpace(result.Message)) result.Message = "Vui lòng mô tả rõ một mục cần thêm để tôi điền thông tin chính xác.";
        return result;
    }
}
