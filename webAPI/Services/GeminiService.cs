using Mscc.GenerativeAI;
using webAPI.DTOs;

namespace webAPI.Services;

/// <summary>
/// Implementation of Gemini AI Service (R4)
/// Member assigned to R4 will implement the prompt engineering and JSON extraction here.
/// </summary>
public class GeminiService : IGeminiService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(IConfiguration configuration, ILogger<GeminiService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ExtractedTransactionDto> ExtractInventoryDataAsync(string naturalLanguageText)
    {
        // TODO [Member 3 / AI Engineer]: 
        // 1. Retrieve GEMINI_API_KEY securely from environment variable or appsettings.json:
        //    var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") 
        //                 ?? _configuration["Gemini:ApiKey"];
        // 2. Initialize GoogleAI instance:
        //    var googleAi = new GoogleAI(apiKey);
        //    var model = googleAi.GenerativeModel(Model.Gemini15Flash);
        // 3. Craft dynamic prompt instructing Gemini to return JSON with:
        //    - transactionType (Receive / Dispatch)
        //    - productName
        //    - supplierName (if applicable)
        //    - warehouseName
        //    - quantity and unit
        //    - isAmbiguous and clarificationMessage (if required fields are missing)
        // 4. Parse the JSON response into ExtractedTransactionDto.

        await Task.CompletedTask;
        return new ExtractedTransactionDto
        {
            TransactionType = "Receive",
            ProductName = "Product A",
            SupplierName = "Supplier X",
            WarehouseName = "Binh Tan Warehouse",
            Quantity = 20,
            Unit = "box",
            IsAmbiguous = false
        };
    }
}
