using webAPI.DTOs;

namespace webAPI.Services;

/// <summary>
/// Service interface for Inventory operations, validation and DB transactions (R3, R4, R5)
/// Maintained collaboratively by Sang Huỳnh (Validation) and Tài (Transactions & Stock Updates).
/// </summary>
public interface IInventoryService
{
    Task<ExtractedTransactionDto> ValidateExtractedDataAsync(ExtractedTransactionDto dto);
    Task<ConfirmResult> ConfirmAndSaveTransactionAsync(ConfirmTransactionRequest request);
    Task<IEnumerable<TransactionHistoryDto>> GetTransactionHistoryAsync();
    Task<DispatchOptionsDto> GetDispatchOptionsAsync(int productId, int warehouseId, int quantity);
    Task<ConfirmResult> TransferStockAsync(TransferStockRequest request);
}
