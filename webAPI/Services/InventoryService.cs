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
            dto.SupplierExists = dto.TransactionType.Equals("Dispatch", StringComparison.OrdinalIgnoreCase);
        }

        // Overall validity determination
        bool supplierCheck = dto.TransactionType.Equals("Dispatch", StringComparison.OrdinalIgnoreCase) || 
                             dto.SupplierExists || 
                             string.IsNullOrWhiteSpace(dto.SupplierName);

        dto.IsValid = !dto.IsAmbiguous &&
                      dto.ProductExists &&
                      dto.WarehouseExists &&
                      supplierCheck &&
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

        // 5. Atomic Database Transaction (TA-01, TA-02)
        using var dbTransaction = await _context.Database.BeginTransactionAsync();
        try
        {
            bool isReceive = normalizedType.Equals("Receive", StringComparison.OrdinalIgnoreCase);

            if (isReceive)
            {
                // Increment inventory stock on Receive
                product.StockQuantity += request.Quantity;
                _logger.LogInformation("Stock for Product '{ProductName}' incremented by {Quantity}. New balance: {NewBalance}",
                    product.ProductName, request.Quantity, product.StockQuantity);
            }
            else
            {
                // Verify sufficient inventory on Dispatch
                if (product.StockQuantity < request.Quantity)
                {
                    await dbTransaction.RollbackAsync();
                    return new ConfirmResult
                    {
                        Success = false,
                        Message = $"Insufficient inventory for '{product.ProductName}'. Current available: {product.StockQuantity} {product.Unit}, Requested dispatch: {request.Quantity} {product.Unit}."
                    };
                }

                // Decrement inventory stock on Dispatch
                product.StockQuantity -= request.Quantity;
                _logger.LogInformation("Stock for Product '{ProductName}' decremented by {Quantity}. New balance: {NewBalance}",
                    product.ProductName, request.Quantity, product.StockQuantity);
            }

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
                Message = $"Transaction #{transactionRecord.TransactionId} successfully confirmed. {product.ProductName} new stock: {product.StockQuantity} {product.Unit}.",
                TransactionId = transactionRecord.TransactionId,
                NewStockQuantity = product.StockQuantity
            };
        }
        catch (Exception ex)
        {
            await dbTransaction.RollbackAsync();
            _logger.LogError(ex, "Transaction failed and rolled back.");
            return new ConfirmResult
            {
                Success = false,
                Message = $"Transaction failed due to an internal error: {ex.Message}"
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
