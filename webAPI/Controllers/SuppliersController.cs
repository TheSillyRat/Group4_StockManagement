using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;

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
    /// R3: Retrieve suppliers
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupplierDto>>> GetSuppliers()
    {
        // TODO [Member 1 / API Dev]: Retrieve list of suppliers
        var suppliers = await _context.Suppliers
            .Select(s => new SupplierDto
            {
                SupplierId = s.SupplierId,
                SupplierName = s.SupplierName
            })
            .ToListAsync();

        return Ok(suppliers);
    }
}
