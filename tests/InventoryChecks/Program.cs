using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using webAPI.Data;
using webAPI.DTOs;
using webAPI.Services;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.AspNetCore.Mvc;
using webAPI.Controllers;

// Isolated, uniquely named LocalDB; never use or modify the application database.
var database = "StockFlow_Checks_" + Guid.NewGuid().ToString("N");
var options = new DbContextOptionsBuilder<ApplicationDbContext>()
    .UseSqlServer($"Server=(localdb)\\mssqllocaldb;Database={database};Trusted_Connection=True;TrustServerCertificate=True").Options;
ApplicationDbContext Context() => new(options);
InventoryService Service(ApplicationDbContext db) => new(db, NullLogger<InventoryService>.Instance);
ConfirmTransactionRequest Request(string type, int quantity) => new() { TransactionType=type, DestinationType=type=="Dispatch"?"External":null, ProductId=1, WarehouseId=1, SupplierId=1, Quantity=quantity, Unit="box" };
void Check(bool condition, string name) { if (!condition) throw new Exception("FAIL: " + name); Console.WriteLine("PASS: " + name); }
async Task<ConfirmResult> Confirm(ConfirmTransactionRequest request) { await using var db=Context(); return await Service(db).ConfirmAndSaveTransactionAsync(request); }
async Task<int> Stock() { await using var db=Context(); return await db.Products.Where(p=>p.ProductId==1).Select(p=>p.StockQuantity).SingleAsync(); }
async Task<int> Count() { await using var db=Context(); return await db.InventoryTransactions.CountAsync(); }
await using var setup=Context();
try {
  await setup.GetService<IMigrator>().MigrateAsync("20261022014407_InitialCreate");
  await setup.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT Products ON; INSERT Products(ProductId,ProductName,StockQuantity,Unit) VALUES(4,'User-owned product',17,'item'); SET IDENTITY_INSERT Products OFF;");
  await setup.Database.MigrateAsync();
  Check(await setup.Products.AnyAsync(p=>p.ProductId==4 && p.ProductName=="User-owned product" && p.StockQuantity==17),"Catalog migration preserves user-created IDs and stock instead of overwriting demo data");
  Check(await setup.WarehouseStocks.Where(s=>s.ProductId==1 && s.WarehouseId==-1).Select(s=>s.Quantity).SingleAsync()==100,"Migration preserves legacy total in unallocated stock without inventing a physical location");
  // Fixture: allocate Product A to warehouse 1 before testing normal operations.
  await setup.Database.ExecuteSqlRawAsync("UPDATE WarehouseStocks SET WarehouseId=1 WHERE ProductId=1 AND WarehouseId=-1");
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
  ConfirmTransactionRequest NewRequest(string name, bool consent=true, string type="Receive") => new() { TransactionType=type, ProductName=name, Unit="box", WarehouseId=1, SupplierId=1, Quantity=20, CreateNewProduct=consent };
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
  var noSupplier=Request("Receive",2);noSupplier.SupplierId=null;
  Check(!(await Confirm(noSupplier)).Success && await Count()==5,"Receipt requires a supplier even for direct API calls");
  var secondReceipt=Request("Receive",40);secondReceipt.WarehouseId=2;secondReceipt.SupplierId=2;
  Check((await Confirm(secondReceipt)).Success && await Stock()==65,"Receipt increases only the selected warehouse and the product total");
  await using(var checkDb=Context()) {
    var validation=await Service(checkDb).ValidateExtractedDataAsync(new(){TransactionType="Dispatch",ProductName="Product A",WarehouseName="Binh Tan Warehouse",Quantity=50,Unit="box",SupplierName="Supplier X"});
    Check(validation.SupplierId==null && validation.SupplierName==null && !validation.IsValid && validation.DispatchOptions?.ShortageQuantity==25 && validation.DispatchOptions.CanFulfill,"AI result warns about warehouse shortage, strips supplier and suggests actual alternatives");
  }
  var beforeSplit=await Count();
  var split=Request("Dispatch",50);
  Check(!(await Confirm(split)).Success && await Stock()==65 && await Count()==beforeSplit,"Insufficient selected warehouse never silently spends another warehouse");
  split.DispatchAllocations=new(){new(){WarehouseId=1,Quantity=25},new(){WarehouseId=2,Quantity=25}};
  Check(!(await Confirm(split)).Success,"Additional dispatch orders require explicit consent");
  split.ConfirmAdditionalDispatches=true;
  var splitResult=await Confirm(split);
  Check(splitResult.Success && splitResult.TransactionIds.Count==2 && await Stock()==15 && await Count()==beforeSplit+2,"Consented split dispatch creates two orders atomically and reduces total once");
  await using(var checkDb=Context()) Check(await checkDb.InventoryTransactions.Where(t=>splitResult.TransactionIds.Contains(t.TransactionId)).AllAsync(t=>t.SupplierId==null),"Outbound dispatch records never carry a supplier");
  var rollbackSplit=Request("Dispatch",10);rollbackSplit.ConfirmAdditionalDispatches=true;rollbackSplit.DispatchAllocations=new(){new(){WarehouseId=2,Quantity=5},new(){WarehouseId=3,Quantity=5}};
  var failedSplit=await Confirm(rollbackSplit);
  await using(var checkDb=Context()) Check(!failedSplit.Success && await Stock()==15 && await Count()==beforeSplit+2 && await checkDb.WarehouseStocks.Where(s=>s.ProductId==1 && s.WarehouseId==2).Select(s=>s.Quantity).SingleAsync()==15,"One insufficient leg rolls back every stock change and all additional orders");
  await using(var checkDb=Context()) {
    var moved=await Service(checkDb).TransferStockAsync(new(){ProductId=1,FromWarehouseId=2,ToWarehouseId=3,Quantity=6});
    Check(moved.Success && await Stock()==15 && await checkDb.WarehouseStocks.AsNoTracking().Where(s=>s.ProductId==1 && s.WarehouseId==3).Select(s=>s.Quantity).SingleAsync()==6,"Warehouse transfer preserves global quantity and moves actual per-warehouse stock");
  }
  await setup.Database.ExecuteSqlRawAsync("CREATE TRIGGER RejectTestInsert ON InventoryTransactions AFTER INSERT AS BEGIN THROW 51000, 'Forced test failure', 1; END");
  var beforeTransferFailure=await Count();
  await using(var checkDb=Context()) {
    var moved=await Service(checkDb).TransferStockAsync(new(){ProductId=1,FromWarehouseId=2,ToWarehouseId=1,Quantity=2});
    Check(!moved.Success && await Stock()==15 && await Count()==beforeTransferFailure && await checkDb.WarehouseStocks.AsNoTracking().Where(s=>s.ProductId==1 && s.WarehouseId==2).Select(s=>s.Quantity).SingleAsync()==9,"Transfer history failure restores both source and destination balances");
  }
  await setup.Database.ExecuteSqlRawAsync("DROP TRIGGER RejectTestInsert");
  await using(var checkDb=Context()) {
    var allocated=await Service(checkDb).TransferStockAsync(new(){ProductId=2,FromWarehouseId=-1,ToWarehouseId=1,Quantity=10});
    Check(allocated.Success && await checkDb.Products.Where(p=>p.ProductId==2).Select(p=>p.StockQuantity).SingleAsync()==50,"Unallocated legacy stock can be explicitly assigned without changing total");
    Check(!await checkDb.Products.AnyAsync(p=>p.StockQuantity!=p.WarehouseStocks.Sum(s=>s.Quantity)),"Every product total equals the sum of its warehouse balances");
  }
  var simultaneousSplit=Request("Dispatch",10);simultaneousSplit.WarehouseId=2;simultaneousSplit.ConfirmAdditionalDispatches=true;
  simultaneousSplit.DispatchAllocations=new(){new(){WarehouseId=2,Quantity=6},new(){WarehouseId=3,Quantity=4}};
  var countBeforeConcurrentSplit=await Count();
  var simultaneousResults=await Task.WhenAll(Confirm(simultaneousSplit),Confirm(simultaneousSplit));
  Check(simultaneousResults.Count(r=>r.Success)==1 && await Stock()==5 && await Count()==countBeforeConcurrentSplit+2,"Concurrent split confirmations cannot oversell or create partial extra orders");
  await using(var checkDb=Context()) {
    var blockedDelete=false;
    try { await checkDb.Suppliers.Where(s=>s.SupplierId==1).ExecuteDeleteAsync(); } catch { blockedDelete=true; }
    Check(blockedDelete && await checkDb.Suppliers.AnyAsync(s=>s.SupplierId==1),"Database prevents deletion of a supplier referenced by receipt history");
    Check(!await checkDb.Products.AnyAsync(p=>p.StockQuantity!=p.WarehouseStocks.Sum(s=>s.Quantity)),"Warehouse totals remain consistent after concurrent split orders");
  }
  await using(var checkDb=Context()) {
    var controller=new ProductsController(checkDb,Service(checkDb));
    var missingSource=await controller.CreateProduct(new(){ProductName="No receipt source",Unit="box",StockQuantity=4,WarehouseId=1});
    Check(missingSource is BadRequestObjectResult && !await checkDb.Products.AnyAsync(p=>p.ProductName=="No receipt source"),"Create-product API rejects positive initial stock without a supplier and creates no orphan product");
    var createdProduct=await controller.CreateProduct(new(){ProductName="Controller receipt item",Unit="box",StockQuantity=4,WarehouseId=2,SupplierId=1});
    var createdDto=(createdProduct as CreatedAtActionResult)?.Value as ProductDto;
    Check(createdDto?.StockQuantity==4 && createdDto.WarehouseStocks.Single().WarehouseId==2 && createdDto.WarehouseStocks.Single().Quantity==4,"Create-product API records initial receipt in the chosen warehouse");
    Check(await controller.UpdateProduct(createdDto!.ProductId,new(){ProductName=createdDto.ProductName,Unit="box",StockQuantity=99}) is BadRequestObjectResult,"Metadata API cannot bypass warehouse stock updates");
    var supplierController=new SuppliersController(checkDb);
    Check(await supplierController.DeleteSupplier(1) is BadRequestObjectResult,"Supplier API refuses deletion when receipt history exists");
    var supplierCreated=await supplierController.CreateSupplier(new(){SupplierName="Temporary isolated supplier"});
    var supplierDto=(supplierCreated.Result as CreatedAtActionResult)?.Value as SupplierDto;
    Check(supplierDto!=null && await supplierController.UpdateSupplier(supplierDto.SupplierId,new(){SupplierName="Updated isolated supplier"}) is OkObjectResult && await supplierController.DeleteSupplier(supplierDto.SupplierId) is OkObjectResult,"Supplier create, update and delete APIs work for unused catalog entries");
    Check(await new WarehousesController(checkDb).DeleteWarehouse(-1) is BadRequestObjectResult,"System unallocated warehouse cannot be deleted");
  }
  var missingDestination=Request("Dispatch",1);missingDestination.WarehouseId=2;missingDestination.DestinationType=null;
  Check(!(await Confirm(missingDestination)).Success,"Dispatch requires an explicit destination");
  var transferProduct=await Confirm(NewRequest("Destination transfer test"));
  var transferId=transferProduct.ProductId!.Value;
  var topUp=Request("Receive",10);topUp.ProductId=transferId;topUp.WarehouseId=2;
  Check((await Confirm(topUp)).Success,"Destination test stocks two source warehouses");
  var move=Request("Dispatch",25);move.ProductId=transferId;move.DestinationType="Warehouse";move.DestinationWarehouseId=3;
  await using(var checkDb=Context()) {
    var plan=await Service(checkDb).GetDispatchOptionsAsync(transferId,1,25,3);
    Check(plan.CanFulfill && plan.Alternatives.All(s=>s.WarehouseId!=3),"Transfer plan excludes destination from source candidates");
  }
  move.ConfirmAdditionalDispatches=true;move.DispatchAllocations=new(){new(){WarehouseId=1,Quantity=20},new(){WarehouseId=2,Quantity=5}};
  var movedDestination=await Confirm(move);
  await using(var checkDb=Context()) {
    Check(movedDestination.Success && movedDestination.TransactionIds.Count==3 && await checkDb.Products.Where(p=>p.ProductId==transferId).Select(p=>p.StockQuantity).SingleAsync()==30 && await checkDb.WarehouseStocks.Where(s=>s.ProductId==transferId && s.WarehouseId==3).Select(s=>s.Quantity).SingleAsync()==25,"Split transfer credits destination and preserves total atomically");
    Check((await Service(checkDb).GetTransactionHistoryAsync()).Where(t=>movedDestination.TransactionIds.Contains(t.TransactionId)).All(t=>t.DestinationWarehouseName!=null && t.SupplierName==null),"Transfer history identifies destination and excludes supplier");
  }
  var sameDestination=Request("Dispatch",1);sameDestination.ProductId=transferId;sameDestination.DestinationType="Warehouse";sameDestination.DestinationWarehouseId=1;
  Check(!(await Confirm(sameDestination)).Success,"Source and destination must differ");
  sameDestination.DestinationWarehouseId=-1;
  Check(!(await Confirm(sameDestination)).Success,"Unallocated inventory cannot be a dispatch destination");
  var external=Request("Dispatch",1);external.ProductId=transferId;external.WarehouseId=3;external.ExternalDestination="Customer test";
  var externalResult=await Confirm(external);
  await using(var checkDb=Context()) Check(externalResult.Success && await checkDb.InventoryTransactions.AnyAsync(t=>t.TransactionId==externalResult.TransactionId && t.ExternalDestination=="Customer test" && t.DestinationWarehouseId==null),"External dispatch stores recipient and reduces stock without warehouse destination");
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
