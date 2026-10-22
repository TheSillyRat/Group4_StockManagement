namespace webAPI.DTOs;

/// <summary>
/// DTO for displaying confirmed transactions in React history table (R2, R3)
/// </summary>
public class TransactionHistoryDto
{
    public int TransactionId { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? SupplierName { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string? DestinationType { get; set; }
    public string? DestinationWarehouseName { get; set; }
    public string? ExternalDestination { get; set; }
    public int Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
