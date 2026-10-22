using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Services;
namespace webAPI.Controllers;

[ApiController]
[Route("api/catalog")]
public class CatalogAiController(CatalogAiService ai, ApplicationDbContext db, ILogger<CatalogAiController> logger) : ControllerBase
{
    [HttpPost("ai-extract")]
    public async Task<ActionResult<AiCatalogResult>> Extract(AiCatalogRequest request, CancellationToken cancellationToken)
    {
        if (request.Messages.Any(m => string.IsNullOrWhiteSpace(m.Content)) || request.Messages.Last().Role != "user")
            return BadRequest(new { message = "Vui lòng gửi nội dung cần phân tích." });
        try {
            var result = await ai.ExtractAsync(request, cancellationToken);
            result.AlreadyExists = request.EntityType == "product"
                ? result.ProductName != null && await db.Products.AnyAsync(p => p.ProductName.ToLower() == result.ProductName.ToLower(), cancellationToken)
                : result.WarehouseName != null && await db.Warehouses.AnyAsync(w => w.WarehouseName.ToLower() == result.WarehouseName.ToLower(), cancellationToken);
            if (result.AlreadyExists) { result.IsComplete = false; result.Message = "Tên này đã có trong danh mục. Vui lòng chọn tên khác hoặc chỉnh sửa mục có sẵn."; }
            return Ok(result);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidOperationException or OperationCanceledException) {
            logger.LogWarning(ex, "Catalog AI extraction failed for {EntityType}", request.EntityType);
            return StatusCode(503, new { message = "AI chưa phân tích được yêu cầu. Bạn có thể thử lại hoặc nhập trực tiếp vào biểu mẫu." });
        }
    }
}
