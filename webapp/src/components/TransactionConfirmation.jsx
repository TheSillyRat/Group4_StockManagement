import React, { useState } from "react";
import Icon from "./Icon";
export default function TransactionConfirmation({
  extractedData,
  onConfirm,
  onCancel,
  isSubmitting,
  products = [],
  warehouses = [],
  suppliers = [],
}) {
  const [form, setForm] = useState(extractedData);
  const product = products.find(
    (p) =>
      p.productId === Number(form.productId) ||
      (!form.productId &&
        p.productName.toLowerCase() ===
          (form.productName || "").trim().toLowerCase()),
  );
  const warehouse = warehouses.find(
    (w) =>
      w.warehouseId === Number(form.warehouseId) ||
      (!form.warehouseId &&
        w.warehouseName.toLowerCase() ===
          (form.warehouseName || "").trim().toLowerCase()),
  );
  const supplier = suppliers.find(
    (s) =>
      s.supplierId === Number(form.supplierId) ||
      (!form.supplierId &&
        s.supplierName.toLowerCase() ===
          (form.supplierName || "").trim().toLowerCase()),
  );
  const qty = Number(form.quantity);
  const isDispatch = form.transactionType === "Dispatch";
  const validType = ["Receive", "Dispatch"].includes(form.transactionType);
  const insufficient = isDispatch && product && qty > product.stockQuantity;
  const wrongUnit =
    product &&
    form.unit &&
    form.unit.trim().toLowerCase() !== product.unit.toLowerCase();
  const unknownSupplier = (form.supplierId || form.supplierName) && !supplier;
  const valid =
    validType &&
    product &&
    warehouse &&
    Number.isInteger(qty) &&
    qty > 0 &&
    qty <= 2147483647 &&
    !insufficient &&
    !wrongUnit &&
    !unknownSupplier;
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = (e) => {
    e.preventDefault();
    if (!valid || isSubmitting) return;
    onConfirm({
      transactionType: form.transactionType,
      productId: product.productId,
      warehouseId: warehouse.warehouseId,
      supplierId: supplier?.supplierId || null,
      quantity: qty,
      unit: product.unit,
    });
  };
  return (
    <section className="card review-card">
      <div className="card-header">
        <div className="section-heading">
          <span className="section-icon">
            <Icon name="check" />
          </span>
          <div>
            <h2 className="card-title">Kiểm tra & xác nhận</h2>
            <p className="card-subtitle">
              Kiểm tra các trường bên dưới. Tồn kho chưa thay đổi.
            </p>
          </div>
        </div>
        <span className={`badge ${valid ? "badge-matched" : "badge-neutral"}`}>
          {valid ? "Sẵn sàng xác nhận" : "Cần kiểm tra thông tin"}
        </span>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={isSubmitting}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="review-type">Loại giao dịch *</label>
              <select
                id="review-type"
                value={form.transactionType || ""}
                onChange={(e) => update("transactionType", e.target.value)}
                required
              >
                <option value="" disabled>
                  Chọn loại giao dịch
                </option>
                <option value="Receive">Nhập kho</option>
                <option value="Dispatch">Xuất kho</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="review-product">Sản phẩm *</label>
              <select
                id="review-product"
                value={product?.productId || ""}
                required
                onChange={(e) => {
                  const p = products.find(
                    (x) => x.productId === Number(e.target.value),
                  );
                  setForm((f) => ({
                    ...f,
                    productId: p?.productId,
                    productName: p?.productName || "",
                    unit: p?.unit || "",
                  }));
                }}
              >
                <option value="" disabled>
                  {form.productName
                    ? `${form.productName} — cần chọn lại`
                    : "Chọn sản phẩm"}
                </option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="review-warehouse">Kho hàng *</label>
              <select
                id="review-warehouse"
                value={warehouse?.warehouseId || ""}
                required
                onChange={(e) => {
                  const w = warehouses.find(
                    (x) => x.warehouseId === Number(e.target.value),
                  );
                  setForm((f) => ({
                    ...f,
                    warehouseId: w?.warehouseId,
                    warehouseName: w?.warehouseName || "",
                  }));
                }}
              >
                <option value="" disabled>
                  {form.warehouseName
                    ? `${form.warehouseName} — cần chọn lại`
                    : "Chọn kho hàng"}
                </option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="review-quantity">Số lượng *</label>
              <input
                id="review-quantity"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                required
                value={form.quantity ?? ""}
                onChange={(e) => update("quantity", e.target.value)}
                aria-invalid={insufficient || undefined}
              />
            </div>
            <div className="form-field">
              <label htmlFor="review-unit">Đơn vị tính</label>
              <input
                id="review-unit"
                readOnly
                value={product?.unit || form.unit || "—"}
              />
              <small>Theo đơn vị chuẩn của sản phẩm.</small>
            </div>
            <div className="form-field">
              <label htmlFor="review-supplier">
                Nhà cung cấp <span>Tùy chọn</span>
              </label>
              <select
                id="review-supplier"
                value={supplier?.supplierId || ""}
                onChange={(e) => {
                  const s = suppliers.find(
                    (x) => x.supplierId === Number(e.target.value),
                  );
                  setForm((f) => ({
                    ...f,
                    supplierId: s?.supplierId || null,
                    supplierName: s?.supplierName || null,
                  }));
                }}
              >
                <option value="">
                  {unknownSupplier
                    ? `${form.supplierName || "Không tìm thấy"} — chọn lại hoặc bỏ trống`
                    : "Không có nhà cung cấp"}
                </option>
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.supplierName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
        {wrongUnit && (
          <div className="alert alert-warning" role="alert">
            <Icon name="alert" />
            <div>
              Đơn vị AI trích xuất là “{form.unit}”, khác đơn vị chuẩn “
              {product.unit}”.{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => update("unit", product.unit)}
                disabled={isSubmitting}
              >
                Dùng đơn vị {product.unit}
              </button>
            </div>
          </div>
        )}
        {unknownSupplier && (
          <p className="field-error" role="alert">
            Nhà cung cấp chưa có trong danh mục. Vui lòng chọn lại hoặc bỏ
            trống.
          </p>
        )}
        {product && validType && (
          <div className={`stock-preview ${insufficient ? "invalid" : ""}`}>
            <div>
              <small>TỒN HIỆN TẠI · TOÀN HỆ THỐNG</small>
              <strong>
                {product.stockQuantity.toLocaleString("vi-VN")}{" "}
                <span>{product.unit}</span>
              </strong>
            </div>
            <Icon name="arrow" />
            <div>
              <small>{isDispatch ? "XUẤT KHO" : "NHẬP KHO"}</small>
              <strong className={isDispatch ? "text-warning" : "text-success"}>
                {isDispatch ? "−" : "+"}
                {Number.isFinite(qty) ? qty.toLocaleString("vi-VN") : "—"}{" "}
                <span>{product.unit}</span>
              </strong>
            </div>
            <Icon name="arrow" />
            <div>
              <small>DỰ KIẾN SAU GIAO DỊCH</small>
              <strong>
                {Number.isFinite(qty)
                  ? (
                      product.stockQuantity + (isDispatch ? -qty : qty)
                    ).toLocaleString("vi-VN")
                  : "—"}{" "}
                <span>{product.unit}</span>
              </strong>
            </div>
          </div>
        )}
        {insufficient && (
          <p className="field-error" role="alert">
            Tồn kho không đủ. Vui lòng giảm số lượng xuất hoặc chọn sản phẩm
            khác.
          </p>
        )}
        <div className="review-actions">
          <p>
            <Icon name="check" size={16} /> Tồn kho và lịch sử được lưu cùng
            lúc.
          </p>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn btn-outline"
          >
            Hủy giao dịch
          </button>
          <button
            type="submit"
            disabled={!valid || isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? (
              <span className="spinner" />
            ) : (
              <Icon name="check" size={17} />
            )}{" "}
            {isSubmitting ? "Đang lưu..." : "Xác nhận & lưu giao dịch"}
          </button>
        </div>
      </form>
    </section>
  );
}
