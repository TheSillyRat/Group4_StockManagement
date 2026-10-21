using System.ComponentModel.DataAnnotations;

namespace webAPI.Entities;

public class Supplier
{
    [Key]
    public int SupplierId { get; set; }

    [Required]
    [MaxLength(200)]
    public string SupplierName { get; set; } = string.Empty;

    // Navigation property
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
}
