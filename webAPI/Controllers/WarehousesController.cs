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
                TransactionCount = w.InventoryTransactions.Count()
            })
            .ToListAsync();

        return Ok(warehouses);
    }

    /// <summary>
    /// R3: Create a new warehouse
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<WarehouseDto>> CreateWarehouse([FromBody] WarehouseDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.WarehouseName))
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
        if (dto == null || string.IsNullOrWhiteSpace(dto.WarehouseName))
        {
            return BadRequest(new { message = "Warehouse name cannot be empty." });
        }

        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null)
        {
            return NotFound(new { message = $"Warehouse #{id} not found." });
        }

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

        var hasTransactions = await _context.InventoryTransactions.AnyAsync(t => t.WarehouseId == id);
        if (hasTransactions)
        {
            return BadRequest(new { message = $"Cannot delete warehouse '{warehouse.WarehouseName}' because it has linked transactions." });
        }

        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Warehouse '{warehouse.WarehouseName}' successfully deleted." });
    }
}
