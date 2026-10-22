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
    public DbSet<WarehouseStock> WarehouseStocks => Set<WarehouseStock>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<WarehouseStock>(entity =>
        {
            entity.HasKey(s => new { s.ProductId, s.WarehouseId });
            entity.HasOne(s => s.Product).WithMany(p => p.WarehouseStocks).HasForeignKey(s => s.ProductId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(s => s.Warehouse).WithMany(w => w.WarehouseStocks).HasForeignKey(s => s.WarehouseId).OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(t => t.HasCheckConstraint("CK_WarehouseStocks_Quantity", "[Quantity] >= 0"));
        });
        modelBuilder.Entity<Warehouse>().HasData(new Warehouse { WarehouseId = -1, WarehouseName = "Kho chờ phân bổ", IsUnallocated = true });

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
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.Warehouse)
                  .WithMany(w => w.InventoryTransactions)
                  .HasForeignKey(t => t.WarehouseId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Seed 10 Product records (Retains Products 1-3 to match R2 & R6 test benchmarks)
        modelBuilder.Entity<Product>().HasData(
            new Product { ProductId = 1, ProductName = "Product A", Unit = "box", StockQuantity = 100 },
            new Product { ProductId = 2, ProductName = "Product B", Unit = "box", StockQuantity = 50 },
            new Product { ProductId = 3, ProductName = "Product C", Unit = "kg", StockQuantity = 200 },
            new Product { ProductId = 4, ProductName = "Solar Panel 400W", Unit = "item", StockQuantity = 80 },
            new Product { ProductId = 5, ProductName = "Industrial Steel Bolts", Unit = "box", StockQuantity = 500 },
            new Product { ProductId = 6, ProductName = "Premium Arabica Coffee", Unit = "kg", StockQuantity = 350 },
            new Product { ProductId = 7, ProductName = "Electric Cable 50m", Unit = "roll", StockQuantity = 120 },
            new Product { ProductId = 8, ProductName = "Ergonomic Office Chair", Unit = "item", StockQuantity = 45 },
            new Product { ProductId = 9, ProductName = "Heavy Duty Packaging Box", Unit = "pack", StockQuantity = 300 },
            new Product { ProductId = 10, ProductName = "Organic Green Tea", Unit = "kg", StockQuantity = 150 }
        );

        // Seed 10 Supplier records (Retains Suppliers 1-2 to match R2 & R6 test benchmarks)
        modelBuilder.Entity<Supplier>().HasData(
            new Supplier { SupplierId = 1, SupplierName = "Supplier X" },
            new Supplier { SupplierId = 2, SupplierName = "Supplier Y" },
            new Supplier { SupplierId = 3, SupplierName = "Global Logistics Supply Ltd" },
            new Supplier { SupplierId = 4, SupplierName = "Prime Industrial Materials Co" },
            new Supplier { SupplierId = 5, SupplierName = "Apex Electronics Partner" },
            new Supplier { SupplierId = 6, SupplierName = "Delta Packaging Solutions" },
            new Supplier { SupplierId = 7, SupplierName = "Green Farm Agriculture Co" },
            new Supplier { SupplierId = 8, SupplierName = "Sunrise Wholesale Corp" },
            new Supplier { SupplierId = 9, SupplierName = "Horizon Steel & Metals" },
            new Supplier { SupplierId = 10, SupplierName = "Pacific Trade Logistics" }
        );

        // Seed 10 Warehouse records (Retains Warehouses 1-3 to match R2 & R6 test benchmarks)
        modelBuilder.Entity<Warehouse>().HasData(
            new Warehouse { WarehouseId = 1, WarehouseName = "Binh Tan Warehouse" },
            new Warehouse { WarehouseId = 2, WarehouseName = "Thu Duc Warehouse" },
            new Warehouse { WarehouseId = 3, WarehouseName = "Tan Binh Warehouse" },
            new Warehouse { WarehouseId = 4, WarehouseName = "District 7 Central Warehouse" },
            new Warehouse { WarehouseId = 5, WarehouseName = "Long An Distribution Center" },
            new Warehouse { WarehouseId = 6, WarehouseName = "Da Nang Transit Hub" },
            new Warehouse { WarehouseId = 7, WarehouseName = "Bac Ninh High-Tech Warehouse" },
            new Warehouse { WarehouseId = 8, WarehouseName = "Hai Phong Port Facility" },
            new Warehouse { WarehouseId = 9, WarehouseName = "Can Tho Regional Depot" },
            new Warehouse { WarehouseId = 10, WarehouseName = "Dong Nai Logistics Park" }
        );
    }
}
