using webAPI.DTOs;

namespace webAPI.Services;

/// <summary>
/// Service interface for communicating with Google Gemini API (R4)
/// </summary>
public interface IGeminiService
{
    /// <summary>
    /// Parses a natural language inventory prompt into structured transaction data.
    /// Uses GEMINI_API_KEY from environment variables and sends structured prompts.
    /// Handles missing/ambiguous info by requesting clarification.
    /// </summary>
    Task<ExtractedTransactionDto> ExtractInventoryDataAsync(string naturalLanguageText);
}
