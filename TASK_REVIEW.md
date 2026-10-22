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

## Luồng sản phẩm chưa tồn tại

- `POST /api/inventory/ai-extract` đối soát tên thực tế với database, trả `productNotFound`, `canCreateProduct` và `validationMessage`. Các ID và cờ do AI tự trả về được xóa trước khi đối soát.
- Xuất sản phẩm chưa tồn tại: báo lỗi và chặn lưu, không cho tạo mới trong giao dịch xuất.
- Nhập sản phẩm chưa tồn tại: hỏi có muốn tạo mới; chọn Có chỉ mở form kiểm tra, chưa ghi dữ liệu. Tên tối đa 200 ký tự và đơn vị tối đa 50 ký tự là bắt buộc.
- Xác nhận cuối gửi `createNewProduct: true`, `productName`, `unit`, `quantity` và kho. Không gửi cờ này thì API không tự tạo sản phẩm.
- Tạo Product (tồn ban đầu 0), cập nhật tồn và ghi InventoryTransaction trong cùng transaction. Lỗi ghi lịch sử sẽ rollback cả Product mới.
- Kiểm tra lại tên trong transaction SERIALIZABLE tránh hai xác nhận đồng thời tạo trùng sản phẩm. Nếu sản phẩm đã tồn tại, yêu cầu làm mới và chọn bản ghi có sẵn.
- Đã kiểm chứng bằng database tạm: thiếu consent, xuất sản phẩm lạ, thiếu đơn vị, trùng tên, tạo+nhập thành công, rollback khi lỗi, và tạo cùng tên đồng thời.
- Đã kiểm tra trình duyệt: báo không tồn tại khi xuất, hỏi Có/Không khi nhập, từ chối không ghi dữ liệu, chấp nhận chỉ mở form, thiếu đơn vị chặn lưu, xác nhận gửi đúng payload (mock riêng thao tác ghi).

## Chat AI trong form thêm sản phẩm và kho

- Endpoint `POST /api/catalog/ai-extract` nhận `entityType` (`product` hoặc `warehouse`) và tối đa 12 tin nhắn user/assistant. Không ghi dữ liệu trong bước phân tích.
- Form thêm sản phẩm: trích tên, đơn vị và tồn ban đầu; thiếu đơn vị thì hỏi bổ sung. Không lấy số trong tên sản phẩm làm số lượng. Tồn ban đầu mặc định 0 nếu không được nhắc đến.
- Form thêm kho: trích tên kho theo các trường mà database hỗ trợ.
- Chat hỗ trợ bổ sung/chỉnh sửa qua nhiều lượt; tên trùng được kiểm tra với database. Thông tin AI điền có thể sửa tay trước khi bấm lưu.
- Lỗi AI giữ lại dữ liệu biểu mẫu và nội dung đang gửi để thử lại. Đóng modal sẽ hủy request đang chạy. Không cho lưu trong lúc AI phân tích.
- Đã kiểm tra service bằng HTTP giả lập: thiếu đơn vị, giữ lịch sử hội thoại, số lượng âm, bỏ các trường ngoài phạm vi kho, không sinh giao dịch.
- Đã kiểm tra trình duyệt với AI thật: điền tên sản phẩm rồi bổ sung đơn vị/tồn qua lượt chat tiếp theo; điền tên kho. Thao tác lưu được mock để xác minh chỉ gửi khi người dùng bấm xác nhận, bao gồm sửa tay sau AI. Đã kiểm tra lỗi 503 giữ dữ liệu và bố cục chat mobile.
- API tên trùng trả `alreadyExists: true`; loại đối tượng không hỗ trợ, danh sách tin nhắn rỗng và role system do client gửi bị từ chối HTTP 400.
