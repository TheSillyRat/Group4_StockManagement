using System.ComponentModel.DataAnnotations;
namespace webAPI.DTOs;

public class WarehouseStockDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public bool IsUnallocated { get; set; }
}
public class DispatchAllocation
{
    public int WarehouseId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
}
public class DispatchOptionsDto
{
    public int? DestinationWarehouseId { get; set; }
    public int ProductId { get; set; }
    public int WarehouseId { get; set; }
    public int RequestedQuantity { get; set; }
    public int AvailableQuantity { get; set; }
    public int ShortageQuantity { get; set; }
    public bool CanFulfill { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<WarehouseStockDto> Alternatives { get; set; } = new();
    public List<DispatchAllocation> SuggestedAllocations { get; set; } = new();
}
public class TransferStockRequest
{
    public int ProductId { get; set; }
    public int FromWarehouseId { get; set; }
    public int ToWarehouseId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
}
