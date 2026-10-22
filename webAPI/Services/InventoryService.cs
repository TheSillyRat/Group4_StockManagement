using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Entities;

namespace webAPI.Services;

/// <summary>
/// Implementation of Inventory management, validation, and transactional consistency.
/// Fulfills requirements for:
/// - Sang Huỳnh (Member 3): Reference validation against SQL Server
/// - Tài (Member 2): ACID Database transactions, stock increment/decrement, and history log
/// </summary>
public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InventoryService> _logger;

    public InventoryService(ApplicationDbContext context, ILogger<InventoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Requirement R4.5 & SH-04 (Sang Huỳnh):
    /// Validates AI-extracted entity names against SQL Server records.
    /// Resolves foreign key IDs (ProductId, WarehouseId, SupplierId) for the client.
    /// </summary>
    public async Task<ExtractedTransactionDto> ValidateExtractedDataAsync(ExtractedTransactionDto dto)
    {
        var unitMatches = true;
        if (dto.IsAmbiguous)
        {
            dto.ProductExists = false;
            dto.WarehouseExists = false;
            dto.SupplierExists = false;
            dto.IsValid = false;
            return dto;
        }

        // 1. Validate Product Name against database
        if (!string.IsNullOrWhiteSpace(dto.ProductName))
        {
            var pName = dto.ProductName.Trim().ToLower();
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.ProductName.ToLower() == pName);

            if (product != null)
            {
                dto.ProductExists = true;
                dto.ProductId = product.ProductId;
                if (string.IsNullOrWhiteSpace(dto.Unit))
                {
                    dto.Unit = product.Unit;
                }
                unitMatches = string.Equals(dto.Unit.Trim(), product.Unit, StringComparison.OrdinalIgnoreCase);
            }
            else
            {
                dto.ProductExists = false;
            }
        }
        else
        {
            dto.ProductExists = false;
        }

        // 2. Validate Warehouse Name against database
        if (!string.IsNullOrWhiteSpace(dto.WarehouseName))
        {
            var wName = dto.WarehouseName.Trim().ToLower();
            var warehouse = await _context.Warehouses
                .FirstOrDefaultAsync(w => w.WarehouseName.ToLower() == wName);

            if (warehouse != null)
            {
                dto.WarehouseExists = true;
                dto.WarehouseId = warehouse.WarehouseId;
            }
            else
            {
                dto.WarehouseExists = false;
            }
        }
        else
        {
            dto.WarehouseExists = false;
        }

        // 3. Validate Supplier Name (if provided)
        if (!string.IsNullOrWhiteSpace(dto.SupplierName))
        {
            var sName = dto.SupplierName.Trim().ToLower();
            var supplier = await _context.Suppliers
                .FirstOrDefaultAsync(s => s.SupplierName.ToLower() == sName);

            if (supplier != null)
            {
                dto.SupplierExists = true;
                dto.SupplierId = supplier.SupplierId;
            }
            else
            {
                dto.SupplierExists = false;
            }
        }
        else
        {
            // Supplier is not required for Dispatch transactions
            dto.SupplierExists = string.Equals(dto.TransactionType, "Dispatch", StringComparison.OrdinalIgnoreCase);
        }

        // Overall validity determination
        bool supplierCheck = dto.SupplierExists ||
                             string.IsNullOrWhiteSpace(dto.SupplierName);

        dto.IsValid = !dto.IsAmbiguous &&
                      dto.ProductExists &&
                      dto.WarehouseExists &&
                      supplierCheck &&
                      unitMatches &&
                      (string.Equals(dto.TransactionType, "Receive", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(dto.TransactionType, "Dispatch", StringComparison.OrdinalIgnoreCase)) &&
                      dto.Quantity > 0;

        return dto;
    }

    /// <summary>
    /// Requirement R5, TA-01, TA-02, TA-03 (Tài):
    /// Executes atomic EF Core database transaction to update stock and save transaction record.
    /// Rejects dispatch if stock is insufficient. Guarantees rollback on error.
    /// </summary>
    public async Task<ConfirmResult> ConfirmAndSaveTransactionAsync(ConfirmTransactionRequest request)
    {
        // 1. Input Data Validation (TA-03)
        if (request.Quantity <= 0)
        {
            return new ConfirmResult
            {
                Success = false,
                Message = "Transaction quantity must be greater than zero."
            };
        }

        var normalizedType = request.TransactionType?.Trim() ?? string.Empty;
        if (!string.Equals(normalizedType, "Receive", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(normalizedType, "Dispatch", StringComparison.OrdinalIgnoreCase))
        {
            return new ConfirmResult
            {
                Success = false,
                Message = $"Invalid transaction type '{request.TransactionType}'. Only 'Receive' and 'Dispatch' are allowed."
            };
        }

        // 2. Resolve Product
        Product? product = null;
        if (request.ProductId.HasValue && request.ProductId.Value > 0)
        {
            product = await _context.Products.FindAsync(request.ProductId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(request.ProductName))
        {
            var pName = request.ProductName.Trim().ToLower();
            product = await _context.Products.FirstOrDefaultAsync(p => p.ProductName.ToLower() == pName);
        }

        if (product == null)
        {
            return new ConfirmResult
            {
                Success = false,
                Message = $"Product not found. Provided ProductId: {request.ProductId}, Name: '{request.ProductName}'."
            };
        }

        if (!string.IsNullOrWhiteSpace(request.Unit) &&
            !string.Equals(request.Unit.Trim(), product.Unit, StringComparison.OrdinalIgnoreCase))
        {
            return new ConfirmResult { Success = false, Message = $"Đơn vị tính phải là '{product.Unit}'. Hệ thống chưa hỗ trợ quy đổi đơn vị." };
        }

        // 3. Resolve Warehouse
        Warehouse? warehouse = null;
        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            warehouse = await _context.Warehouses.FindAsync(request.WarehouseId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(request.WarehouseName))
        {
            var wName = request.WarehouseName.Trim().ToLower();
            warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseName.ToLower() == wName);
        }

        if (warehouse == null)
        {
            return new ConfirmResult
            {
                Success = false,
                Message = $"Warehouse not found. Provided WarehouseId: {request.WarehouseId}, Name: '{request.WarehouseName}'."
            };
        }

        // 4. Resolve Supplier (Optional or required for Receive)
        Supplier? supplier = null;
        if (request.SupplierId.HasValue && request.SupplierId.Value > 0)
        {
            supplier = await _context.Suppliers.FindAsync(request.SupplierId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(request.SupplierName))
        {
            var sName = request.SupplierName.Trim().ToLower();
            supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.SupplierName.ToLower() == sName);
        }

        if ((request.SupplierId.HasValue || !string.IsNullOrWhiteSpace(request.SupplierName)) && supplier == null)
            return new ConfirmResult { Success = false, Message = "Nhà cung cấp không tồn tại. Vui lòng chọn lại." };

        // Update stock in SQL, under the same transaction as the history insert.
        // A conditional UPDATE prevents lost updates and concurrent over-dispatch.
        using var dbTransaction = await _context.Database.BeginTransactionAsync();
        try
        {
            bool isReceive = normalizedType.Equals("Receive", StringComparison.OrdinalIgnoreCase);

            var stockQuery = _context.Products.Where(p => p.ProductId == product.ProductId);
            int affected;
            if (isReceive)
                affected = await stockQuery
                    .Where(p => p.StockQuantity <= int.MaxValue - request.Quantity)
                    .ExecuteUpdateAsync(update => update.SetProperty(p => p.StockQuantity, p => p.StockQuantity + request.Quantity));
            else
                affected = await stockQuery
                    .Where(p => p.StockQuantity >= request.Quantity)
                    .ExecuteUpdateAsync(update => update.SetProperty(p => p.StockQuantity, p => p.StockQuantity - request.Quantity));

            if (affected != 1)
            {
                await dbTransaction.RollbackAsync();
                return new ConfirmResult { Success = false, Message = isReceive
                    ? "Số lượng tồn kho vượt giới hạn cho phép."
                    : "Tồn kho không đủ để xuất số lượng yêu cầu. Vui lòng làm mới dữ liệu." };
            }
            var newStock = await stockQuery.AsNoTracking().Select(p => p.StockQuantity).SingleAsync();

            // Create InventoryTransaction record
            var transactionRecord = new InventoryTransaction
            {
                ProductId = product.ProductId,
                SupplierId = supplier?.SupplierId,
                WarehouseId = warehouse.WarehouseId,
                TransactionType = isReceive ? "Receive" : "Dispatch",
                Quantity = request.Quantity,
                CreatedAt = DateTime.UtcNow
            };

            _context.InventoryTransactions.Add(transactionRecord);
            await _context.SaveChangesAsync();

            // Commit transaction atomically
            await dbTransaction.CommitAsync();

            return new ConfirmResult
            {
                Success = true,
                Message = $"Đã lưu giao dịch #{transactionRecord.TransactionId}. Tồn kho {product.ProductName}: {newStock} {product.Unit}.",
                TransactionId = transactionRecord.TransactionId,
                NewStockQuantity = newStock
            };
        }
        catch (Exception ex)
        {
            await dbTransaction.RollbackAsync();
            _logger.LogError(ex, "Transaction failed and rolled back.");
            return new ConfirmResult
            {
                Success = false,
                Message = "Không thể lưu giao dịch. Dữ liệu đã được hoàn tác, vui lòng thử lại."
            };
        }
    }

    /// <summary>
    /// Requirement R3 & TA-05 (Tài):
    /// Retrieves all confirmed transactions ordered by creation date descending.
    /// </summary>
    public async Task<IEnumerable<TransactionHistoryDto>> GetTransactionHistoryAsync()
    {
        return await _context.InventoryTransactions
            .AsNoTracking()
            .Include(t => t.Product)
            .Include(t => t.Supplier)
            .Include(t => t.Warehouse)
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.TransactionId)
            .Select(t => new TransactionHistoryDto
            {
                TransactionId = t.TransactionId,
                TransactionType = t.TransactionType,
                ProductName = t.Product != null ? t.Product.ProductName : "Unknown Product",
                SupplierName = t.Supplier != null ? t.Supplier.SupplierName : null,
                WarehouseName = t.Warehouse != null ? t.Warehouse.WarehouseName : "Unknown Warehouse",
                Quantity = t.Quantity,
                Unit = t.Product != null ? t.Product.Unit : string.Empty,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();
    }
}
