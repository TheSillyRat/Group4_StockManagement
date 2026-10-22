using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace webAPI.Migrations
{
    /// <inheritdoc />
    public partial class DispatchDestinations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DestinationType",
                table: "InventoryTransactions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DestinationWarehouseId",
                table: "InventoryTransactions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalDestination",
                table: "InventoryTransactions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_DestinationWarehouseId",
                table: "InventoryTransactions",
                column: "DestinationWarehouseId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryTransactions_Warehouses_DestinationWarehouseId",
                table: "InventoryTransactions",
                column: "DestinationWarehouseId",
                principalTable: "Warehouses",
                principalColumn: "WarehouseId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryTransactions_Warehouses_DestinationWarehouseId",
                table: "InventoryTransactions");

            migrationBuilder.DropIndex(
                name: "IX_InventoryTransactions_DestinationWarehouseId",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "DestinationType",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "DestinationWarehouseId",
                table: "InventoryTransactions");

            migrationBuilder.DropColumn(
                name: "ExternalDestination",
                table: "InventoryTransactions");
        }
    }
}
