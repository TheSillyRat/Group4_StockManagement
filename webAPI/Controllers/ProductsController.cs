using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Entities;

namespace webAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ProductsController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET: api/products
    /// Retrieve all products along with their current stock quantities.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts()
    {
        var products = await _context.Products
            .Select(p => new ProductDto
            {
                ProductId = p.ProductId,
                ProductName = p.ProductName,
                Unit = p.Unit,
                StockQuantity = p.StockQuantity
            })
            .ToListAsync();

        return Ok(products);
    }

    /// <summary>
    /// GET: api/products/stock
    /// Stock Query endpoint: Retrieve current stock quantities for all products.
    /// </summary>
    [HttpGet("stock")]
    public async Task<ActionResult<IEnumerable<ProductStockDto>>> GetAllProductsStock()
    {
        var stocks = await _context.Products
            .Select(p => new ProductStockDto
            {
                ProductId = p.ProductId,
                ProductName = p.ProductName,
                Unit = p.Unit,
                StockQuantity = p.StockQuantity
            })
            .ToListAsync();

        return Ok(stocks);
    }

    /// <summary>
    /// GET: api/products/{id}
    /// Retrieve a single product by its ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> GetProductById(int id)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound(new { message = $"Product with ID {id} was not found." });
        }

        var productDto = new ProductDto
        {
            ProductId = product.ProductId,
            ProductName = product.ProductName,
            Unit = product.Unit,
            StockQuantity = product.StockQuantity
        };

        return Ok(productDto);
    }

    /// <summary>
    /// GET: api/products/{id}/stock
    /// Stock Query endpoint: Retrieve the current stock quantity of a specific product by ID.
    /// </summary>
    [HttpGet("{id:int}/stock")]
    public async Task<ActionResult<ProductStockDto>> GetProductStock(int id)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound(new { message = $"Product with ID {id} was not found." });
        }

        var stockDto = new ProductStockDto
        {
            ProductId = product.ProductId,
            ProductName = product.ProductName,
            Unit = product.Unit,
            StockQuantity = product.StockQuantity
        };

        return Ok(stockDto);
    }

    /// <summary>
    /// POST: api/products
    /// Create a new product in the catalog.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ProductDto>> CreateProduct([FromBody] CreateProductDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Check if product name already exists
        var existingProduct = await _context.Products
            .FirstOrDefaultAsync(p => p.ProductName.ToLower() == dto.ProductName.Trim().ToLower());

        if (existingProduct != null)
        {
            return BadRequest(new { message = $"A product with the name '{dto.ProductName}' already exists." });
        }

        var product = new Product
        {
            ProductName = dto.ProductName.Trim(),
            Unit = dto.Unit.Trim(),
            StockQuantity = dto.StockQuantity
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var resultDto = new ProductDto
        {
            ProductId = product.ProductId,
            ProductName = product.ProductName,
            Unit = product.Unit,
            StockQuantity = product.StockQuantity
        };

        return CreatedAtAction(nameof(GetProductById), new { id = product.ProductId }, resultDto);
    }

    /// <summary>
    /// PUT: api/products/{id}
    /// Update an existing product's information.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> UpdateProduct(int id, [FromBody] UpdateProductDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var product = await _context.Products.FindAsync(id);
        if (product == null)
        {
            return NotFound(new { message = $"Product with ID {id} was not found." });
        }

        // Check if updating name duplicates another product
        var duplicateName = await _context.Products
            .AnyAsync(p => p.ProductId != id && p.ProductName.ToLower() == dto.ProductName.Trim().ToLower());

        if (duplicateName)
        {
            return BadRequest(new { message = $"Another product with the name '{dto.ProductName}' already exists." });
        }

        product.ProductName = dto.ProductName.Trim();
        product.Unit = dto.Unit.Trim();
        product.StockQuantity = dto.StockQuantity;

        await _context.SaveChangesAsync();

        var updatedDto = new ProductDto
        {
            ProductId = product.ProductId,
            ProductName = product.ProductName,
            Unit = product.Unit,
            StockQuantity = product.StockQuantity
        };

        return Ok(updatedDto);
    }

    /// <summary>
    /// DELETE: api/products/{id}
    /// Delete a product from the catalog.
    /// Prevents deletion if the product has associated inventory transactions.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
        {
            return NotFound(new { message = $"Product with ID {id} was not found." });
        }

        // Check referential integrity with inventory transactions
        var hasTransactions = await _context.InventoryTransactions
            .AnyAsync(t => t.ProductId == id);

        if (hasTransactions)
        {
            return BadRequest(new
            {
                message = $"Cannot delete product '{product.ProductName}' because it has existing inventory transaction records."
            });
        }

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Product '{product.ProductName}' has been successfully deleted." });
    }
}
