namespace webAPI.DTOs;

/// <summary>
/// DTO returned after AI parses the natural language request (R4)
/// </summary>
public class ExtractedTransactionDto
{
    public string TransactionType { get; set; } = string.Empty; // "Receive" or "Dispatch"
    public string ProductName { get; set; } = string.Empty;
    public string? SupplierName { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;

    // Resolved database foreign keys when validated against SQL Server
    public int? ProductId { get; set; }
    public int? SupplierId { get; set; }
    public int? WarehouseId { get; set; }

    // Validation flags against SQL Server (R4.5)
    public bool ProductExists { get; set; }
    public bool SupplierExists { get; set; }
    public bool WarehouseExists { get; set; }
    public bool IsValid { get; set; }
    public bool ProductNotFound { get; set; }
    public bool CanCreateProduct { get; set; }
    public string? ValidationMessage { get; set; }

    // Ambiguity handling (R4.7)
    public bool IsAmbiguous { get; set; }
    public string? ClarificationMessage { get; set; }
}
