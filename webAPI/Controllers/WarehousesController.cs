using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Entities;

namespace webAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WarehousesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public WarehousesController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// R3: Retrieve available warehouses with transaction usage counts
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WarehouseDto>>> GetWarehouses()
    {
        var warehouses = await _context.Warehouses
            .AsNoTracking()
            .Select(w => new WarehouseDto
            {
                WarehouseId = w.WarehouseId,
                WarehouseName = w.WarehouseName,
                IsUnallocated = w.IsUnallocated,
                ProductCount = w.WarehouseStocks.Count(s => s.Quantity > 0),
                TransactionCount = w.InventoryTransactions.Count()
            })
            .ToListAsync();

        return Ok(warehouses);
    }

    [HttpGet("{id:int}/stock")]
    public async Task<IActionResult> GetStock(int id)
    {
        if (!await _context.Warehouses.AnyAsync(w => w.WarehouseId == id)) return NotFound(new { message = "Kho không tồn tại." });
        return Ok(await _context.WarehouseStocks.AsNoTracking().Where(s => s.WarehouseId == id)
            .Select(s => new WarehouseStockDto { ProductId = s.ProductId, ProductName = s.Product.ProductName, WarehouseId = s.WarehouseId, WarehouseName = s.Warehouse.WarehouseName, Quantity = s.Quantity, Unit = s.Product.Unit, IsUnallocated = s.Warehouse.IsUnallocated })
            .OrderBy(s => s.ProductName).ToListAsync());
    }

    /// <summary>
    /// R3: Create a new warehouse
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<WarehouseDto>> CreateWarehouse([FromBody] WarehouseDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.WarehouseName) || dto.WarehouseName.Length > 200)
        {
            return BadRequest(new { message = "Warehouse name cannot be empty." });
        }

        var normalizedName = dto.WarehouseName.Trim();
        var exists = await _context.Warehouses.AnyAsync(w => w.WarehouseName.ToLower() == normalizedName.ToLower());
        if (exists)
        {
            return BadRequest(new { message = $"Warehouse '{normalizedName}' already exists." });
        }

        var warehouse = new Warehouse
        {
            WarehouseName = normalizedName
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        var result = new WarehouseDto
        {
            WarehouseId = warehouse.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            TransactionCount = 0
        };

        return CreatedAtAction(nameof(GetWarehouses), new { id = result.WarehouseId }, result);
    }

    /// <summary>
    /// Update existing warehouse name
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateWarehouse(int id, [FromBody] WarehouseDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.WarehouseName) || dto.WarehouseName.Length > 200)
        {
            return BadRequest(new { message = "Warehouse name cannot be empty." });
        }

        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null)
        {
            return NotFound(new { message = $"Warehouse #{id} not found." });
        }

        if (warehouse.IsUnallocated) return BadRequest(new { message = "Không thể đổi tên kho chờ phân bổ của hệ thống." });
        var normalizedName = dto.WarehouseName.Trim();
        var isDuplicate = await _context.Warehouses
            .AnyAsync(w => w.WarehouseId != id && w.WarehouseName.ToLower() == normalizedName.ToLower());
        if (isDuplicate)
        {
            return BadRequest(new { message = $"Another warehouse named '{normalizedName}' already exists." });
        }

        warehouse.WarehouseName = normalizedName;
        await _context.SaveChangesAsync();

        return Ok(new WarehouseDto
        {
            WarehouseId = warehouse.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            TransactionCount = await _context.InventoryTransactions.CountAsync(t => t.WarehouseId == id)
        });
    }

    /// <summary>
    /// Delete warehouse if not linked to any transactions
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteWarehouse(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null)
        {
            return NotFound(new { message = $"Warehouse #{id} not found." });
        }

        if (warehouse.IsUnallocated || await _context.WarehouseStocks.AnyAsync(s => s.WarehouseId == id && s.Quantity > 0))
            return BadRequest(new { message = "Không thể xóa kho hệ thống hoặc kho vẫn còn hàng." });
        var hasTransactions = await _context.InventoryTransactions.AnyAsync(t => t.WarehouseId == id || t.DestinationWarehouseId == id);
        if (hasTransactions)
        {
            return BadRequest(new { message = $"Cannot delete warehouse '{warehouse.WarehouseName}' because it has linked transactions." });
        }

        _context.Warehouses.Remove(warehouse);
        _context.WarehouseStocks.RemoveRange(await _context.WarehouseStocks.Where(s => s.WarehouseId == id).ToListAsync());
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Warehouse '{warehouse.WarehouseName}' successfully deleted." });
    }
}
