using System.ComponentModel.DataAnnotations;
namespace webAPI.DTOs;

public class AiCatalogRequest
{
    [Required, RegularExpression("^(product|warehouse)$")]
    public string EntityType { get; set; } = string.Empty;
    [Required, MinLength(1), MaxLength(12)]
    public List<CatalogChatMessage> Messages { get; set; } = new();
}
public class CatalogChatMessage
{
    [Required, RegularExpression("^(user|assistant)$")]
    public string Role { get; set; } = string.Empty;
    [Required, StringLength(4000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}
public class AiCatalogResult
{
    public string? ProductName { get; set; }
    public string? Unit { get; set; }
    public int? StockQuantity { get; set; }
    public string? WarehouseName { get; set; }
    public string? SupplierName { get; set; }
    public bool IsAmbiguous { get; set; }
    public bool IsComplete { get; set; }
    public bool AlreadyExists { get; set; }
    public string Message { get; set; } = string.Empty;
}
