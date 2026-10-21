using Microsoft.AspNetCore.Mvc;
using webAPI.DTOs;
using webAPI.Services;

namespace webAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IGeminiService _geminiService;
    private readonly IInventoryService _inventoryService;

    public InventoryController(IGeminiService geminiService, IInventoryService inventoryService)
    {
        _geminiService = geminiService;
        _inventoryService = inventoryService;
    }

    /// <summary>
    /// R3 & R4: Submit natural-language inventory requests for AI processing
    /// </summary>
    [HttpPost("ai-extract")]
    public async Task<ActionResult<ExtractedTransactionDto>> ExtractData([FromBody] AiInventoryRequest request)
    {
        // TODO [Member 3 / AI Engineer]: Call Gemini service and validate against DB
        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            return BadRequest(new { message = "Prompt cannot be empty" });
        }

        var extracted = await _geminiService.ExtractInventoryDataAsync(request.Prompt);
        var validated = await _inventoryService.ValidateExtractedDataAsync(extracted);
        return Ok(validated);
    }

    /// <summary>
    /// R3 & R5: Confirm and save inventory transaction to SQL Server
    /// </summary>
    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmTransaction([FromBody] ConfirmTransactionRequest request)
    {
        // TODO [Member 2 / Backend Dev]: Execute database transaction & update stock
        var success = await _inventoryService.ConfirmAndSaveTransactionAsync(request);
        if (!success)
        {
            return BadRequest(new { message = "Failed to confirm transaction. Invalid references or insufficient stock." });
        }

        return Ok(new { message = "Transaction confirmed successfully." });
    }

    /// <summary>
    /// R3: Retrieve transaction history
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<TransactionHistoryDto>>> GetHistory()
    {
        // TODO [Member 2 / Backend Dev]: Return history of transactions
        var history = await _inventoryService.GetTransactionHistoryAsync();
        return Ok(history);
    }
}
