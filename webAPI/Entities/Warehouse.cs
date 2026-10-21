using System.ComponentModel.DataAnnotations;

namespace webAPI.Entities;

public class Warehouse
{
    [Key]
    public int WarehouseId { get; set; }

    [Required]
    [MaxLength(200)]
    public string WarehouseName { get; set; } = string.Empty;

    // Navigation property
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}
