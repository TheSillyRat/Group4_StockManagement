using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace webAPI.Entities;

public class InventoryTransaction
{
    [Key]
    public int TransactionId { get; set; }

    [Required]
    public int ProductId { get; set; }

    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }

    // Supplier is optional (applicable for receiving/purchasing goods)
    public int? SupplierId { get; set; }

    [ForeignKey(nameof(SupplierId))]
    public Supplier? Supplier { get; set; }

    [Required]
    public int WarehouseId { get; set; }

    [ForeignKey(nameof(WarehouseId))]
    public Warehouse? Warehouse { get; set; }
    [MaxLength(20)]
    public string? DestinationType { get; set; }
    public int? DestinationWarehouseId { get; set; }
    public Warehouse? DestinationWarehouse { get; set; }
    [MaxLength(200)]
    public string? ExternalDestination { get; set; }

    [Required]
    [MaxLength(50)]
    public string TransactionType { get; set; } = string.Empty; // e.g., "Receive", "Dispatch"

    [Required]
    public int Quantity { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
