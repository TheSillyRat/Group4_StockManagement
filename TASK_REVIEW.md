# Kiểm tra phân hệ giao dịch và giao diện

## Trạng thái 5 task

| Task | Trạng thái | Thực hiện |
| --- | --- | --- |
| Database Transaction: lưu giao dịch cùng cập nhật tồn | Đã có, đã củng cố | `InventoryService.ConfirmAndSaveTransactionAsync`: UPDATE tồn và INSERT lịch sử trong cùng database transaction; rollback nếu INSERT lỗi. |
| Stock Updates Logic | Đã có, đã sửa cạnh tranh | Nhập cộng tồn, xuất trừ tồn. SQL UPDATE có điều kiện ngăn xuất vượt tồn khi hai yêu cầu đồng thời; chặn tràn số nguyên khi nhập. |
| Data Validation | Đã có, đã bổ sung | Số lượng nguyên dương, loại Receive/Dispatch, sản phẩm/kho/nhà cung cấp tồn tại, đơn vị khớp. Regex dự phòng từ chối số âm và số thập phân không hỗ trợ. |
| Confirm API | Đã có | `POST /api/inventory/confirm`; UI chỉ gọi sau khi kiểm tra và người dùng bấm xác nhận. Trả ID giao dịch và số dư mới. |
| Transaction History API | Đã có | `GET /api/inventory/history`; thông tin sản phẩm, nhà cung cấp, kho, số lượng và thời gian; mới nhất trước, ID làm khóa sắp xếp phụ. |

## Kiểm chứng backend

Chạy `dotnet run --project tests/InventoryChecks/InventoryChecks.csproj` với quyền truy cập SQL Server LocalDB.

Bộ kiểm tra tạo database `StockFlow_Checks_<GUID>` riêng và xóa trong `finally`. Không sử dụng database ứng dụng.

Đã đạt:
- Nhập +20 và xuất -15; số dư và bản ghi lịch sử khớp.
- Từ chối số lượng 0/âm, sai loại, thiếu tồn, tham chiếu không tồn tại, sai đơn vị và tràn số.
- Các yêu cầu bị từ chối không thay đổi tồn hoặc lịch sử.
- Hai DbContext đọc cùng số dư cũ rồi xuất đồng thời: chỉ một yêu cầu đủ tồn được chấp nhận.
- Trigger chỉ trong database kiểm tra buộc INSERT lịch sử thất bại: UPDATE tồn được hoàn tác.
- Lịch sử có đủ tham chiếu và sắp xếp mới nhất trước.
- Parser dự phòng từ chối số âm/thập phân.

## Kiểm chứng trình duyệt

Chạy backend cổng 5000, frontend Vite cổng 5173, sau đó `node tests/ui-check.cjs` (cần Playwright và Edge, hoặc chỉ định `TEST_BROWSER_PATH`).

Đã đạt:
- Sidebar desktop rộng 240px, màu #4A47A3; cột phải rộng 280px.
- Tải sản phẩm thực tế; chọn sản phẩm cập nhật thanh dưới đáy.
- Nút chuyển sản phẩm, đánh dấu và tìm kiếm hoạt động.
- Trích xuất qua AI thật đến biểu mẫu xác nhận, không ghi giao dịch.
- UI chặn xác nhận khi số lượng xuất vượt tồn.
- Modal kho mở và đóng bằng Escape.
- Viewport mobile 390px không tràn ngang toàn trang.
- Không có lỗi JavaScript runtime.

Frontend: `npm.cmd --prefix webapp run build`.
API smoke check: GET products/history qua Vite proxy trả 200; confirm số lượng 0 trả 400.

## Phạm vi dữ liệu

Tồn kho hiện là tổng toàn hệ thống trên Product, chưa tách số dư theo từng kho. Giao diện ghi rõ phạm vi này. Nhà cung cấp là tùy chọn; nếu được gửi thì phải tồn tại. Số lượng là số nguyên, chưa hỗ trợ quy đổi đơn vị.

Theme được triển khai bằng React/CSS và SVG nội bộ theo mô tả bố cục người dùng cung cấp. Trang preview Envato trả 403 nên không nhập mã template từ Envato.
