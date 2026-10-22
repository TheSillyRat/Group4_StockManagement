using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Services;

// Isolated, uniquely named LocalDB; never use or modify the application database.
var database = "StockFlow_Checks_" + Guid.NewGuid().ToString("N");
var options = new DbContextOptionsBuilder<ApplicationDbContext>()
    .UseSqlServer($"Server=(localdb)\\mssqllocaldb;Database={database};Trusted_Connection=True;TrustServerCertificate=True").Options;
ApplicationDbContext Context() => new(options);
InventoryService Service(ApplicationDbContext db) => new(db, NullLogger<InventoryService>.Instance);
ConfirmTransactionRequest Request(string type, int quantity) => new() { TransactionType=type, ProductId=1, WarehouseId=1, SupplierId=1, Quantity=quantity, Unit="box" };
void Check(bool condition, string name) { if (!condition) throw new Exception("FAIL: " + name); Console.WriteLine("PASS: " + name); }
async Task<ConfirmResult> Confirm(ConfirmTransactionRequest request) { await using var db=Context(); return await Service(db).ConfirmAndSaveTransactionAsync(request); }
async Task<int> Stock() { await using var db=Context(); return await db.Products.Where(p=>p.ProductId==1).Select(p=>p.StockQuantity).SingleAsync(); }
async Task<int> Count() { await using var db=Context(); return await db.InventoryTransactions.CountAsync(); }
await using var setup=Context();
try {
  await setup.Database.MigrateAsync();
  Check(await Stock()==100 && await Count()==0,"Seeded isolated database; no unconfirmed transactions");
  var receive=await Confirm(Request("Receive",20));
  Check(receive.Success && receive.TransactionId.HasValue && receive.NewStockQuantity==120 && await Stock()==120 && await Count()==1,"Receive saves history and increments stock");
  var dispatch=await Confirm(Request("Dispatch",15));
  Check(dispatch.Success && dispatch.NewStockQuantity==105 && await Stock()==105 && await Count()==2,"Dispatch saves history and decrements stock");
  foreach(var invalid in new[]{ Request("Dispatch",9999), Request("Receive",0), Request("Receive",-1), Request("Unknown",1), new ConfirmTransactionRequest{TransactionType="Receive",ProductId=999,WarehouseId=1,Quantity=1},new ConfirmTransactionRequest{TransactionType="Receive",ProductId=1,WarehouseId=999,Quantity=1},new ConfirmTransactionRequest{TransactionType="Receive",ProductId=1,WarehouseId=1,SupplierId=999,Quantity=1},new ConfirmTransactionRequest{TransactionType="Receive",ProductId=1,WarehouseId=1,Quantity=1,Unit="kg"},Request("Receive",int.MaxValue)}) {
    Check(!(await Confirm(invalid)).Success,"Reject invalid input / insufficient stock / overflow");
  }
  Check(await Stock()==105 && await Count()==2,"Rejected requests leave stock and history unchanged");
  // Force both contexts to hold the same old balance before concurrent dispatch.
  await using(var a=Context()) await using(var b=Context()) {
    await a.Products.FindAsync(1); await b.Products.FindAsync(1);
    var results=await Task.WhenAll(Service(a).ConfirmAndSaveTransactionAsync(Request("Dispatch",80)),Service(b).ConfirmAndSaveTransactionAsync(Request("Dispatch",80)));
    Check(results.Count(r=>r.Success)==1 && await Stock()==25 && await Count()==3,"Concurrent dispatch: only one succeeds, no overselling or lost update");
  }
  // Force the history insert to fail after the atomic stock UPDATE succeeds.
  await setup.Database.ExecuteSqlRawAsync("CREATE TRIGGER RejectTestInsert ON InventoryTransactions AFTER INSERT AS BEGIN THROW 51000, 'Forced test failure', 1; END");
  Check(!(await Confirm(Request("Receive",5))).Success && await Stock()==25 && await Count()==3,"History insert failure rolls back the stock update");
  await setup.Database.ExecuteSqlRawAsync("DROP TRIGGER RejectTestInsert");
  var history=(await Service(setup).GetTransactionHistoryAsync()).ToList();
  Check(history.Count==3 && history[0].TransactionId>history[1].TransactionId && history.All(t=>t.ProductName=="Product A" && t.WarehouseName=="Binh Tan Warehouse"),"History includes references and is ordered newest first");
  Check(GeminiService.ExtractViaRules("Receive -20 boxes of Product A into Binh Tan Warehouse.").IsAmbiguous,"Fallback rejects negative quantities");
  Check(GeminiService.ExtractViaRules("Receive 1.5 kg of Product C into Thu Duc Warehouse.").IsAmbiguous,"Fallback rejects unsupported decimal quantities");
  Console.WriteLine("ALL CHECKS PASSED");
} finally {
  // Only the test-owned database named above is removed.
  await setup.Database.EnsureDeletedAsync();
  Console.WriteLine("Isolated test database removed.");
}
