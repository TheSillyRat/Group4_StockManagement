using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Entities;

namespace webAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SuppliersController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET: api/suppliers
    /// Retrieve all registered suppliers.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupplierDto>>> GetSuppliers()
    {
        var suppliers = await _context.Suppliers
            .Select(s => new SupplierDto
            {
                SupplierId = s.SupplierId,
                SupplierName = s.SupplierName
            })
            .ToListAsync();

        return Ok(suppliers);
    }

    /// <summary>
    /// GET: api/suppliers/{id}
    /// Retrieve a single supplier by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<SupplierDto>> GetSupplierById(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);

        if (supplier == null)
        {
            return NotFound(new { message = $"Supplier with ID {id} was not found." });
        }

        var supplierDto = new SupplierDto
        {
            SupplierId = supplier.SupplierId,
            SupplierName = supplier.SupplierName
        };

        return Ok(supplierDto);
    }

    /// <summary>
    /// POST: api/suppliers
    /// Create a new supplier.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SupplierDto>> CreateSupplier([FromBody] CreateSupplierDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var existingSupplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.SupplierName.ToLower() == dto.SupplierName.Trim().ToLower());

        if (existingSupplier != null)
        {
            return BadRequest(new { message = $"A supplier with the name '{dto.SupplierName}' already exists." });
        }

        var supplier = new Supplier
        {
            SupplierName = dto.SupplierName.Trim()
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        var resultDto = new SupplierDto
        {
            SupplierId = supplier.SupplierId,
            SupplierName = supplier.SupplierName
        };

        return CreatedAtAction(nameof(GetSupplierById), new { id = supplier.SupplierId }, resultDto);
    }

    /// <summary>
    /// DELETE: api/suppliers/{id}
    /// Delete a supplier.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSupplier(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null)
        {
            return NotFound(new { message = $"Supplier with ID {id} was not found." });
        }

        if (await _context.InventoryTransactions.AnyAsync(t => t.SupplierId == id))
            return BadRequest(new { message = "Không thể xóa nhà cung cấp đã có giao dịch nhập kho." });
        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Supplier '{supplier.SupplierName}' has been successfully deleted." });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateSupplier(int id, UpdateSupplierDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SupplierName)) return BadRequest(new { message = "Tên nhà cung cấp không được để trống." });
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return NotFound(new { message = "Nhà cung cấp không tồn tại." });
        var name = dto.SupplierName.Trim();
        if (await _context.Suppliers.AnyAsync(s => s.SupplierId != id && s.SupplierName.ToLower() == name.ToLower())) return BadRequest(new { message = "Tên nhà cung cấp đã tồn tại." });
        supplier.SupplierName = name; await _context.SaveChangesAsync();
        return Ok(new SupplierDto { SupplierId = id, SupplierName = name });
    }
}
