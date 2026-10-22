using System.ComponentModel.DataAnnotations;

namespace webAPI.DTOs;

public class ProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
}

public class ProductStockDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
}

public class CreateProductDto
{
    [Required(ErrorMessage = "Product name is required.")]
    [MaxLength(200, ErrorMessage = "Product name cannot exceed 200 characters.")]
    public string ProductName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Unit is required.")]
    [MaxLength(50, ErrorMessage = "Unit cannot exceed 50 characters.")]
    public string Unit { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Initial stock quantity must be non-negative.")]
    public int StockQuantity { get; set; } = 0;
}

public class UpdateProductDto
{
    [Required(ErrorMessage = "Product name is required.")]
    [MaxLength(200, ErrorMessage = "Product name cannot exceed 200 characters.")]
    public string ProductName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Unit is required.")]
    [MaxLength(50, ErrorMessage = "Unit cannot exceed 50 characters.")]
    public string Unit { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Stock quantity must be non-negative.")]
    public int StockQuantity { get; set; }
}

public class WarehouseDto
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
}

public class CreateWarehouseDto
{
    [Required(ErrorMessage = "Warehouse name is required.")]
    [MaxLength(200, ErrorMessage = "Warehouse name cannot exceed 200 characters.")]
    public string WarehouseName { get; set; } = string.Empty;
}

public class UpdateWarehouseDto
{
    [Required(ErrorMessage = "Warehouse name is required.")]
    [MaxLength(200, ErrorMessage = "Warehouse name cannot exceed 200 characters.")]
    public string WarehouseName { get; set; } = string.Empty;
}

public class SupplierDto
{
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
}

public class CreateSupplierDto
{
    [Required(ErrorMessage = "Supplier name is required.")]
    [MaxLength(200, ErrorMessage = "Supplier name cannot exceed 200 characters.")]
    public string SupplierName { get; set; } = string.Empty;
}

public class UpdateSupplierDto
{
    [Required(ErrorMessage = "Supplier name is required.")]
    [MaxLength(200, ErrorMessage = "Supplier name cannot exceed 200 characters.")]
    public string SupplierName { get; set; } = string.Empty;
}

public class ConfirmResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? TransactionId { get; set; }
    public int? NewStockQuantity { get; set; }
}
