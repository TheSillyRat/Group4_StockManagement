using Microsoft.EntityFrameworkCore;
using webAPI.Entities;

namespace webAPI.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure InventoryTransaction relationships
        modelBuilder.Entity<InventoryTransaction>(entity =>
        {
            entity.HasOne(t => t.Product)
                  .WithMany(p => p.InventoryTransactions)
                  .HasForeignKey(t => t.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.Supplier)
                  .WithMany(s => s.InventoryTransactions)
                  .HasForeignKey(t => t.SupplierId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(t => t.Warehouse)
                  .WithMany(w => w.InventoryTransactions)
                  .HasForeignKey(t => t.WarehouseId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Seed initial data for testing (Matches R2 & R6 test prompt)
        modelBuilder.Entity<Product>().HasData(
            new Product { ProductId = 1, ProductName = "Product A", Unit = "box", StockQuantity = 100 },
            new Product { ProductId = 2, ProductName = "Product B", Unit = "box", StockQuantity = 50 },
            new Product { ProductId = 3, ProductName = "Product C", Unit = "kg", StockQuantity = 200 }
        );

        modelBuilder.Entity<Supplier>().HasData(
            new Supplier { SupplierId = 1, SupplierName = "Supplier X" },
            new Supplier { SupplierId = 2, SupplierName = "Supplier Y" }
        );

        modelBuilder.Entity<Warehouse>().HasData(
            new Warehouse { WarehouseId = 1, WarehouseName = "Binh Tan Warehouse" },
            new Warehouse { WarehouseId = 2, WarehouseName = "Thu Duc Warehouse" },
            new Warehouse { WarehouseId = 3, WarehouseName = "Tan Binh Warehouse" }
        );
    }
}
