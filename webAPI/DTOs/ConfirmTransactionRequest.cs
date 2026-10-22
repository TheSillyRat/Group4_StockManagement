namespace webAPI.DTOs;

/// <summary>
/// DTO submitted by user after reviewing/editing the extracted form (R5)
/// Supports either explicit IDs or Entity Names for seamless resolution.
/// </summary>
public class ConfirmTransactionRequest
{
    public string TransactionType { get; set; } = string.Empty; // "Receive" or "Dispatch"
    public int? ProductId { get; set; }
    public string? ProductName { get; set; }
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public int? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public int Quantity { get; set; }
    public string? Unit { get; set; }
}
