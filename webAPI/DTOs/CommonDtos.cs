namespace webAPI.DTOs;

public class ProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
}

public class WarehouseDto
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
}

public class SupplierDto
{
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
}

public class ConfirmResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? TransactionId { get; set; }
    public int? NewStockQuantity { get; set; }
}
