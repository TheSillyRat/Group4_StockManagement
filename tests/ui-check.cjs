const fs = require("node:fs");
const path = require("node:path");
let playwright;
try {
  playwright = require("playwright");
} catch {
  const cache = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
  for (const entry of fs.readdirSync(cache)) {
    const candidate = path.join(cache, entry, "node_modules", "playwright");
    if (fs.existsSync(candidate)) {
      playwright = require(candidate);
      break;
    }
  }
}
if (!playwright) throw new Error("Install Playwright to run UI checks.");
(async () => {
  const browser = await playwright.chromium.launch({
    executablePath:
      process.env.TEST_BROWSER_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const check = (ok, name) => {
      if (!ok) throw new Error("FAIL: " + name);
      console.log("PASS: " + name);
    };
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
    await page.getByText("Đã kết nối", { exact: true }).waitFor();
    check(
      (await page.locator(".collection-row").count()) >= 3,
      "Dashboard loads real product data",
    );
    const columns = await page.evaluate(() => ({
      sidebar: document.querySelector(".sidebar").getBoundingClientRect().width,
      right: document.querySelector(".profile-panel").getBoundingClientRect()
        .width,
      background: getComputedStyle(document.querySelector(".sidebar"))
        .backgroundColor,
    }));
    check(
      columns.sidebar === 240 &&
        columns.right === 280 &&
        columns.background === "rgb(74, 71, 163)",
      "Desktop has requested 240px purple sidebar and 280px right panel",
    );
    await page
      .locator(".collection-row")
      .nth(1)
      .locator(".row-product")
      .click();
    check(
      (await page.locator(".selected-detail h3").innerText()) === "Product B",
      "Selecting a product updates the stock detail panel",
    );
    check(
      (await page.locator("footer.bottom-bar").count()) === 0,
      "Bottom control bar has been removed",
    );
    await page
      .locator(".collection-row")
      .first()
      .getByRole("button", { name: "Đánh dấu Product A", exact: true })
      .click();
    await page.getByRole("button", { name: /^Đã đánh dấu/ }).click();
    check(
      (await page.locator(".collection-row").count()) === 1,
      "Favorites filter works",
    );
    await page.getByRole("button", { name: /^Tất cả sản phẩm/ }).click();
    await page
      .getByRole("textbox", { name: "Tìm kiếm sản phẩm", exact: true })
      .fill("Product B");
    check(
      (await page.locator(".collection-row").count()) === 1,
      "Global search filters products",
    );
    await page
      .getByRole("textbox", { name: "Tìm kiếm sản phẩm", exact: true })
      .fill("");
    fs.mkdirSync("tests/artifacts", { recursive: true });
    await page.screenshot({
      path: "tests/artifacts/dashboard-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Nhập / xuất kho", exact: true })
      .click();
    await page.getByRole("button", { name: "Nhập hàng", exact: true }).click();
    await page
      .getByRole("button", { name: "Phân tích yêu cầu", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Kiểm tra & xác nhận", exact: true })
      .waitFor({ timeout: 35000 });
    check(
      await page
        .getByRole("button", { name: "Xác nhận & lưu giao dịch", exact: true })
        .isEnabled(),
      "Live AI extraction reaches confirmation form without saving",
    );
    await page.locator("#review-type").selectOption("Dispatch");
    await page.locator("#review-quantity").fill("2147483647");
    check(
      await page
        .getByRole("button", { name: "Xác nhận & lưu giao dịch", exact: true })
        .isDisabled(),
      "Insufficient-stock confirmation is blocked",
    );
    await page.screenshot({
      path: "tests/artifacts/transaction-review.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Hủy giao dịch", exact: true })
      .click();
    const unknown = {
      productName: "Copper cable new",
      quantity: 12,
      unit: "roll",
      warehouseName: "Binh Tan Warehouse",
      warehouseId: 1,
      warehouseExists: true,
      productExists: false,
      productNotFound: true,
      isValid: false,
      isAmbiguous: false,
      supplierName: null,
    };
    let mockedType = "Dispatch",
      confirmCalls = 0,
      confirmedPayload;
    await page.route("**/api/inventory/ai-extract", (route) =>
      route.fulfill({
        json: {
          ...unknown,
          transactionType: mockedType,
          canCreateProduct: mockedType === "Receive",
        },
      }),
    );
    await page.route("**/api/inventory/confirm", (route) => {
      confirmCalls++;
      confirmedPayload = route.request().postDataJSON();
      return route.fulfill({
        json: {
          success: true,
          transactionId: 999,
          newStockQuantity: 12,
          message: "Đã tạo sản phẩm mới và nhập kho.",
        },
      });
    });
    await page
      .locator("#inventory-prompt")
      .fill("Xuất 12 roll Copper cable new từ Binh Tan Warehouse");
    await page
      .getByRole("button", { name: "Phân tích yêu cầu", exact: true })
      .click();
    await page.getByText("Sản phẩm không tồn tại", { exact: true }).waitFor();
    check(
      (await page
        .getByRole("button", { name: "Xác nhận & lưu giao dịch", exact: true })
        .isDisabled()) &&
        (await page
          .getByRole("button", { name: "Có, tạo sản phẩm mới", exact: true })
          .count()) === 0,
      "Unknown dispatch is blocked without offering creation",
    );
    mockedType = "Receive";
    await page
      .locator("#inventory-prompt")
      .fill("Nhập 12 roll Copper cable new vào Binh Tan Warehouse");
    await page
      .getByRole("button", { name: "Phân tích yêu cầu", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Có, tạo sản phẩm mới", exact: true })
      .waitFor();
    check(
      confirmCalls === 0 &&
        (await page
          .getByRole("button", {
            name: "Xác nhận & lưu giao dịch",
            exact: true,
          })
          .isDisabled()),
      "Unknown receive asks for consent without saving",
    );
    await page
      .getByRole("button", { name: "Không, chọn sản phẩm có sẵn", exact: true })
      .click();
    check(
      confirmCalls === 0 &&
        (await page.locator("#new-product-name").count()) === 0,
      "Declining new-product creation does not save",
    );
    await page
      .locator("#inventory-prompt")
      .fill("Nhập 12 roll Copper cable new vào Binh Tan Warehouse");
    await page
      .getByRole("button", { name: "Phân tích yêu cầu", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Có, tạo sản phẩm mới", exact: true })
      .click();
    check(
      confirmCalls === 0 &&
        (await page.locator("#new-product-name").inputValue()) ===
          "Copper cable new",
      "Accepting creation opens review without saving",
    );
    await page.locator("#review-unit").fill("");
    check(
      await page
        .getByRole("button", {
          name: "Xác nhận tạo sản phẩm & nhập kho",
          exact: true,
        })
        .isDisabled(),
      "New product requires a unit before confirmation",
    );
    await page.locator("#review-unit").fill("roll");
    check(
      await page
        .getByRole("button", {
          name: "Xác nhận tạo sản phẩm & nhập kho",
          exact: true,
        })
        .isDisabled(),
      "New receipt requires a supplier",
    );
    await page.locator("#review-supplier").selectOption("1");
    await page
      .getByRole("button", {
        name: "Xác nhận tạo sản phẩm & nhập kho",
        exact: true,
      })
      .click();
    await page
      .getByText("Đã ghi nhận giao dịch #999", { exact: true })
      .waitFor();
    check(
      confirmCalls === 1 &&
        confirmedPayload.createNewProduct === true &&
        confirmedPayload.productId === null &&
        confirmedPayload.productName === "Copper cable new" &&
        confirmedPayload.unit === "roll" &&
        confirmedPayload.quantity === 12,
      "Final confirmation sends explicit consent and new-product fields (mocked write only)",
    );
    Object.assign(unknown, {
      productName: "Product A",
      productId: 1,
      productExists: true,
      productNotFound: false,
      quantity: 20,
      unit: "box",
    });
    mockedType = "Dispatch";
    await page.route("**/api/inventory/dispatch-options?**", (route) => {
      const url = new URL(route.request().url()),
        quantity = Number(url.searchParams.get("quantity"));
      return route.fulfill({
        json: {
          productId: 1,
          warehouseId: 1,
          requestedQuantity: quantity,
          availableQuantity: 8,
          shortageQuantity: Math.max(0, quantity - 8),
          canFulfill: quantity <= 38,
          message:
            "Kho đã chọn chỉ có 8, còn thiếu 12. Bạn có muốn tạo thêm đơn xuất từ kho khác không?",
          alternatives: [
            {
              warehouseId: 2,
              warehouseName: "Thu Duc Warehouse",
              quantity: 30,
              unit: "box",
            },
          ],
          suggestedAllocations: [
            { warehouseId: 1, quantity: 8 },
            { warehouseId: 2, quantity: 12 },
          ],
        },
      });
    });
    await page
      .locator("#inventory-prompt")
      .fill("Dispatch 20 boxes Product A from Binh Tan Warehouse");
    await page
      .getByRole("button", { name: "Phân tích yêu cầu", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Có, tạo kế hoạch xuất từ các kho còn hàng",
        exact: true,
      })
      .waitFor();
    check(
      (await page.locator("#review-supplier").count()) === 0 &&
        (await page
          .getByRole("button", {
            name: "Xác nhận & lưu giao dịch",
            exact: true,
          })
          .isDisabled()),
      "Outbound form hides supplier and blocks shortage until consent",
    );
    await page
      .getByRole("button", {
        name: "Có, tạo kế hoạch xuất từ các kho còn hàng",
        exact: true,
      })
      .click();
    check(
      confirmCalls === 1,
      "Accepting split plan does not save additional orders",
    );
    await page.screenshot({
      path: "tests/artifacts/split-dispatch-plan.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Xác nhận 2 đơn xuất", exact: true })
      .click();
    await page
      .getByText("Đã ghi nhận giao dịch #999", { exact: true })
      .waitFor();
    check(
      confirmCalls === 2 &&
        confirmedPayload.confirmAdditionalDispatches === true &&
        confirmedPayload.dispatchAllocations.length === 2 &&
        confirmedPayload.supplierId === null,
      "Final confirmation sends explicit consent, both warehouse legs and no supplier",
    );
    await page.getByRole("button", { name: "Sản phẩm", exact: true }).click();
    await page
      .getByRole("button", { name: "Add Product", exact: true })
      .click();
    let productWrites = 0,
      productPayload,
      warehouseWrites = 0;
    await page.route("**/api/products", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      productWrites++;
      productPayload = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: { ...productPayload, productId: 9998 },
      });
    });
    await page.route("**/api/warehouses", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      warehouseWrites++;
      return route.fulfill({
        status: 201,
        json: {
          warehouseName: "Kho Đồng Nai thử AI",
          warehouseId: 9998,
          transactionCount: 0,
        },
      });
    });
    const sendCatalog = async (type, text) => {
      await page.locator(`#catalog-chat-${type}`).fill(text);
      const response = page.waitForResponse(
        (r) =>
          r.url().includes("/api/catalog/ai-extract") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Gửi yêu cầu cho AI", exact: true })
        .click();
      const result = await response;
      await page.waitForFunction(
        (id) => !document.getElementById(id)?.disabled,
        `catalog-chat-${type}`,
      );
      return result;
    };
    let catalogResponse = await sendCatalog(
      "product",
      "Thêm sản phẩm Giấy in thử nghiệm AI",
    );
    check(
      catalogResponse.ok() &&
        (await catalogResponse.json()).isComplete === false &&
        (await page
          .getByLabel("Product Name *", { exact: true })
          .inputValue()) === "Giấy in thử nghiệm AI",
      "Product chat fills name and asks for a missing unit",
    );
    catalogResponse = await sendCatalog(
      "product",
      "Đơn vị pack, tồn ban đầu 25",
    );
    check(
      catalogResponse.ok() &&
        (await page
          .getByLabel("Unit of Measure *", { exact: true })
          .inputValue()) === "pack" &&
        (await page
          .getByLabel("Current Stock Quantity *", { exact: true })
          .inputValue()) === "25" &&
        productWrites === 0,
      "Follow-up product chat fills unit and stock without creating a product",
    );
    await page.screenshot({
      path: "tests/artifacts/product-ai-chat.png",
      fullPage: true,
    });
    await page.route("**/api/catalog/ai-extract", (route) =>
      route.fulfill({
        status: 503,
        json: { message: "AI tạm thời không khả dụng" },
      }),
    );
    await sendCatalog("product", "Đổi tồn thành 30");
    check(
      (await page
        .getByRole("alert")
        .filter({ hasText: "AI tạm thời không khả dụng" })
        .isVisible()) &&
        (await page
          .getByLabel("Current Stock Quantity *", { exact: true })
          .inputValue()) === "25",
      "AI error keeps current product form values and allows retry/manual entry",
    );
    await page.unroute("**/api/catalog/ai-extract");
    await page
      .getByLabel("Current Stock Quantity *", { exact: true })
      .fill("26");
    await page
      .getByLabel("Nhà cung cấp nhập ban đầu *", { exact: true })
      .selectOption("1");
    await page
      .getByLabel("Kho nhập ban đầu *", { exact: true })
      .selectOption("1");
    await page
      .getByRole("button", { name: "Create Product", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    check(
      productWrites === 1 &&
        productPayload.productName === "Giấy in thử nghiệm AI" &&
        productPayload.stockQuantity === 26,
      "Product is saved only on explicit confirmation and honors manual edits (mocked write)",
    );
    await page
      .getByRole("combobox", { name: "Lọc sản phẩm theo kho", exact: true })
      .selectOption("-1");
    await page
      .getByRole("columnheader", { name: "TỒN TẠI KHO", exact: true })
      .waitFor();
    check(
      await page
        .locator(".warehouse-stock-tags")
        .first()
        .innerText()
        .then((t) => t.includes("Kho chờ phân bổ")),
      "Product catalog filters and displays balances per warehouse",
    );
    await page
      .getByRole("button", { name: "Xem tồn", exact: true })
      .first()
      .click();
    await page
      .getByRole("region", { name: "Chi tiết tồn sản phẩm", exact: true })
      .waitFor();
    check(
      await page
        .getByRole("region", { name: "Chi tiết tồn sản phẩm", exact: true })
        .innerText()
        .then((t) => t.includes("Kho chờ phân bổ")),
      "Product stock inspection shows actual warehouse breakdown",
    );
    await page
      .getByRole("button", { name: "Nhà cung cấp", exact: true })
      .click();
    let supplierRows = await (
      await page.request.get("http://localhost:5173/api/suppliers")
    ).json();
    let supplierWrites = 0;
    await page.route("**/api/suppliers", async (route) => {
      if (route.request().method() === "POST") {
        const input = route.request().postDataJSON();
        supplierWrites++;
        const row = { supplierId: 9997, supplierName: input.supplierName };
        supplierRows.push(row);
        return route.fulfill({ status: 201, json: row });
      }
      return route.fulfill({ json: supplierRows });
    });
    await page
      .getByRole("button", { name: "Thêm nhà cung cấp", exact: true })
      .click();
    await page
      .getByLabel("Tên nhà cung cấp *", { exact: true })
      .fill("Nhà cung cấp kiểm thử UI");
    await page
      .getByRole("button", { name: "Lưu nhà cung cấp", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    check(
      supplierWrites === 1,
      "Supplier management creates a supplier only after confirmation (mocked write)",
    );
    await page.getByRole("button", { name: "Kho hàng", exact: true }).click();
    await page
      .getByRole("button", { name: "Thêm kho hàng", exact: true })
      .click();
    check(await page.getByRole("dialog").isVisible(), "Warehouse dialog opens");
    catalogResponse = await sendCatalog(
      "warehouse",
      "Thêm kho mới tên Kho Đồng Nai thử AI",
    );
    check(
      catalogResponse.ok() &&
        (await page
          .getByLabel("Tên kho hàng *", { exact: true })
          .inputValue()) === "Kho Đồng Nai thử AI" &&
        warehouseWrites === 0,
      "Warehouse AI chat fills the name without saving",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "tests/artifacts/warehouse-ai-chat-mobile.png",
      fullPage: true,
    });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "Warehouse chat fits on mobile",
    );
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.keyboard.press("Escape");
    check(
      (await page.getByRole("dialog").count()) === 0,
      "Escape closes warehouse dialog",
    );
    await page
      .getByRole("row")
      .filter({ hasText: "Kho chờ phân bổ" })
      .getByRole("button", { name: "Xem hàng trong kho", exact: true })
      .click();
    const stockRegion = page.getByRole("region", {
      name: "Hàng hóa theo kho",
      exact: true,
    });
    await stockRegion
      .getByRole("button", { name: "Phân bổ vào kho", exact: true })
      .first()
      .waitFor();
    check(
      (await stockRegion.getByRole("row").count()) > 1,
      "Warehouse management lists actual products and balances",
    );
    let transferPayload;
    await page.route("**/api/inventory/transfer", (route) => {
      transferPayload = route.request().postDataJSON();
      return route.fulfill({
        json: { success: true, message: "Đã chuyển/phân bổ hàng." },
      });
    });
    await stockRegion
      .getByRole("button", { name: "Phân bổ vào kho", exact: true })
      .first()
      .click();
    await page.getByLabel("Kho nhận *", { exact: true }).selectOption("1");
    await page.getByLabel("Số lượng chuyển *", { exact: true }).fill("1");
    await page
      .getByRole("button", { name: "Xác nhận chuyển kho", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    check(
      transferPayload.fromWarehouseId === -1 &&
        transferPayload.toWarehouseId === 1 &&
        transferPayload.quantity === 1,
      "Explicit allocation sends source, destination and quantity without changing total (mocked write)",
    );
    await page
      .getByRole("button", { name: "Lịch sử giao dịch", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Nhật ký giao dịch", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "tests/artifacts/dashboard-mobile.png",
      fullPage: true,
    });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "Mobile has no horizontal page overflow",
    );
    check(errors.length === 0, "No browser runtime errors");
    console.log("ALL UI CHECKS PASSED");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
