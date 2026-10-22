using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Entities;
namespace webAPI.Services;

public class InventoryService(ApplicationDbContext context, ILogger<InventoryService> logger) : IInventoryService
{
    private static ConfirmResult Failure(string message) => new() { Success = false, Message = message };

    public async Task<DispatchOptionsDto> GetDispatchOptionsAsync(int productId, int warehouseId, int quantity, int? destinationWarehouseId = null)
    {
        var stocks = await context.WarehouseStocks.AsNoTracking()
            .Where(s => s.ProductId == productId && !s.Warehouse.IsUnallocated && s.Quantity > 0 && s.WarehouseId != destinationWarehouseId)
            .Select(s => new WarehouseStockDto { ProductId = s.ProductId, ProductName = s.Product.ProductName, WarehouseId = s.WarehouseId, WarehouseName = s.Warehouse.WarehouseName, Quantity = s.Quantity, Unit = s.Product.Unit })
            .OrderByDescending(s => s.Quantity).ThenBy(s => s.WarehouseId).ToListAsync();
        var available = stocks.FirstOrDefault(s => s.WarehouseId == warehouseId)?.Quantity ?? 0;
        var result = new DispatchOptionsDto
        {
            ProductId = productId,
            DestinationWarehouseId = destinationWarehouseId,
            WarehouseId = warehouseId,
            RequestedQuantity = quantity,
            AvailableQuantity = available,
            ShortageQuantity = Math.Max(0, quantity - available),
            Alternatives = stocks.Where(s => s.WarehouseId != warehouseId).ToList()
        };
        var eligible = stocks.OrderBy(s => s.WarehouseId == warehouseId ? 0 : 1).ThenByDescending(s => s.Quantity).ThenBy(s => s.WarehouseId).Take(20).ToList();
        result.CanFulfill = quantity > 0 && eligible.Sum(s => (long)s.Quantity) >= quantity;
        var remaining = Math.Max(0, quantity);
        foreach (var stock in eligible)
        {
            if (remaining == 0) break;
            var take = Math.Min(remaining, stock.Quantity);
            result.SuggestedAllocations.Add(new() { WarehouseId = stock.WarehouseId, Quantity = take });
            remaining -= take;
        }
        result.Message = quantity <= 0 ? "Vui lòng nhập số lượng xuất lớn hơn 0."
            : result.ShortageQuantity == 0 ? "Kho đã chọn đủ hàng để xuất."
            : $"Kho đã chọn chỉ có {available}, thiếu {result.ShortageQuantity}. " +
                (result.CanFulfill ? "Các kho khác còn hàng. Bạn có muốn tạo thêm đơn xuất từ các kho này không?" : "Tổng tồn ở các kho có thể xuất cũng chưa đủ. Vui lòng giảm số lượng hoặc nhập thêm hàng.");
        return result;
    }

    public async Task<ExtractedTransactionDto> ValidateExtractedDataAsync(ExtractedTransactionDto dto)
    {
        dto.ProductId = dto.WarehouseId = dto.SupplierId = null;
        dto.ProductExists = dto.WarehouseExists = dto.SupplierExists = false;
        dto.ProductNotFound = dto.CanCreateProduct = false;
        dto.DispatchOptions = null; dto.ValidationMessage = null;
        dto.DestinationWarehouseId = null;
        var messages = new List<string>();
        var receive = string.Equals(dto.TransactionType, "Receive", StringComparison.OrdinalIgnoreCase);
        var dispatch = string.Equals(dto.TransactionType, "Dispatch", StringComparison.OrdinalIgnoreCase);
        var destinationValid = !dispatch;
        if (dispatch)
        {
            if (string.Equals(dto.DestinationType, "Warehouse", StringComparison.OrdinalIgnoreCase))
            {
                dto.DestinationType = "Warehouse"; dto.ExternalDestination = null;
                var targetName = dto.DestinationWarehouseName?.Trim().ToLower();
                var target = string.IsNullOrWhiteSpace(targetName) ? null : await context.Warehouses.AsNoTracking().FirstOrDefaultAsync(w=>!w.IsUnallocated && w.WarehouseName.ToLower()==targetName);
                if(target != null) { dto.DestinationWarehouseId=target.WarehouseId; destinationValid=true; }
                else messages.Add("Kho nhận không tồn tại. Vui lòng chọn một kho hiện có.");
            }
            else if (string.Equals(dto.DestinationType, "External", StringComparison.OrdinalIgnoreCase))
            {
                dto.DestinationType="External"; dto.DestinationWarehouseName=null;
                dto.ExternalDestination=dto.ExternalDestination?.Trim(); destinationValid=(dto.ExternalDestination?.Length??0)<=200;
            }
            else { dto.DestinationType=null; messages.Add("Bạn muốn xuất đến kho nào hay xuất hàng ra ngoài? Vui lòng chọn nơi đến."); }
        }
        else { dto.DestinationType=null;dto.DestinationWarehouseName=null;dto.ExternalDestination=null; }
        var productName = dto.ProductName?.Trim().ToLower();
        var product = string.IsNullOrWhiteSpace(productName) ? null : await context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.ProductName.ToLower() == productName);
        if (product != null) { dto.ProductExists = true; dto.ProductId = product.ProductId; if (string.IsNullOrWhiteSpace(dto.Unit)) dto.Unit = product.Unit; }
        else if (!string.IsNullOrWhiteSpace(productName))
        {
            dto.ProductNotFound = true; dto.CanCreateProduct = receive;
            messages.Add(receive ? $"Sản phẩm '{dto.ProductName}' chưa tồn tại. Bạn có muốn tạo sản phẩm mới và nhập kho không?" : $"Sản phẩm '{dto.ProductName}' không tồn tại. Không thể xuất kho sản phẩm này.");
        }
        var warehouseName = dto.WarehouseName?.Trim().ToLower();
        var warehouse = string.IsNullOrWhiteSpace(warehouseName) ? null : await context.Warehouses.AsNoTracking().FirstOrDefaultAsync(w => w.WarehouseName.ToLower() == warehouseName && !w.IsUnallocated);
        if (warehouse != null) { dto.WarehouseExists = true; dto.WarehouseId = warehouse.WarehouseId; }
        else messages.Add("Vui lòng chọn kho nhập/ xuất hợp lệ.");
        if(dispatch && dto.DestinationWarehouseId.HasValue && dto.DestinationWarehouseId==dto.WarehouseId) {destinationValid=false;messages.Add("Kho nhận phải khác kho xuất.");}
        if (receive)
        {
            var supplierName = dto.SupplierName?.Trim().ToLower();
            var supplier = string.IsNullOrWhiteSpace(supplierName) ? null : await context.Suppliers.AsNoTracking().FirstOrDefaultAsync(s => s.SupplierName.ToLower() == supplierName);
            if (supplier != null) { dto.SupplierId = supplier.SupplierId; dto.SupplierExists = true; }
            else messages.Add("Nhập kho phải có nhà cung cấp. Vui lòng chọn hoặc thêm nhà cung cấp.");
        }
        else { dto.SupplierName = null; dto.SupplierId = null; dto.SupplierExists = dispatch; }
        var unitMatches = product == null || string.Equals(dto.Unit?.Trim(), product.Unit, StringComparison.OrdinalIgnoreCase);
        if (!unitMatches) messages.Add($"Đơn vị tính phải là '{product!.Unit}'.");
        if (dispatch && product != null && warehouse != null && dto.Quantity > 0)
        {
            dto.DispatchOptions = await GetDispatchOptionsAsync(product.ProductId, warehouse.WarehouseId, dto.Quantity,dto.DestinationWarehouseId);
            if (dto.DispatchOptions.ShortageQuantity > 0) messages.Add(dto.DispatchOptions.Message);
        }
        dto.IsValid = !dto.IsAmbiguous && destinationValid && (receive || dispatch) && dto.ProductExists && dto.WarehouseExists && dto.SupplierExists && unitMatches && dto.Quantity > 0 && (dto.DispatchOptions?.ShortageQuantity ?? 0) == 0;
        dto.ValidationMessage = messages.Count > 0 ? string.Join(" ", messages) : null;
        return dto;
    }

    public async Task<ConfirmResult> ConfirmAndSaveTransactionAsync(ConfirmTransactionRequest request)
    {
        if (request.Quantity <= 0) return Failure("Số lượng giao dịch phải là số nguyên lớn hơn 0.");
        var receive = string.Equals(request.TransactionType?.Trim(), "Receive", StringComparison.OrdinalIgnoreCase);
        var dispatch = string.Equals(request.TransactionType?.Trim(), "Dispatch", StringComparison.OrdinalIgnoreCase);
        if (!receive && !dispatch) return Failure("Loại giao dịch chỉ được là Receive hoặc Dispatch.");
        if (request.CreateNewProduct && !receive) return Failure("Không thể tạo sản phẩm mới khi xuất kho.");
        if (request.CreateNewProduct && (request.ProductId.HasValue || string.IsNullOrWhiteSpace(request.ProductName) || request.ProductName.Trim().Length > 200 || string.IsNullOrWhiteSpace(request.Unit) || request.Unit.Trim().Length > 50))
            return Failure("Cần tên sản phẩm mới (tối đa 200 ký tự), đơn vị (tối đa 50 ký tự), và không gửi mã sản phẩm có sẵn.");
        var name = request.ProductName?.Trim().ToLower();
        var product = request.ProductId.HasValue ? await context.Products.FindAsync(request.ProductId.Value)
            : string.IsNullOrWhiteSpace(name) ? null : await context.Products.FirstOrDefaultAsync(p => p.ProductName.ToLower() == name);
        if (request.CreateNewProduct && product != null) return Failure("Sản phẩm đã tồn tại. Vui lòng làm mới và chọn sản phẩm có sẵn.");
        var createProduct = product == null && request.CreateNewProduct;
        if (product == null && !createProduct) return Failure(receive ? "Sản phẩm không tồn tại. Vui lòng xác nhận tạo sản phẩm mới trước khi nhập kho." : "Sản phẩm không tồn tại. Không thể xuất kho.");
        if (product != null && !string.IsNullOrWhiteSpace(request.Unit) && !string.Equals(product.Unit, request.Unit.Trim(), StringComparison.OrdinalIgnoreCase)) return Failure($"Đơn vị phải là '{product.Unit}'.");
        var warehouseName = request.WarehouseName?.Trim().ToLower();
        var warehouse = request.WarehouseId.HasValue ? await context.Warehouses.FindAsync(request.WarehouseId.Value)
            : string.IsNullOrWhiteSpace(warehouseName) ? null : await context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseName.ToLower() == warehouseName);
        if (warehouse == null || warehouse.IsUnallocated) return Failure("Vui lòng chọn kho thực tế để nhập/xuất. Tồn chờ phân bổ cần được phân bổ vào kho trước.");
        var internalTransfer=dispatch && string.Equals(request.DestinationType,"Warehouse",StringComparison.OrdinalIgnoreCase);
        var externalDispatch=dispatch && string.Equals(request.DestinationType,"External",StringComparison.OrdinalIgnoreCase);
        Warehouse? destination=null;
        if(dispatch)
        {
            if(!internalTransfer && !externalDispatch) return Failure("Vui lòng chọn nơi đến: một kho hiện có hoặc xuất hàng ra ngoài.");
            if(internalTransfer)
            {
                destination=request.DestinationWarehouseId.HasValue ? await context.Warehouses.FindAsync(request.DestinationWarehouseId.Value) : null;
                if(destination==null || destination.IsUnallocated || destination.WarehouseId==warehouse.WarehouseId) return Failure("Kho nhận phải tồn tại, là kho thực tế và khác kho xuất.");
            }
            else if(request.DestinationWarehouseId.HasValue || (request.ExternalDestination?.Trim().Length??0)>200)
                return Failure("Xuất ra ngoài không kèm kho nhận; tên/địa điểm nhận tối đa 200 ký tự.");
        }
        Supplier? supplier = null;
        if (receive)
        {
            var supplierName = request.SupplierName?.Trim().ToLower();
            supplier = request.SupplierId.HasValue ? await context.Suppliers.FindAsync(request.SupplierId.Value)
                : string.IsNullOrWhiteSpace(supplierName) ? null : await context.Suppliers.FirstOrDefaultAsync(s => s.SupplierName.ToLower() == supplierName);
            if (supplier == null) return Failure("Nhập kho phải có nhà cung cấp hợp lệ. Vui lòng chọn hoặc thêm nhà cung cấp.");
            if (request.DispatchAllocations?.Count > 0 || request.ConfirmAdditionalDispatches) return Failure("Nhập kho không được kèm kế hoạch xuất nhiều kho.");
        }
        var allocations = request.DispatchAllocations is { Count: > 0 } ? request.DispatchAllocations : new List<DispatchAllocation> { new() { WarehouseId = warehouse.WarehouseId, Quantity = request.Quantity } };
        if (dispatch)
        {
            if (allocations.Count > 20 || allocations.Any(a => a == null || a.Quantity <= 0) || allocations.Select(a => a.WarehouseId).Distinct().Count() != allocations.Count || allocations.Sum(a => (long)a.Quantity) != request.Quantity)
                return Failure("Các đơn xuất phải có kho riêng, số lượng dương và tổng đúng số lượng yêu cầu (tối đa 20 kho).");
            if ((allocations.Count > 1 || allocations[0].WarehouseId != warehouse.WarehouseId) && !request.ConfirmAdditionalDispatches)
                return Failure("Bạn cần đồng ý tạo thêm đơn xuất từ các kho khác trước khi xác nhận.");
            var ids = allocations.Select(a => a.WarehouseId).ToList();
            if(internalTransfer && ids.Contains(destination!.WarehouseId)) return Failure("Kho nhận không được đồng thời là kho nguồn trong kế hoạch xuất.");
            if (await context.Warehouses.CountAsync(w => ids.Contains(w.WarehouseId) && !w.IsUnallocated) != ids.Count) return Failure("Kế hoạch xuất chứa kho không hợp lệ.");
            if (!request.ConfirmAdditionalDispatches)
            {
                var options = await GetDispatchOptionsAsync(product!.ProductId, warehouse.WarehouseId, request.Quantity,destination?.WarehouseId);
                if (options.ShortageQuantity > 0) return new() { Success = false, Message = options.Message, DispatchOptions = options };
            }
        }
        using var transaction = await context.Database.BeginTransactionAsync(createProduct ? System.Data.IsolationLevel.Serializable : System.Data.IsolationLevel.ReadCommitted);
        try
        {
            if (createProduct)
            {
                if (await context.Products.AnyAsync(p => p.ProductName.ToLower() == name)) { await transaction.RollbackAsync(); return Failure("Sản phẩm vừa được tạo. Vui lòng làm mới danh mục."); }
                product = new Product { ProductName = request.ProductName!.Trim(), Unit = request.Unit!.Trim(), StockQuantity = 0 };
                context.Products.Add(product); await context.SaveChangesAsync();
            }
            // Every stock mutation locks the product first, then warehouse rows in ID order.
            var productQuery = context.Products.Where(p => p.ProductId == product!.ProductId);
            var affected = receive
                ? await productQuery.Where(p => p.StockQuantity <= int.MaxValue - request.Quantity).ExecuteUpdateAsync(u => u.SetProperty(p => p.StockQuantity, p => p.StockQuantity + request.Quantity))
                : internalTransfer
                    ? await productQuery.Where(p=>p.StockQuantity>=request.Quantity).ExecuteUpdateAsync(u=>u.SetProperty(p=>p.StockQuantity,p=>p.StockQuantity))
                    : await productQuery.Where(p => p.StockQuantity >= request.Quantity).ExecuteUpdateAsync(u => u.SetProperty(p => p.StockQuantity, p => p.StockQuantity - request.Quantity));
            if (affected != 1) { await transaction.RollbackAsync(); return Failure("Tồn kho không đủ hoặc số lượng vượt giới hạn. Vui lòng làm mới."); }
            if (receive)
            {
                await AddToWarehouseAsync(product!.ProductId, warehouse.WarehouseId, request.Quantity);
                allocations = new() { new() { WarehouseId = warehouse.WarehouseId, Quantity = request.Quantity } };
            }
            else foreach (var allocation in allocations.OrderBy(a => a.WarehouseId))
            {
                var updated = await context.WarehouseStocks.Where(s => s.ProductId == product!.ProductId && s.WarehouseId == allocation.WarehouseId && s.Quantity >= allocation.Quantity)
                    .ExecuteUpdateAsync(u => u.SetProperty(s => s.Quantity, s => s.Quantity - allocation.Quantity));
                if (updated != 1)
                {
                    await transaction.RollbackAsync(); context.ChangeTracker.Clear();
                    var options = await GetDispatchOptionsAsync(product!.ProductId, warehouse.WarehouseId, request.Quantity,destination?.WarehouseId);
                    return new() { Success = false, Message = "Tồn ở một kho không đủ hoặc vừa thay đổi. Chưa lưu đơn nào. " + options.Message, DispatchOptions = options };
                }
            }
            if(internalTransfer) await AddToWarehouseAsync(product!.ProductId,destination!.WarehouseId,request.Quantity);
            var records = allocations.Select(a => new InventoryTransaction {
                ProductId = product!.ProductId, WarehouseId = a.WarehouseId, SupplierId = receive ? supplier!.SupplierId : null,
                Quantity = a.Quantity, TransactionType = receive ? "Receive" : internalTransfer?"TransferOut":"Dispatch", CreatedAt = DateTime.UtcNow,
                DestinationType=dispatch?(internalTransfer?"Warehouse":"External"):null,
                DestinationWarehouseId=destination?.WarehouseId,
                ExternalDestination=externalDispatch?(string.IsNullOrWhiteSpace(request.ExternalDestination)?"Bên ngoài":request.ExternalDestination.Trim()):null
            }).ToList();
            if(internalTransfer) records.Add(new InventoryTransaction {ProductId=product!.ProductId,WarehouseId=destination!.WarehouseId,Quantity=request.Quantity,TransactionType="TransferIn",DestinationType="Warehouse",DestinationWarehouseId=destination.WarehouseId});
            context.InventoryTransactions.AddRange(records); await context.SaveChangesAsync();
            var total = await productQuery.AsNoTracking().Select(p => p.StockQuantity).SingleAsync();
            await transaction.CommitAsync();
            return new()
            {
                Success = true,
                ProductId = product!.ProductId,
                TransactionId = records[0].TransactionId,
                TransactionIds = records.Select(t => t.TransactionId).ToList(),
                NewStockQuantity = total,
                Message = internalTransfer
                    ? $"Đã chuyển {request.Quantity} {product!.Unit} từ {allocations.Count} kho đến {destination!.WarehouseName}. Tổng tồn không thay đổi: {total} {product.Unit}."
                    : $"{(createProduct ? "Đã tạo sản phẩm mới. " : "")}Đã lưu {records.Count} đơn {(receive ? "nhập từ nhà cung cấp vào kho" : "xuất ra "+records[0].ExternalDestination)}. Tổng tồn {product!.ProductName}: {total} {product.Unit}."
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(); context.ChangeTracker.Clear(); logger.LogError(ex, "Inventory transaction rolled back");
            return Failure("Không thể lưu giao dịch. Toàn bộ thay đổi đã được hoàn tác, vui lòng thử lại.");
        }
    }

    private async Task AddToWarehouseAsync(int productId, int warehouseId, int quantity)
    {
        var existing = await context.WarehouseStocks.AsNoTracking().AnyAsync(s => s.ProductId == productId && s.WarehouseId == warehouseId);
        if (existing) await context.WarehouseStocks.Where(s => s.ProductId == productId && s.WarehouseId == warehouseId).ExecuteUpdateAsync(u => u.SetProperty(s => s.Quantity, s => s.Quantity + quantity));
        else { context.WarehouseStocks.Add(new() { ProductId = productId, WarehouseId = warehouseId, Quantity = quantity }); await context.SaveChangesAsync(); }
    }

    public async Task<ConfirmResult> TransferStockAsync(TransferStockRequest request)
    {
        if (request.Quantity <= 0 || request.FromWarehouseId == request.ToWarehouseId) return Failure("Chọn hai kho khác nhau và số lượng chuyển lớn hơn 0.");
        var destination = await context.Warehouses.FindAsync(request.ToWarehouseId);
        if (destination == null || destination.IsUnallocated || !await context.Warehouses.AnyAsync(w => w.WarehouseId == request.FromWarehouseId)) return Failure("Kho chuyển/nhận không hợp lệ.");
        using var transaction = await context.Database.BeginTransactionAsync();
        try
        {
            var locked = await context.Products.Where(p => p.ProductId == request.ProductId).ExecuteUpdateAsync(u => u.SetProperty(p => p.StockQuantity, p => p.StockQuantity));
            if (locked != 1) { await transaction.RollbackAsync(); return Failure("Sản phẩm không tồn tại."); }
            var changed = await context.WarehouseStocks.Where(s => s.ProductId == request.ProductId && s.WarehouseId == request.FromWarehouseId && s.Quantity >= request.Quantity)
                .ExecuteUpdateAsync(u => u.SetProperty(s => s.Quantity, s => s.Quantity - request.Quantity));
            if (changed != 1) { await transaction.RollbackAsync(); return Failure("Kho nguồn không đủ hàng để chuyển."); }
            await AddToWarehouseAsync(request.ProductId, request.ToWarehouseId, request.Quantity);
            var records = new[] {
                new InventoryTransaction {ProductId=request.ProductId,WarehouseId=request.FromWarehouseId,TransactionType="TransferOut",Quantity=request.Quantity,DestinationType="Warehouse",DestinationWarehouseId=request.ToWarehouseId},
                new InventoryTransaction {ProductId=request.ProductId,WarehouseId=request.ToWarehouseId,TransactionType="TransferIn",Quantity=request.Quantity,DestinationType="Warehouse",DestinationWarehouseId=request.ToWarehouseId}
            };
            context.InventoryTransactions.AddRange(records); await context.SaveChangesAsync(); await transaction.CommitAsync();
            return new() { Success = true, ProductId = request.ProductId, TransactionId = records[0].TransactionId, TransactionIds = records.Select(t => t.TransactionId).ToList(), Message = "Đã chuyển/phân bổ tồn kho. Tổng tồn toàn hệ thống không thay đổi." };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(); context.ChangeTracker.Clear(); logger.LogError(ex, "Stock transfer rolled back"); return Failure("Không thể chuyển kho. Toàn bộ dữ liệu đã được hoàn tác.");
        }
    }

    public async Task<IEnumerable<TransactionHistoryDto>> GetTransactionHistoryAsync() => await context.InventoryTransactions.AsNoTracking()
        .OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.TransactionId)
        .Select(t => new TransactionHistoryDto { TransactionId = t.TransactionId, TransactionType = t.TransactionType, ProductName = t.Product!.ProductName, SupplierName = t.Supplier != null ? t.Supplier.SupplierName : null, WarehouseName = t.Warehouse!.WarehouseName, Quantity = t.Quantity, Unit = t.Product.Unit, CreatedAt = t.CreatedAt, DestinationType=t.DestinationType, DestinationWarehouseName=t.DestinationWarehouse!=null?t.DestinationWarehouse.WarehouseName:null,ExternalDestination=t.ExternalDestination }).ToListAsync();
}
