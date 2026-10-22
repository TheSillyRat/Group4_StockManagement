using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webAPI.Migrations
{
    /// <inheritdoc />
    public partial class WarehouseInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsUnallocated",
                table: "Warehouses",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "WarehouseStocks",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarehouseStocks", x => new { x.ProductId, x.WarehouseId });
                    table.CheckConstraint("CK_WarehouseStocks_Quantity", "[Quantity] >= 0");
                    table.ForeignKey(
                        name: "FK_WarehouseStocks_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WarehouseStocks_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "WarehouseId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 1,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 2,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 3,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 4,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 5,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 6,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 7,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 8,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 9,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.UpdateData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: 10,
                column: "IsUnallocated",
                value: false);

            migrationBuilder.InsertData(
                table: "Warehouses",
                columns: new[] { "WarehouseId", "IsUnallocated", "WarehouseName" },
                values: new object[] { -1, true, "Kho chờ phân bổ" });

            // Legacy balances had no reliable warehouse dimension. Preserve every total
            // without inventing physical locations or rewriting historical transactions.
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM Products WHERE StockQuantity < 0)
                    THROW 51001, 'Resolve negative legacy product balances before allocating warehouse stock.', 1;
                INSERT INTO WarehouseStocks (ProductId, WarehouseId, Quantity)
                SELECT ProductId, -1, StockQuantity FROM Products WHERE StockQuantity > 0;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseStocks_WarehouseId",
                table: "WarehouseStocks",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WarehouseStocks");

            migrationBuilder.DeleteData(
                table: "Warehouses",
                keyColumn: "WarehouseId",
                keyValue: -1);

            migrationBuilder.DropColumn(
                name: "IsUnallocated",
                table: "Warehouses");
        }
    }
}
