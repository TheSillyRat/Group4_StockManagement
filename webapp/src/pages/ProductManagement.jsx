import React, { useState, useEffect, useRef } from "react";
import { inventoryApi } from "../services/api";
import CatalogAiChat from "../components/CatalogAiChat";
import Icon from "../components/Icon";
import { Metric, Search, Empty, Pagination } from "../components/DataUI";
const blank = {
  productName: "",
  unit: "",
  stockQuantity: 0,
  warehouseId: "",
  supplierId: "",
};
export default function ProductManagement({ onDataChange }) {
  const [products, setProducts] = useState([]),
    [warehouses, setWarehouses] = useState([]),
    [suppliers, setSuppliers] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [warehouseId, setWarehouseId] = useState(""),
    [stockFilter, setStockFilter] = useState("ALL"),
    [page, setPage] = useState(1),
    [autoSync, setAutoSync] = useState(true);
  const [modal, setModal] = useState(null),
    [form, setForm] = useState(blank),
    [busy, setBusy] = useState(false),
    [aiBusy, setAiBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [inspection, setInspection] = useState(null);
  const dialog = useRef(null);
  const load = async (background = false) => {
    if (!background) setLoading(true);
    try {
      const [p, w, s] = await Promise.all([
        inventoryApi.getProducts(),
        inventoryApi.getWarehouses(),
        inventoryApi.getSuppliers(),
      ]);
      setProducts(p);
      setWarehouses(w);
      setSuppliers(s);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      if (!background) setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!autoSync) return;
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [autoSync]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      dialog.current?.querySelector("textarea") ||
      dialog.current?.querySelector("input,button")
    )?.focus();
    const key = (e) => {
      if (e.key === "Escape" && !busy) setModal(null);
      if (e.key === "Tab") {
        const nodes = [
          ...dialog.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)",
          ),
        ];
        if (!nodes.length) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [modal, busy]);
  const open = (mode, p) => {
    setModal({ mode, product: p });
    setForm(p ? { ...blank, ...p } : { ...blank });
    setFormError("");
  };
  const save = async (e) => {
    e.preventDefault();
    if (busy || aiBusy) return;
    const q = Number(form.stockQuantity);
    if (
      modal.mode !== "delete" &&
      (!form.productName.trim() ||
        !form.unit.trim() ||
        !Number.isInteger(q) ||
        q < 0)
    ) {
      setFormError(
        "Tên, đơn vị và tồn ban đầu là số nguyên không âm là bắt buộc.",
      );
      return;
    }
    if (
      modal.mode === "create" &&
      q > 0 &&
      (!form.warehouseId || !form.supplierId)
    ) {
      setFormError(
        "Có tồn ban đầu: cần chọn nhà cung cấp và kho nhận để lưu đơn nhập.",
      );
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (modal.mode === "delete")
        await inventoryApi.deleteProduct(modal.product.productId);
      else {
        const data = {
          productName: form.productName.trim(),
          unit: form.unit.trim(),
          stockQuantity: q,
          warehouseId: Number(form.warehouseId) || null,
          supplierId: Number(form.supplierId) || null,
        };
        if (modal.mode === "edit")
          await inventoryApi.updateProduct(modal.product.productId, data);
        else await inventoryApi.createProduct(data);
      }
      setModal(null);
      setNotice("Đã lưu thay đổi sản phẩm.");
      await load();
      onDataChange?.();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const inspect = async (id) => {
    try {
      setInspection(await inventoryApi.getProductStock(id));
    } catch (e) {
      setError(e.message);
    }
  };
  const rows = products
    .filter(
      (p) =>
        !warehouseId ||
        p.warehouseStocks?.some((s) => s.warehouseId === Number(warehouseId)),
    )
    .map((p) => ({
      ...p,
      displayStock: warehouseId
        ? (p.warehouseStocks?.find((s) => s.warehouseId === Number(warehouseId))
            ?.quantity ?? 0)
        : p.stockQuantity,
    }))
    .filter(
      (p) =>
        `${p.productName} ${p.unit} ${p.productId}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()) &&
        (stockFilter === "ALL" ||
          (stockFilter === "IN_STOCK" && p.displayStock > 0) ||
          (stockFilter === "LOW_STOCK" &&
            p.displayStock > 0 &&
            p.displayStock <= 10) ||
          (stockFilter === "OUT_OF_STOCK" && p.displayStock === 0)),
    );
  const field = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const applied = (r) => {
    setForm((f) => ({
      ...f,
      ...(r.productName ? { productName: r.productName } : {}),
      ...(r.unit ? { unit: r.unit } : {}),
      ...((Number.isInteger(r.stockQuantity) && r.stockQuantity >= 0) ||
      r.isComplete
        ? { stockQuantity: r.stockQuantity ?? 0 }
        : {}),
      ...(r.warehouseName
        ? {
            warehouseId:
              warehouses.find(
                (w) =>
                  !w.isUnallocated &&
                  w.warehouseName.toLowerCase() ===
                    r.warehouseName.trim().toLowerCase(),
              )?.warehouseId || "",
          }
        : {}),
      ...(r.supplierName
        ? {
            supplierId:
              suppliers.find(
                (s) =>
                  s.supplierName.toLowerCase() ===
                  r.supplierName.trim().toLowerCase(),
              )?.supplierId || "",
          }
        : {}),
    }));
    setFormError(r.alreadyExists ? r.message : "");
  };
  return (
    <>
      <div className="stat-grid">
        <Metric
          icon="box"
          value={products.length}
          label="Sản phẩm trong danh mục"
        />
        <Metric
          icon="warehouse"
          value={warehouses.filter((w) => !w.isUnallocated).length}
          label="Kho thực tế"
        />
        <Metric
          icon="alert"
          value={rows.filter((p) => p.displayStock <= 10).length}
          label="Tồn thấp trong bộ lọc hiện tại"
        />
      </div>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Danh mục sản phẩm theo kho</h2>
            <p className="card-subtitle">
              Chọn kho để xem tồn tại vị trí cụ thể. Không chỉnh số tồn trực
              tiếp.
            </p>
          </div>
          <div className="row-actions">
            <button
              className="btn btn-outline"
              disabled={loading}
              onClick={() => load()}
            >
              Làm mới
            </button>
            <button className="btn btn-primary" onClick={() => open("create")}>
              Add Product
            </button>
          </div>
        </div>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="alert alert-success" role="status">
            {notice}
          </div>
        )}
        <div className="toolbar">
          <Search
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm tên, mã hoặc đơn vị sản phẩm..."
          />
          <select
            aria-label="Lọc sản phẩm theo kho"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả kho (tổng tồn)</option>
            {warehouses.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>
                {w.warehouseName}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo tồn kho"
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="IN_STOCK">Còn hàng</option>
            <option value="LOW_STOCK">Tồn thấp (≤ 10)</option>
            <option value="OUT_OF_STOCK">Hết hàng</option>
          </select>
          <label className="compact-label">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
            />{" "}
            Tự làm mới 10 giây
          </label>
        </div>
        {loading ? (
          <Empty loading title="Đang tải sản phẩm..." />
        ) : !rows.length ? (
          <Empty
            title="Không có sản phẩm phù hợp"
            description="Thử kho khác hoặc thay đổi bộ lọc."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>SẢN PHẨM</th>
                  <th>TỒN {warehouseId ? "TẠI KHO" : "TỔNG"}</th>
                  <th>PHÂN BỔ THEO KHO</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 10, page * 10).map((p) => (
                  <tr key={p.productId}>
                    <td>
                      <strong>{p.productName}</strong>
                      <small>
                        SP-{p.productId} · {p.unit}
                      </small>
                    </td>
                    <td>
                      <strong>{p.displayStock}</strong> {p.unit}
                    </td>
                    <td>
                      <div className="warehouse-stock-tags">
                        {p.warehouseStocks
                          ?.filter(
                            (s) =>
                              !warehouseId ||
                              s.warehouseId === Number(warehouseId),
                          )
                          .map((s) => (
                            <span
                              key={s.warehouseId}
                              className={`badge ${s.isUnallocated ? "badge-unmatched" : "badge-neutral"}`}
                            >
                              {s.warehouseName}: {s.quantity} {s.unit}
                            </span>
                          ))}
                        {!p.warehouseStocks?.length && (
                          <small>Chưa có tồn ở kho nào</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => inspect(p.productId)}
                        >
                          Xem tồn
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => open("edit", p)}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          className="btn btn-danger-outline"
                          disabled={p.stockQuantity > 0}
                          onClick={() => open("delete", p)}
                          aria-label={`Xóa ${p.productName}`}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          total={rows.length}
          page={Math.min(page, Math.max(1, Math.ceil(rows.length / 10)))}
          onChange={setPage}
        />
      </section>
      {inspection && (
        <section
          className="card product-stock-inspection"
          aria-label="Chi tiết tồn sản phẩm"
        >
          <div className="card-header">
            <h2 className="card-title">Tồn kho · {inspection.productName}</h2>
            <button
              className="btn btn-outline"
              onClick={() => setInspection(null)}
            >
              Đóng chi tiết
            </button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>KHO</th>
                  <th>TỒN</th>
                </tr>
              </thead>
              <tbody>
                {inspection.warehouseStocks?.map((s) => (
                  <tr key={s.warehouseId}>
                    <td>{s.warehouseName}</td>
                    <td>
                      {s.quantity} {s.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="card-subtitle">
            Tổng toàn hệ thống: {inspection.stockQuantity} {inspection.unit}
          </p>
        </section>
      )}
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal-content"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <h3 id="product-modal-title">
              {modal.mode === "delete"
                ? "Xóa sản phẩm?"
                : modal.mode === "edit"
                  ? "Chỉnh sửa sản phẩm"
                  : "Add New Product"}
            </h3>
            {modal.mode === "create" && (
              <CatalogAiChat
                entityType="product"
                disabled={busy}
                onBusyChange={setAiBusy}
                onApply={applied}
              />
            )}
            <form onSubmit={save}>
              <fieldset disabled={busy || aiBusy}>
                {modal.mode === "delete" ? (
                  <p>
                    Xóa “{modal.product.productName}”? Sản phẩm có lịch sử sẽ
                    không được xóa.
                  </p>
                ) : (
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="catalog-product-name">
                        Product Name *
                      </label>
                      <input
                        id="catalog-product-name"
                        value={form.productName}
                        maxLength={200}
                        required
                        onChange={(e) => field("productName", e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="catalog-product-unit">
                        Unit of Measure *
                      </label>
                      <input
                        id="catalog-product-unit"
                        value={form.unit}
                        maxLength={50}
                        required
                        onChange={(e) => field("unit", e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="catalog-product-quantity">
                        Current Stock Quantity *
                      </label>
                      <input
                        id="catalog-product-quantity"
                        type="number"
                        min="0"
                        max="2147483647"
                        step="1"
                        required
                        readOnly={modal.mode === "edit"}
                        value={form.stockQuantity}
                        onChange={(e) => field("stockQuantity", e.target.value)}
                      />
                      <small>
                        {modal.mode === "edit"
                          ? "Tồn kho chỉ thay đổi qua nhập/xuất/chuyển."
                          : "Nếu lớn hơn 0, sẽ tạo đơn nhập từ nhà cung cấp vào kho."}
                      </small>
                    </div>
                    {modal.mode === "create" &&
                      Number(form.stockQuantity) > 0 && (
                        <>
                          <div className="form-field">
                            <label htmlFor="catalog-product-supplier">
                              Nhà cung cấp nhập ban đầu *
                            </label>
                            <select
                              id="catalog-product-supplier"
                              required
                              value={form.supplierId}
                              onChange={(e) =>
                                field("supplierId", e.target.value)
                              }
                            >
                              <option value="">Chọn nhà cung cấp</option>
                              {suppliers.map((s) => (
                                <option key={s.supplierId} value={s.supplierId}>
                                  {s.supplierName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-field">
                            <label htmlFor="catalog-product-warehouse">
                              Kho nhập ban đầu *
                            </label>
                            <select
                              id="catalog-product-warehouse"
                              required
                              value={form.warehouseId}
                              onChange={(e) =>
                                field("warehouseId", e.target.value)
                              }
                            >
                              <option value="">Chọn kho nhận</option>
                              {warehouses
                                .filter((w) => !w.isUnallocated)
                                .map((w) => (
                                  <option
                                    key={w.warehouseId}
                                    value={w.warehouseId}
                                  >
                                    {w.warehouseName}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </>
                      )}
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {busy
                      ? "Đang lưu..."
                      : modal.mode === "delete"
                        ? "Xóa sản phẩm"
                        : modal.mode === "edit"
                          ? "Save Changes"
                          : "Create Product"}
                  </button>
                </div>
              </fieldset>
              {formError && (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              )}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
