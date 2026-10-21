using webAPI.DTOs;
using webAPI.Entities;

namespace webAPI.Services;

/// <summary>
/// Service interface for Inventory operations, validation and DB transactions (R3, R5)
/// </summary>
public interface IInventoryService
{
    Task<ExtractedTransactionDto> ValidateExtractedDataAsync(ExtractedTransactionDto dto);
    Task<bool> ConfirmAndSaveTransactionAsync(ConfirmTransactionRequest request);
    Task<IEnumerable<TransactionHistoryDto>> GetTransactionHistoryAsync();
}
