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
    /// Requirement R3 & R4 / SH-05 (Sang Huỳnh):
    /// Accepts natural-language inventory prompt, extracts structured transaction parameters,
    /// validates entities against SQL Server, and handles ambiguity.
    /// </summary>
    [HttpPost("ai-extract")]
    public async Task<ActionResult<ExtractedTransactionDto>> ExtractData([FromBody] AiInventoryRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Prompt))
        {
            return BadRequest(new { message = "Prompt cannot be empty." });
        }

        var extracted = await _geminiService.ExtractInventoryDataAsync(request.Prompt);
        var validated = await _inventoryService.ValidateExtractedDataAsync(extracted);
        return Ok(validated);
    }

    /// <summary>
    /// Requirement R3 & R5 / TA-04 (Tài):
    /// Commits confirmed inventory transaction to SQL Server with ACID transaction guarantee.
    /// Updates stock levels (increment on Receive, decrement on Dispatch).
    /// </summary>
    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmTransaction([FromBody] ConfirmTransactionRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Transaction request payload cannot be null." });
        }

        var result = await _inventoryService.ConfirmAndSaveTransactionAsync(request);
        if (!result.Success)
        {
            return BadRequest(new
            {
                message = result.Message,
                dispatchOptions = result.DispatchOptions,
                success = false
            });
        }

        return Ok(new
        {
            message = result.Message,
            transactionId = result.TransactionId,
            transactionIds = result.TransactionIds,
            productId = result.ProductId,
            newStockQuantity = result.NewStockQuantity,
            success = true
        });
    }

    [HttpGet("dispatch-options")]
    public async Task<IActionResult> DispatchOptions(int productId, int warehouseId, int quantity)
    {
        if (productId <= 0 || warehouseId <= 0 || quantity <= 0) return BadRequest(new { message = "Vui lòng chọn sản phẩm, kho và số lượng dương." });
        return Ok(await _inventoryService.GetDispatchOptionsAsync(productId, warehouseId, quantity));
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(TransferStockRequest request)
    {
        var result = await _inventoryService.TransferStockAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Requirement R3 & TA-05 (Tài):
    /// Retrieves all recorded inventory transactions sorted in descending order of creation.
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<TransactionHistoryDto>>> GetHistory()
    {
        var history = await _inventoryService.GetTransactionHistoryAsync();
        return Ok(history);
    }
}
