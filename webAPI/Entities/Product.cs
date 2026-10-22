using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace webAPI.Entities;

public class Product
{
    [Key]
    public int ProductId { get; set; }

    [Required]
    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Unit { get; set; } = string.Empty; // e.g., "box", "kg", "item"

    public int StockQuantity { get; set; } = 0;
    public ICollection<WarehouseStock> WarehouseStocks { get; set; } = new List<WarehouseStock>();

    // Navigation property
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}
