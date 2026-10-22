using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace webAPI.Migrations;

public partial class SeedInitialCatalogData : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Older installations may already have user-created rows with these IDs.
        // Never overwrite a catalog item or its current stock during demo seeding.
        migrationBuilder.Sql("""
            SET IDENTITY_INSERT Products ON;
            INSERT INTO Products (ProductId, ProductName, StockQuantity, Unit)
            SELECT v.Id,v.Name,v.Quantity,v.Unit FROM (VALUES
              (4,N'Solar Panel 400W',80,N'item'),(5,N'Industrial Steel Bolts',500,N'box'),
              (6,N'Premium Arabica Coffee',350,N'kg'),(7,N'Electric Cable 50m',120,N'roll'),
              (8,N'Ergonomic Office Chair',45,N'item'),(9,N'Heavy Duty Packaging Box',300,N'pack'),(10,N'Organic Green Tea',150,N'kg')
            ) v(Id,Name,Quantity,Unit)
            WHERE NOT EXISTS (SELECT 1 FROM Products p WHERE p.ProductId=v.Id OR LOWER(p.ProductName)=LOWER(v.Name));
            SET IDENTITY_INSERT Products OFF;
            SET IDENTITY_INSERT Suppliers ON;
            INSERT INTO Suppliers (SupplierId,SupplierName)
            SELECT v.Id,v.Name FROM (VALUES
              (3,N'Global Logistics Supply Ltd'),(4,N'Prime Industrial Materials Co'),(5,N'Apex Electronics Partner'),
              (6,N'Delta Packaging Solutions'),(7,N'Green Farm Agriculture Co'),(8,N'Sunrise Wholesale Corp'),
              (9,N'Horizon Steel & Metals'),(10,N'Pacific Trade Logistics')
            ) v(Id,Name)
            WHERE NOT EXISTS (SELECT 1 FROM Suppliers s WHERE s.SupplierId=v.Id OR LOWER(s.SupplierName)=LOWER(v.Name));
            SET IDENTITY_INSERT Suppliers OFF;
            SET IDENTITY_INSERT Warehouses ON;
            INSERT INTO Warehouses (WarehouseId,WarehouseName)
            SELECT v.Id,v.Name FROM (VALUES
              (4,N'District 7 Central Warehouse'),(5,N'Long An Distribution Center'),(6,N'Da Nang Transit Hub'),
              (7,N'Bac Ninh High-Tech Warehouse'),(8,N'Hai Phong Port Facility'),(9,N'Can Tho Regional Depot'),(10,N'Dong Nai Logistics Park')
            ) v(Id,Name)
            WHERE NOT EXISTS (SELECT 1 FROM Warehouses w WHERE w.WarehouseId=v.Id OR LOWER(w.WarehouseName)=LOWER(v.Name));
            SET IDENTITY_INSERT Warehouses OFF;
            """);
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Catalog records may have been edited or used in transactions. Keep them
        // when rolling schema back rather than deleting business data by seed ID.
    }
}
