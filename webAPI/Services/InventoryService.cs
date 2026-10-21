using Microsoft.EntityFrameworkCore;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Entities;

namespace webAPI.Services;

/// <summary>
/// Implementation of Inventory management and validation service (R3, R5)
/// Member assigned to R5 will implement transactional consistency & stock updates here.
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

    public async Task<ExtractedTransactionDto> ValidateExtractedDataAsync(ExtractedTransactionDto dto)
    {
        // TODO [Member 2 / Backend Dev]:
        // 1. Query SQL Server to check if ProductName exists.
        // 2. Query SQL Server to check if WarehouseName exists.
        // 3. Query SQL Server to check if SupplierName exists (if supplied).
        // 4. Update dto.ProductExists, dto.WarehouseExists, dto.SupplierExists, dto.IsValid.
        await Task.CompletedTask;
        return dto;
    }

    public async Task<bool> ConfirmAndSaveTransactionAsync(ConfirmTransactionRequest request)
    {
        // TODO [Member 2 / Backend Dev]:
        // Requirement R5: 
        // 1. Use an EF Core Database Transaction (using var transaction = await _context.Database.BeginTransactionAsync())
        // 2. Validate product exists and quantity > 0.
        // 3. If "Receive", stock += quantity.
        //    If "Dispatch", check if stock >= quantity, then stock -= quantity. Return false/error if stock insufficient.
        // 4. Insert new InventoryTransaction entity.
        // 5. Save changes and commit transaction.
        await Task.CompletedTask;
        return true;
    }

    public async Task<IEnumerable<TransactionHistoryDto>> GetTransactionHistoryAsync()
    {
        // TODO [Member 2 / Backend Dev]:
        // Query _context.InventoryTransactions with Include(Product), Include(Supplier), Include(Warehouse)
        // Order by CreatedAt descending and map to TransactionHistoryDto.
        await Task.CompletedTask;
        return new List<TransactionHistoryDto>();
    }
}
