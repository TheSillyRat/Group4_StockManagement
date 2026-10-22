using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Services;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Text;
using System.Text.Json;

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
  await using (var validationDb = Context()) {
    var missingDispatch = await Service(validationDb).ValidateExtractedDataAsync(new() { TransactionType="Dispatch", ProductName="New test item", WarehouseName="Binh Tan Warehouse", Quantity=20, Unit="box", ProductId=1, ProductExists=true });
    Check(missingDispatch.ProductNotFound && !missingDispatch.CanCreateProduct && !missingDispatch.IsValid && missingDispatch.ProductId==null && missingDispatch.ValidationMessage!.Contains("không tồn tại"),"Unknown dispatch returns database-backed not-found result, clears AI-supplied IDs");
    var missingReceive = await Service(validationDb).ValidateExtractedDataAsync(new() { TransactionType="Receive", ProductName="New test item", WarehouseName="Binh Tan Warehouse", Quantity=20, Unit="box" });
    Check(missingReceive.ProductNotFound && missingReceive.CanCreateProduct && !missingReceive.IsValid && missingReceive.ValidationMessage!.Contains("Bạn có muốn"),"Unknown receive asks whether to create product; extraction does not save");
  }
  ConfirmTransactionRequest NewRequest(string name, bool consent=true, string type="Receive") => new() { TransactionType=type, ProductName=name, Unit="box", WarehouseId=1, Quantity=20, CreateNewProduct=consent };
  Check(!(await Confirm(NewRequest("New test item",false))).Success && !(await Confirm(NewRequest("New test item",false,"Dispatch"))).Success && !(await Confirm(NewRequest("New test item",true,"Dispatch"))).Success,"Unknown product cannot be received without consent or dispatched with/without consent");
  Check(!(await Confirm(NewRequest("Product A"))).Success,"Create-new consent cannot silently receive into an existing product");
  var missingUnit=NewRequest("Missing unit item"); missingUnit.Unit=" ";
  Check(!(await Confirm(missingUnit)).Success && await Count()==3,"New product requires a unit and rejected requests do not create history");
  var created=await Confirm(NewRequest("New test item"));
  await using(var checkDb=Context()) {
    var added=await checkDb.Products.SingleAsync(p=>p.ProductName=="New test item");
    Check(created.Success && created.NewStockQuantity==20 && added.StockQuantity==20 && await Count()==4 && await checkDb.InventoryTransactions.AnyAsync(t=>t.TransactionId==created.TransactionId && t.ProductId==added.ProductId && t.Quantity==20),"Confirmed new product, initial receipt and history save atomically");
  }
  await setup.Database.ExecuteSqlRawAsync("CREATE TRIGGER RejectTestInsert ON InventoryTransactions AFTER INSERT AS BEGIN THROW 51000, 'Forced test failure', 1; END");
  var failedCreation=await Confirm(NewRequest("Must roll back item"));
  await using(var checkDb=Context()) Check(!failedCreation.Success && !await checkDb.Products.AnyAsync(p=>p.ProductName=="Must roll back item") && await Count()==4,"Receipt failure rolls back the newly created product as well as history");
  await setup.Database.ExecuteSqlRawAsync("DROP TRIGGER RejectTestInsert");
  var concurrentCreation=await Task.WhenAll(Confirm(NewRequest("Concurrent new item")),Confirm(NewRequest("Concurrent new item")));
  await using(var checkDb=Context()) Check(concurrentCreation.Count(r=>r.Success)==1 && await checkDb.Products.CountAsync(p=>p.ProductName=="Concurrent new item")==1 && await Count()==5,"Concurrent new-product confirmations do not create duplicate products or receipts");
  Check(GeminiService.ExtractViaRules("Receive -20 boxes of Product A into Binh Tan Warehouse.").IsAmbiguous,"Fallback rejects negative quantities");
  Check(GeminiService.ExtractViaRules("Receive 1.5 kg of Product C into Thu Duc Warehouse.").IsAmbiguous,"Fallback rejects unsupported decimal quantities");
  var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> { ["DeepSeek:ApiKey"]="test-placeholder" }).Build();
  var handler = new CatalogResponseHandler();
  var catalogAi = new CatalogAiService(new HttpClient(handler), config);
  var chat = new AiCatalogRequest { EntityType="product", Messages=new() { new() { Role="user", Content="Thêm Solar Panel 400W" } } };
  handler.Payload = new { productName="Solar Panel 400W", unit=(string?)null, stockQuantity=(int?)null, isAmbiguous=true };
  var partial = await catalogAi.ExtractAsync(chat, default);
  Check(!partial.IsComplete && partial.Unit==null && partial.StockQuantity==null && partial.Message.Contains("đơn vị"),"Catalog AI asks for a missing unit without treating numbers in a name as stock");
  chat.Messages.Add(new() { Role="assistant", Content=partial.Message });
  chat.Messages.Add(new() { Role="user", Content="Đơn vị item, tồn ban đầu 25" });
  handler.Payload = new { productName="Solar Panel 400W", unit="item", stockQuantity=25, isAmbiguous=false };
  var complete = await catalogAi.ExtractAsync(chat, default);
  Check(complete.IsComplete && complete.ProductName=="Solar Panel 400W" && complete.StockQuantity==25 && handler.LastRequest.Contains("Solar Panel 400W") && handler.LastRequest.Contains("assistant"),"Catalog AI preserves conversation and fills complete product fields without saving");
  handler.Payload = new { productName="Solar Panel 400W", unit="item", stockQuantity=-2, isAmbiguous=false };
  var negative = await catalogAi.ExtractAsync(chat, default);
  Check(!negative.IsComplete && negative.StockQuantity==null,"Catalog AI rejects negative initial stock even when model claims complete");
  chat.EntityType="warehouse";
  handler.Payload = new { warehouseName=" Kho Bình Dương ", productName="Injected product", unit="box", stockQuantity=50, isAmbiguous=false };
  var warehouseDraft = await catalogAi.ExtractAsync(chat, default);
  Check(warehouseDraft.IsComplete && warehouseDraft.WarehouseName=="Kho Bình Dương" && warehouseDraft.ProductName==null && warehouseDraft.Unit==null && warehouseDraft.StockQuantity==null,"Warehouse chat returns only the supported warehouse-name field");
  Check(await Count()==5,"Catalog chat extraction does not create inventory transactions");
  Console.WriteLine("ALL CHECKS PASSED");
} finally {
  // Only the test-owned database named above is removed.
  await setup.Database.EnsureDeletedAsync();
  Console.WriteLine("Isolated test database removed.");
}

class CatalogResponseHandler : HttpMessageHandler
{
    public object Payload { get; set; } = new { };
    public string LastRequest { get; private set; } = string.Empty;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = await request.Content!.ReadAsStringAsync(cancellationToken);
        var json = JsonSerializer.Serialize(new { choices = new[] { new { finish_reason="stop", message=new { content=JsonSerializer.Serialize(Payload) } } } });
        return new HttpResponseMessage(HttpStatusCode.OK) { Content=new StringContent(json,Encoding.UTF8,"application/json") };
    }
}
