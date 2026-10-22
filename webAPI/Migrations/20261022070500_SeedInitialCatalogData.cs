using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace webAPI.Migrations
{
    /// <inheritdoc />
    public partial class SeedInitialCatalogData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "ProductId", "ProductName", "StockQuantity", "Unit" },
                values: new object[,]
                {
                    { 4, "Solar Panel 400W", 80, "item" },
                    { 5, "Industrial Steel Bolts", 500, "box" },
                    { 6, "Premium Arabica Coffee", 350, "kg" },
                    { 7, "Electric Cable 50m", 120, "roll" },
                    { 8, "Ergonomic Office Chair", 45, "item" },
                    { 9, "Heavy Duty Packaging Box", 300, "pack" },
                    { 10, "Organic Green Tea", 150, "kg" }
                });

            migrationBuilder.InsertData(
                table: "Suppliers",
                columns: new[] { "SupplierId", "SupplierName" },
                values: new object[,]
                {
                    { 3, "Global Logistics Supply Ltd" },
                    { 4, "Prime Industrial Materials Co" },
                    { 5, "Apex Electronics Partner" },
                    { 6, "Delta Packaging Solutions" },
                    { 7, "Green Farm Agriculture Co" },
                    { 8, "Sunrise Wholesale Corp" },
                    { 9, "Horizon Steel & Metals" },
                    { 10, "Pacific Trade Logistics" }
                });

            migrationBuilder.InsertData(
                table: "Warehouses",
                columns: new[] { "WarehouseId", "WarehouseName" },
                values: new object[,]
                {
                    { 4, "District 7 Central Warehouse" },
                    { 5, "Long An Distribution Center" },
                    { 6, "Da Nang Transit Hub" },
                    { 7, "Bac Ninh High-Tech Warehouse" },
                    { 8, "Hai Phong Port Facility" },
                    { 9, "Can Tho Regional Depot" },
                    { 10, "Dong Nai Logistics Park" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "ProductId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "ProductId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "ProductId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "ProductId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "ProductId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "ProductId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "ProductId",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Suppliers",
                keyColumn: "SupplierId",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 10);
        }
    }
}
