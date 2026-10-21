# AI-Powered Inventory Management System

A full-stack enterprise web application for the Generative AI course. This system converts natural-language inventory requests into structured transactions using the Google Gemini API, validates data integrity against SQL Server via Entity Framework Core, and ensures ACID-compliant stock updates upon user confirmation.

---

## 🛠 Technology Stack
- **Backend:** ASP.NET Core Web API (.NET 10)
- **Database:** Microsoft SQL Server with Entity Framework Core (Code-First)
- **AI Service:** Google Gemini API (`Mscc.GenerativeAI`)
- **Frontend:** React 18 + Vite
- **API Documentation:** Swagger / OpenAPI

---

## 📁 Project Architecture & Directory Structure

```text
MiniProj/
├── .gitignore                      # Git ignore file for .NET & Node artifacts
├── README.md                       # Complete project documentation & rubric
│
├── webAPI/                         # ASP.NET Core Web API Backend
│   ├── webAPI.csproj               # Configured NuGet packages (.NET 10)
│   ├── Program.cs                  # Service container, CORS, DbContext & Swagger setup
│   ├── appsettings.json            # Database connection strings & AI configurations
│   ├── webAPI.http                 # Endpoint HTTP test requests
│   │
│   ├── Entities/                   # EF Core Entities (Requirement R1)
│   │   ├── Product.cs              # ProductId, ProductName, Unit, StockQuantity
│   │   ├── Supplier.cs             # SupplierId, SupplierName
│   │   ├── Warehouse.cs            # WarehouseId, WarehouseName
│   │   └── InventoryTransaction.cs # PK, FKs (Product, Supplier, Warehouse), Quantity, Type
│   │
│   ├── Data/
│   │   └── ApplicationDbContext.cs # DbSets, Fluent API relations & Seed Data
│   │
│   ├── DTOs/                       # Data Transfer Objects
│   │   ├── AiInventoryRequest.cs
│   │   ├── ExtractedTransactionDto.cs
│   │   ├── ConfirmTransactionRequest.cs
│   │   ├── TransactionHistoryDto.cs
│   │   └── CommonDtos.cs
│   │
│   ├── Services/                   # Service Interfaces & Implementations
│   │   ├── IGeminiService.cs & GeminiService.cs       (Gemini AI extraction)
│   │   └── IInventoryService.cs & InventoryService.cs (Validation & Transaction consistency)
│   │
│   └── Controllers/                # REST Controllers (Requirement R3)
│       ├── ProductsController.cs   (Product catalog & stock levels)
│       ├── WarehousesController.cs (Warehouse listing)
│       ├── SuppliersController.cs  (Supplier directory)
│       └── InventoryController.cs  (ai-extract, confirm, history)
│
└── webapp/                         # React Frontend (Requirement R2)
    ├── package.json & vite.config.js
    └── src/
        ├── services/api.js         # Backend API client
        ├── components/Navbar.jsx   # Tab navigation component
        └── pages/
            ├── AiInventoryEntry.jsx    (Prompt input + Review/Edit & Confirmation Form)
            ├── ProductManagement.jsx   (Product catalog with real-time stock levels)
            ├── WarehouseManagement.jsx (Warehouse listings)
            └── TransactionHistory.jsx  (Historical transactions log)
```

---

## 👥 4-Member Team Work Breakdown Structure (Grading Rubric Alignment)

| Member | Primary Ownership | Specific Responsibilities | Assigned Files |
| :--- | :--- | :--- | :--- |
| **Member 1** (Team Lead / Database & Core API) | **R1 (3 marks) & R3 (1.5 marks)** | - Execute Code-First migrations to generate SQL Server schema.<br>- Seed database with benchmark records (Product A, Supplier X, Binh Tan Warehouse).<br>- Implement CRUD API endpoints for Products, Warehouses, and Suppliers.<br>- Manage Git workflow and environment configurations. | `Entities/*`, `Data/ApplicationDbContext.cs`, `Controllers/ProductsController.cs`, `WarehousesController.cs`, `SuppliersController.cs` |
| **Member 2** (Backend Logic & Consistency) | **R5 (2 marks) & R3 (1.5 marks)** | - Implement atomic Database Transactions (`BeginTransactionAsync`) guaranteeing stock & transaction consistency.<br>- Stock update logic: increment on Receive (+), decrement on Dispatch (-), reject insufficient inventory.<br>- Store confirmed transactions in SQL Server.<br>- Implement `GET /api/inventory/history` endpoint. | `Services/InventoryService.cs`, `Controllers/InventoryController.cs` (`confirm` & `history`) |
| **Member 3** (AI & Gemini Integration) | **R4 (5 marks)** | - Securely retrieve `GEMINI_API_KEY` from environment variables.<br>- Build dynamic prompt for `Mscc.GenerativeAI` to output strict JSON (type, product, supplier, warehouse, quantity, unit).<br>- Handle ambiguity: request clarification instead of hallucinating values.<br>- Validate AI-extracted entities against SQL Server database. | `Services/GeminiService.cs`, `DTOs/ExtractedTransactionDto.cs`, `Controllers/InventoryController.cs` (`ai-extract`) |
| **Member 4** (Frontend React Application) | **R2 (3 marks) & R6 (4 marks)** | - Develop 4 responsive React pages: Product Management, Warehouse Management, AI Inventory Entry, and Transaction History.<br>- Implement interactive Review & Edit Form for AI-extracted fields prior to submission.<br>- Prepare demonstration test cases: 3 valid prompts + 1 ambiguous prompt; prepare presentation slides/video. | All files in `webapp/` (`src/pages/*`, `src/components/*`, `src/services/api.js`) |

---

## 🧪 Requirement R6: Verification & Demonstration Test Cases

1. **Test Case 1 (Valid Receive Transaction):**
   - *Prompt:* `"Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse."`
   - *Expected Extraction:* Type: `Receive`, Product: `Product A`, Supplier: `Supplier X`, Warehouse: `Binh Tan Warehouse`, Quantity: `20`, Unit: `box`.
   - *Result:* Stock of `Product A` increments by `20`.

2. **Test Case 2 (Valid Dispatch Transaction):**
   - *Prompt:* `"Dispatch 15 boxes of Product A from Binh Tan Warehouse."`
   - *Expected Extraction:* Type: `Dispatch`, Product: `Product A`, Supplier: `null`, Warehouse: `Binh Tan Warehouse`, Quantity: `15`, Unit: `box`.
   - *Result:* Stock of `Product A` decrements by `15`.

3. **Test Case 3 (Transfer / Alternative Unit):**
   - *Prompt:* `"Receive 50 kg of Product C from Supplier Y into Thu Duc Warehouse."`
   - *Expected Extraction:* Type: `Receive`, Product: `Product C`, Supplier: `Supplier Y`, Warehouse: `Thu Duc Warehouse`, Quantity: `50`, Unit: `kg`.

4. **Test Case 4 (Ambiguous / Missing Information):**
   - *Prompt:* `"Send some items to warehouse."`
   - *Expected AI Behavior:* Flag `isAmbiguous = true` with a polite clarification message requesting product name, quantity, and specific warehouse name. Prevent invalid data persistence.

---

## 🚀 Execution Guide

### 1. Backend (webAPI):
```bash
cd webAPI

# Install EF CLI tools if not already present
dotnet tool install --global dotnet-ef

# Generate schema and apply migrations to SQL Server
dotnet ef migrations add InitialCreate
dotnet ef database update

# Configure Gemini API Key in current shell session
$env:GEMINI_API_KEY="Your_Gemini_API_Key_Here"

# Run the API with Hot Reload
dotnet watch
```
Access Swagger UI at: `http://localhost:5000/swagger`.

### 2. Frontend (webapp):
```bash
cd webapp

# Install dependencies and start Vite dev server
npm install
npm run dev
```
Access React UI at: `http://localhost:5173`.
