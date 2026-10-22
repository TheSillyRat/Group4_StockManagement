using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Entities;
using webAPI.Services;
namespace webAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(ApplicationDbContext db, IInventoryService inventory) : ControllerBase
{
    private IQueryable<ProductDto> Query(int? warehouseId = null) => db.Products.AsNoTracking()
        .Where(p => warehouseId == null || p.WarehouseStocks.Any(s => s.WarehouseId == warehouseId))
        .Select(p => new ProductDto
        {
            ProductId = p.ProductId,
            ProductName = p.ProductName,
            Unit = p.Unit,
            StockQuantity = warehouseId == null ? p.StockQuantity : p.WarehouseStocks.Where(s => s.WarehouseId == warehouseId).Sum(s => s.Quantity),
            WarehouseStocks = p.WarehouseStocks.Select(s => new WarehouseStockDto { ProductId = p.ProductId, ProductName = p.ProductName, WarehouseId = s.WarehouseId, WarehouseName = s.Warehouse.WarehouseName, Quantity = s.Quantity, Unit = p.Unit, IsUnallocated = s.Warehouse.IsUnallocated }).ToList()
        });
    [HttpGet]
    public async Task<IActionResult> GetProducts(int? warehouseId = null) => Ok(await Query(warehouseId).OrderBy(p => p.ProductId).ToListAsync());
    [HttpGet("stock")]
    public async Task<IActionResult> GetAllProductsStock(int? warehouseId = null) => Ok(await Query(warehouseId).ToListAsync());
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetProductById(int id)
    {
        var product = await Query().FirstOrDefaultAsync(p => p.ProductId == id);
        return product == null ? NotFound(new { message = "Sản phẩm không tồn tại." }) : Ok(product);
    }
    [HttpGet("{id:int}/stock")]
    public Task<IActionResult> GetProductStock(int id) => GetProductById(id);
    [HttpPost]
    public async Task<IActionResult> CreateProduct(CreateProductDto dto)
    {
        var name = dto.ProductName.Trim(); var unit = dto.Unit.Trim();
        if (name.Length == 0 || unit.Length == 0) return BadRequest(new { message = "Tên sản phẩm và đơn vị không được để trống." });
        if (await db.Products.AnyAsync(p => p.ProductName.ToLower() == name.ToLower())) return BadRequest(new { message = "Tên sản phẩm đã tồn tại." });
        ProductDto? result;
        if (dto.StockQuantity > 0)
        {
            var confirmed = await inventory.ConfirmAndSaveTransactionAsync(new() { TransactionType = "Receive", CreateNewProduct = true, ProductName = name, Unit = unit, Quantity = dto.StockQuantity, WarehouseId = dto.WarehouseId, SupplierId = dto.SupplierId });
            if (!confirmed.Success) return BadRequest(new { message = confirmed.Message });
            result = await Query().SingleAsync(p => p.ProductId == confirmed.ProductId);
        }
        else
        {
            var product = new Product { ProductName = name, Unit = unit, StockQuantity = 0 }; db.Products.Add(product); await db.SaveChangesAsync();
            result = await Query().SingleAsync(p => p.ProductId == product.ProductId);
        }
        return CreatedAtAction(nameof(GetProductById), new { id = result.ProductId }, result);
    }
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProduct(int id, UpdateProductDto dto)
    {
        var product = await db.Products.FindAsync(id);
        if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại." });
        if (dto.StockQuantity != product.StockQuantity) return BadRequest(new { message = "Không sửa trực tiếp số tồn. Hãy nhập/xuất hoặc chuyển kho để cập nhật tồn và lưu lịch sử." });
        var name = dto.ProductName.Trim(); var unit = dto.Unit.Trim();
        if (name.Length == 0 || unit.Length == 0) return BadRequest(new { message = "Tên và đơn vị không được để trống." });
        if (await db.Products.AnyAsync(p => p.ProductId != id && p.ProductName.ToLower() == name.ToLower())) return BadRequest(new { message = "Tên sản phẩm đã tồn tại." });
        if (unit != product.Unit && await db.InventoryTransactions.AnyAsync(t => t.ProductId == id)) return BadRequest(new { message = "Không đổi đơn vị của sản phẩm đã có giao dịch." });
        product.ProductName = name; product.Unit = unit; await db.SaveChangesAsync(); return Ok(await Query().SingleAsync(p => p.ProductId == id));
    }
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại." });
        if (product.StockQuantity > 0 || await db.InventoryTransactions.AnyAsync(t => t.ProductId == id)) return BadRequest(new { message = "Không thể xóa sản phẩm còn tồn hoặc đã có lịch sử giao dịch." });
        db.WarehouseStocks.RemoveRange(await db.WarehouseStocks.Where(s => s.ProductId == id).ToListAsync()); db.Products.Remove(product); await db.SaveChangesAsync(); return Ok(new { message = "Đã xóa sản phẩm." });
    }
}
