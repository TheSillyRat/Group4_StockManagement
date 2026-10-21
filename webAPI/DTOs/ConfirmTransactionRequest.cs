namespace webAPI.DTOs;

/// <summary>
/// DTO submitted by user after reviewing/editing the extracted form (R5)
/// </summary>
public class ConfirmTransactionRequest
{
    public string TransactionType { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public int? SupplierId { get; set; }
    public int WarehouseId { get; set; }
    public int Quantity { get; set; }
}
