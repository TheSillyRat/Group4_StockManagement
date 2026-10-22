using System.ComponentModel.DataAnnotations;

namespace webAPI.Entities;

public class Warehouse
{
    [Key]
    public int WarehouseId { get; set; }

    [Required]
    [MaxLength(200)]
    public string WarehouseName { get; set; } = string.Empty;
    public bool IsUnallocated { get; set; }
    public ICollection<WarehouseStock> WarehouseStocks { get; set; } = new List<WarehouseStock>();

    // Navigation property
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}
