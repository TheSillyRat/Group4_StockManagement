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
      (await page.locator(".now-selected strong").innerText()) === "Product B",
      "Selecting a product updates bottom controls",
    );
    await page
      .getByRole("button", { name: "Sản phẩm tiếp theo", exact: true })
      .click();
    check(
      (await page.locator(".now-selected strong").innerText()) === "Product C",
      "Bottom next control works",
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
    await page.getByRole("button", { name: "Kho hàng", exact: true }).click();
    await page
      .getByRole("button", { name: "Thêm kho hàng", exact: true })
      .click();
    check(await page.getByRole("dialog").isVisible(), "Warehouse dialog opens");
    await page.keyboard.press("Escape");
    check(
      (await page.getByRole("dialog").count()) === 0,
      "Escape closes warehouse dialog",
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
