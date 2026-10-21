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
    /// R3: Retrieve available warehouses
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WarehouseDto>>> GetWarehouses()
    {
        // TODO [Member 1 / API Dev]: Retrieve list of warehouses
        var warehouses = await _context.Warehouses
            .Select(w => new WarehouseDto
            {
                WarehouseId = w.WarehouseId,
                WarehouseName = w.WarehouseName
            })
            .ToListAsync();

        return Ok(warehouses);
    }
}
