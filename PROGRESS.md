# Báo Cáo Tiến Độ Dự Án Quản Lý Kho (Group 4 - Stock Management)

Ngày cập nhật: 2026-10-22
Phạm vi thực hiện: Phân hệ của **Tài** (Member 2) và **Sang Huỳnh** (Member 3)

---

## 1. Tổng Quan Tiến Độ Phân Hệ

```text
[Sang Huỳnh - Member 3] AI Extraction & Validation:    100% HOÀN THÀNH (5/5 Tasks)
[Tài - Member 2]        Transactions & Consistency:       100% HOÀN THÀNH (5/5 Tasks)
```

---

## 2. Chi Tiết Nhiệm Vụ Phân Hệ: Sang Huỳnh (Member 3 - AI & Gemini Service)

Mục tiêu: Chuyển đổi yêu cầu nhập/xuất kho từ ngôn ngữ tự nhiên thành dữ liệu giao dịch cấu trúc JSON, phát hiện dữ liệu thiếu/mơ hồ và đối soát tồn tại trong cơ sở dữ liệu SQL Server.

| Mã Task | Hạng mục công việc | Mô tả kỹ thuật & Kết quả thực hiện | Tiến độ | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **SH-01** | Cấu hình Gemini Client & Key Management | Đọc `GEMINI_API_KEY` từ biến môi trường hoặc `appsettings.json`. Khởi tạo `GoogleAI` model `gemini-1.5-flash` qua thư viện `Mscc.GenerativeAI`. Tích hợp bộ phân tích quy tắc dự phòng cục bộ để hệ thống luôn hoạt động ổn định kể cả khi mất kết nối mạng hoặc chưa cấp key. | 100% | Hoàn thành |
| **SH-02** | Kỹ thuật Prompt trích xuất JSON | Thiết lập prompt chuẩn hóa yêu cầu mô hình AI trích xuất đúng cấu trúc JSON gồm: `transactionType` (Receive/Dispatch), `productName`, `supplierName`, `warehouseName`, `quantity`, `unit`, `isAmbiguous`, `clarificationMessage`. | 100% | Hoàn thành |
| **SH-03** | Xử lý Mơ hồ (Ambiguity Handling) | Tự động phát hiện các yêu cầu thiếu thông số bắt buộc (số lượng, tên sản phẩm, kho đích cụ thể, ví dụ *"Send some items to warehouse"*). Đặt cờ `isAmbiguous = true`, cung cấp thông điệp làm rõ cụ thể và ngăn chặn ghi dữ liệu không hợp lệ vào DB. | 100% | Hoàn thành |
| **SH-04** | Reference Validation (Kiểm tra tham chiếu) | Kiểm tra trực tiếp tên thực thể trích xuất được với cơ sở dữ liệu SQL Server (`Products`, `Warehouses`, `Suppliers`). Gán các cờ `productExists`, `warehouseExists`, `supplierExists` và tự động ánh xạ sang các khóa ngoại `productId`, `warehouseId`, `supplierId`. | 100% | Hoàn thành |
| **SH-05** | Triển khai Endpoint `POST /api/inventory/ai-extract` | Tiếp nhận payload `{ prompt: string }`, gọi chu trình extraction kết hợp validation và trả về đối tượng `ExtractedTransactionDto` chuẩn hóa cho giao diện người dùng. | 100% | Hoàn thành |

---

## 3. Chi Tiết Nhiệm Vụ Phân Hệ: Tài (Member 2 - Backend Logic, Consistency & Transactions)

Mục tiêu: Đảm bảo tính nhất quán dữ liệu ACID khi ghi nhận giao dịch kho và cập nhật số lượng tồn kho tức thời.

| Mã Task | Hạng mục công việc | Mô tả kỹ thuật & Kết quả thực hiện | Tiến độ | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **TA-01** | Giao dịch Cơ sở dữ liệu (Database Transaction) | Sử dụng `await _context.Database.BeginTransactionAsync()` để bọc toàn bộ thao tác cập nhật bảng `Products` và lưu bản ghi vào `InventoryTransactions`. Đảm bảo rollback ngay khi có bất kỳ ngoại lệ nào xảy ra, tránh phân mảnh dữ liệu. | 100% | Hoàn thành |
| **TA-02** | Logic Cập nhật Tồn kho (Stock Updates Logic) | Lệnh `Receive`: Tăng tồn kho (`StockQuantity += Quantity`). Lệnh `Dispatch`: Kiểm tra số lượng tồn hiện có, nếu không đủ thì từ chối và rollback giao dịch; nếu đủ thì trừ tồn kho (`StockQuantity -= Quantity`). | 100% | Hoàn thành |
| **TA-03** | Kiểm tra Tính hợp lệ Dữ liệu (Data Validation) | Kiểm tra số lượng `Quantity > 0`, phân loại giao dịch hợp lệ (`Receive` / `Dispatch`), kiểm tra sự tồn tại của Product và Warehouse trong DB trước khi mở transaction. | 100% | Hoàn thành |
| **TA-04** | Triển khai Endpoint `POST /api/inventory/confirm` | Xử lý xác nhận giao dịch từ người dùng. Trả về HTTP 200 kèm số dư tồn kho mới khi thành công, hoặc HTTP 400 kèm thông báo từ chối chi tiết (ví dụ: tồn kho không đủ). | 100% | Hoàn thành |
| **TA-05** | Triển khai Endpoint `GET /api/inventory/history` | Truy vấn toàn bộ bảng `InventoryTransactions` kèm `Include` thông tin chi tiết của `Product`, `Supplier`, `Warehouse`, sắp xếp giảm dần theo thời gian tạo (`CreatedAt DESC`). | 100% | Hoàn thành |

---

## 4. Bảng Kết Quả Kiểm Thử Nghiệm Thu (Verification Test Cases)

Đã thực thi kiểm thử tích hợp tự động qua API trên hệ thống thực tế (Database SQL Server `InventoryAiDb`):

| Test Case | Đầu vào (Prompt / Request) | Kết quả Phân tích & AI Extract | Kết quả Xác nhận & Tồn kho | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01 (Receive)** | *"Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse."* | - Type: `Receive`<br>- Product: `Product A` (ID: 1)<br>- Supplier: `Supplier X` (ID: 1)<br>- Warehouse: `Binh Tan Warehouse` (ID: 1)<br>- Quantity: 20, Unit: `box`<br>- References Verified: `true` | Giao dịch #1 tạo thành công.<br>Tồn kho `Product A`: 100 -> **120 box**. | Đạt (Pass) |
| **TC-02 (Dispatch)** | *"Dispatch 15 boxes of Product A from Binh Tan Warehouse."* | - Type: `Dispatch`<br>- Product: `Product A` (ID: 1)<br>- Supplier: `null`<br>- Warehouse: `Binh Tan Warehouse` (ID: 1)<br>- Quantity: 15, Unit: `box`<br>- References Verified: `true` | Giao dịch #2 tạo thành công.<br>Tồn kho `Product A`: 120 -> **105 box**. | Đạt (Pass) |
| **TC-03 (Alternative Unit)** | *"Receive 50 kg of Product C from Supplier Y into Thu Duc Warehouse."* | - Type: `Receive`<br>- Product: `Product C` (ID: 3)<br>- Supplier: `Supplier Y` (ID: 2)<br>- Warehouse: `Thu Duc Warehouse` (ID: 2)<br>- Quantity: 50, Unit: `kg`<br>- References Verified: `true` | Giao dịch #3 tạo thành công.<br>Tồn kho `Product C`: 200 -> **250 kg**. | Đạt (Pass) |
| **TC-04 (Ambiguous)** | *"Send some items to warehouse."* | - `isAmbiguous = true`<br>- `isValid = false`<br>- Message: *"Request is ambiguous. Missing or unclear: product name, quantity, warehouse name. Please specify the exact product, quantity, and warehouse."* | Ngăn chặn commit dữ liệu không hợp lệ. Giao diện hiển thị thông báo yêu cầu bổ sung thông tin. | Đạt (Pass) |
| **TC-05 (Negative / Over-dispatch)** | Xuất 9999 boxes `Product A` khi kho chỉ có 105 boxes. | N/A (Trực tiếp kiểm thử ACID rollback trên endpoint `/api/inventory/confirm`). | Trả về HTTP 400 Bad Request: *"Insufficient inventory for 'Product A'. Current available: 105 box, Requested dispatch: 9999 box."*<br>Rollback thành công, tồn kho giữ nguyên **105 box**. | Đạt (Pass) |
| **TC-06 (History Log)** | `GET /api/inventory/history` | N/A | Trả về danh sách 3 giao dịch (#3, #2, #1) xếp theo thời gian mới nhất trước, đầy đủ tên sản phẩm, nhà cung cấp, kho và đơn vị tính. | Đạt (Pass) |

---

## 5. Hướng Dẫn Vận Hành

### Chạy Backend Web API (.NET 10)
```powershell
cd D:\Project\Group4_StockManagement\webAPI
$env:DOTNET_ROOT = "$env:LOCALAPPDATA\Microsoft\dotnet"
$env:PATH = "$env:DOTNET_ROOT;$env:PATH"
dotnet run --launch-profile "http"
```
API lắng nghe tại: `http://localhost:5000`  
Swagger UI tại: `http://localhost:5000/swagger`

### Chạy Frontend React (Vite)
```powershell
cd D:\Project\Group4_StockManagement\webapp
npm run dev
```
Giao diện người dùng tại: `http://localhost:5173`
