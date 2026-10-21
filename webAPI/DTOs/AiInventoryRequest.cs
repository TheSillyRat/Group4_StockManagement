namespace webAPI.DTOs;

/// <summary>
/// DTO representing user input natural language prompt (R3, R4)
/// Example: "Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse."
/// </summary>
public class AiInventoryRequest
{
    public string Prompt { get; set; } = string.Empty;
}
