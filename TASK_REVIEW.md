# Kiểm tra nghiệp vụ quản lý kho

## Nghiệp vụ hiện tại

- Nhập hàng là nhận từ **nhà cung cấp vào một kho thực tế**. Supplier bắt buộc ở cả giao diện và API; có màn hình thêm/sửa/xóa Supplier và thêm nhanh ngay trong form nhập.
- Xuất hàng là **xuất từ kho ra ngoài**. Form ẩn Supplier; backend bỏ Supplier khỏi đơn xuất, kể cả client gửi lên.
- Tồn thực tế nằm trong `WarehouseStocks`, khóa chính `(ProductId, WarehouseId)`, có check constraint không âm. `Product.StockQuantity` là tổng tồn được cập nhật trong cùng transaction với tồn từng kho và lịch sử.
- Sản phẩm chưa tồn tại: xuất bị từ chối; nhập hỏi đồng ý tạo mới, sau đó tạo Product, nhận hàng từ Supplier vào kho và lưu lịch sử cùng lúc.
- Khi kho xuất thiếu hàng, API/AI-extract trả số có, số thiếu, kho khác còn hàng và kế hoạch gợi ý. Không tự tạo đơn. Người dùng đồng ý kế hoạch, xem rõ số lượng từng kho, rồi xác nhận cuối để tạo các đơn xuất (tối đa 20 kho).
- Đơn tách phải có tổng bằng yêu cầu, số lượng dương, kho không trùng và `confirmAdditionalDispatches=true`. Nếu một kho không đủ khi ghi, mọi đơn và số dư trong lần xác nhận được rollback.
- Màn hình Product lọc theo Warehouse, hiển thị tồn từng kho và chi tiết số dư. Không được sửa trực tiếp số tồn trong form chỉnh sửa metadata.
- Tạo Product có tồn ban đầu > 0 bắt buộc Supplier và kho nhận, tạo kèm đơn nhập. Product số tồn 0 chỉ tạo danh mục.
- Màn hình Warehouse hiển thị sản phẩm, số lượng theo kho; hỗ trợ chuyển kho/phân bổ với lịch sử `TransferOut` / `TransferIn`. Chuyển kho không thay đổi tổng tồn.
- Supplier đã có lịch sử nhập không xóa được; FK ở database cũng ngăn xóa để giữ tham chiếu lịch sử.
- Khung chat AI ở form thêm Product/Warehouse điền thông tin, hỗ trợ nhiều lượt và sửa tay. Phân tích không tự lưu.
- Dashboard giữ sidebar tím 240px và cột thông tin 280px. Header đã thu gọn. `footer.bottom-bar`, các điều khiển và CSS liên quan đã được bỏ.

## Nâng cấp database cũ

Chạy `dotnet ef database update --project webAPI/webAPI.csproj`.

Tồn cũ chỉ có số tổng, không đủ dữ liệu để suy ra vị trí vật lý chính xác. Migration giữ nguyên số dư hiện có và đặt vào **Kho chờ phân bổ** (ID -1), không viết lại lịch sử. Vào Kho hàng → Kho chờ phân bổ → Xem hàng trong kho → Phân bổ vào kho để chọn vị trí thực tế. Kho chờ phân bổ không được dùng trực tiếp để nhập/xuất ra ngoài.

Migration seed danh mục cũ đã được làm an toàn khi ID demo trùng bản ghi người dùng: bỏ qua ID/tên đã tồn tại, không ghi đè tên hoặc số tồn. Rollback phần seed không tự xóa dữ liệu danh mục.

Migrations mới: `WarehouseInventory`, `ProtectSupplierHistory`. Môi trường đang dùng đã được áp dụng cả hai.

## API chính

| Endpoint | Chức năng |
| --- | --- |
| `GET /api/products?warehouseId=...` | Danh mục, tổng/bộ lọc kho, breakdown `warehouseStocks` |
| `GET /api/products/{id}/stock` | Tồn sản phẩm theo từng kho |
| `GET /api/warehouses/{id}/stock` | Hàng trong một kho |
| `GET/POST /api/suppliers`, `PUT/DELETE /api/suppliers/{id}` | Quản lý nguồn cung |
| `POST /api/inventory/ai-extract` | Trích xuất và đối soát dữ liệu, cảnh báo tồn tại kho |
| `GET /api/inventory/dispatch-options?productId=...&warehouseId=...&quantity=...` | Kiểm tra tồn và gợi ý kế hoạch |
| `POST /api/inventory/confirm` | Lưu đơn nhập/xuất; mảng `dispatchAllocations` cần đồng ý rõ ràng |
| `POST /api/inventory/transfer` | Chuyển/phân bổ với productId, fromWarehouseId, toWarehouseId, quantity |
| `GET /api/inventory/history` | Lịch sử nhập/xuất/chuyển, mới nhất trước |
| `POST /api/catalog/ai-extract` | Chat điền biểu mẫu, không ghi dữ liệu |

## Kiểm chứng

- Frontend: `npm.cmd --prefix webapp run build`.
- Backend/database: `dotnet run --project tests/InventoryChecks/InventoryChecks.csproj`.
- Trình duyệt: `node tests/ui-check.cjs` (backend 5000, frontend 5173, cần Playwright và Edge hoặc `TEST_BROWSER_PATH`).

Backend checks dùng database LocalDB tên ngẫu nhiên `StockFlow_Checks_<GUID>`, xóa trong finally; không thay đổi dữ liệu nghiệp vụ đang dùng. Bao phủ:

- Migration giữ bản ghi user trùng ID seed và giữ đúng tồn tổng trong kho chờ phân bổ.
- Nhập/xuất, tham chiếu không hợp lệ, Supplier bắt buộc, đơn vị/số lượng, chống tràn số.
- Xuất đồng thời, tách đơn có/không consent, sai số lượng từng leg, một leg thiếu tồn, tách đơn đồng thời.
- Lỗi ghi lịch sử rollback tồn; lỗi tạo mới rollback cả Product; lỗi chuyển kho rollback nguồn/đích.
- Chuyển kho và phân bổ giữ nguyên tổng; tổng Product luôn bằng tổng WarehouseStocks.
- Không thể xóa Supplier đã được tham chiếu; API Product không cho sửa tồn trực tiếp.
- Các trường hợp chat nhiều lượt, thiếu đơn vị, số lượng âm và trường ngoài phạm vi.

Browser checks dùng AI thật để điền Product/Warehouse và tới form xác nhận; thao tác ghi được mock để không tạo dữ liệu test trong database ứng dụng. Kiểm tra form xuất không có Supplier, thiếu tồn bị chặn, đồng ý kế hoạch chưa ghi, xác nhận gửi đúng từng kho và consent; quản lý Supplier, lọc Product theo kho, xem hàng trong kho, phân bổ; lỗi AI giữ dữ liệu; modal và mobile không tràn ngang; không có lỗi JavaScript.

## Giới hạn

Số lượng là số nguyên; chưa có quy đổi đơn vị. Gợi ý đơn xuất dùng tồn database hiện tại, được kiểm tra lại khi xác nhận, không đặt giữ hàng trong lúc người dùng đang xem.
