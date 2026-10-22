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

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Supplier '{supplier.SupplierName}' has been successfully deleted." });
    }
}
