import React, { useEffect, useState, useRef } from "react";
import { inventoryApi } from "../services/api";
import Icon from "../components/Icon";
import CatalogAiChat from "../components/CatalogAiChat";
import { Metric, Search, Empty, Pagination } from "../components/DataUI";
export default function WarehouseManagement({ onDataChange }) {
  const [warehouses, setWarehouses] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [stocks, setStocks] = useState([]),
    [stockLoading, setStockLoading] = useState(false),
    [stockError, setStockError] = useState("");
  const [modal, setModal] = useState(null),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [aiBusy, setAiBusy] = useState(false),
    [toWarehouse, setToWarehouse] = useState(""),
    [quantity, setQuantity] = useState(1);
  const dialog = useRef(null);
  const loadStock = async (id) => {
    setStockLoading(true);
    setStockError("");
    try {
      setStocks(await inventoryApi.getWarehouseStock(id));
    } catch (e) {
      setStocks([]);
      setStockError(e.message);
    } finally {
      setStockLoading(false);
    }
  };
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await inventoryApi.getWarehouses();
      setWarehouses(rows);
      if (selected) {
        setSelected(
          rows.find((w) => w.warehouseId === selected.warehouseId) || null,
        );
        await loadStock(selected.warehouseId);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!modal) return;
    const focus = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      dialog.current?.querySelector("textarea") ||
      dialog.current?.querySelector("input,select,button")
    )?.focus();
    const key = (e) => {
      if (e.key === "Escape" && !busy) setModal(null);
      if (e.key === "Tab") {
        const nodes = [
          ...dialog.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
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
      focus?.focus();
    };
  }, [modal, busy]);
  const open = (m) => {
    setModal(m);
    setError("");
    setName(m.warehouseName || "");
    setToWarehouse("");
    setQuantity(1);
  };
  const save = async (e) => {
    e.preventDefault();
    if (busy || aiBusy) return;
    setBusy(true);
    setError("");
    try {
      if (modal.mode === "transfer")
        await inventoryApi.transferStock({
          productId: modal.productId,
          fromWarehouseId: selected.warehouseId,
          toWarehouseId: Number(toWarehouse),
          quantity: Number(quantity),
        });
      else if (modal.mode === "delete")
        await inventoryApi.deleteWarehouse(modal.warehouseId);
      else if (modal.mode === "edit")
        await inventoryApi.updateWarehouse(modal.warehouseId, {
          warehouseName: name.trim(),
        });
      else await inventoryApi.createWarehouse({ warehouseName: name.trim() });
      setNotice(
        modal.mode === "transfer"
          ? "Đã chuyển/phân bổ hàng vào kho nhận. Tổng tồn không thay đổi."
          : "Đã lưu thay đổi kho hàng.",
      );
      setModal(null);
      await load();
      onDataChange?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const filtered = warehouses.filter((w) =>
    `${w.warehouseName} ${w.warehouseId}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <>
      <div className="stat-grid">
        <Metric
          icon="warehouse"
          value={warehouses.filter((w) => !w.isUnallocated).length}
          label="Kho thực tế"
        />
        <Metric
          icon="box"
          value={warehouses.filter((w) => w.productCount > 0).length}
          label="Kho đang có hàng"
        />
        <Metric
          icon="history"
          value={warehouses.reduce((n, w) => n + w.transactionCount, 0)}
          label="Dòng lịch sử nhập/xuất/chuyển"
        />
      </div>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Danh sách kho hàng</h2>
            <p className="card-subtitle">
              Xem từng sản phẩm theo kho và phân bổ/chuyển hàng giữa các kho.
            </p>
          </div>
          <div className="row-actions">
            <button
              className="btn btn-outline"
              disabled={loading}
              onClick={load}
            >
              Làm mới
            </button>
            <button
              className="btn btn-primary"
              onClick={() => open({ mode: "create" })}
            >
              Thêm kho hàng
            </button>
          </div>
        </div>
        {notice && (
          <div className="alert alert-success" role="status">
            {notice}
          </div>
        )}
        {error && !modal && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="toolbar">
          <Search
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm tên hoặc mã kho..."
          />
        </div>
        {loading ? (
          <Empty loading title="Đang tải kho..." />
        ) : !filtered.length ? (
          <Empty title="Không tìm thấy kho" />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>KHO HÀNG</th>
                  <th>SẢN PHẨM CÒN HÀNG</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 10, page * 10).map((w) => (
                  <tr key={w.warehouseId}>
                    <td>
                      <strong>{w.warehouseName}</strong>
                      {w.isUnallocated && (
                        <small>Tồn cũ chưa xác định vị trí — cần phân bổ</small>
                      )}
                    </td>
                    <td>{w.productCount || 0} sản phẩm</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => {
                            setSelected(w);
                            loadStock(w.warehouseId);
                          }}
                        >
                          Xem hàng trong kho
                        </button>
                        {!w.isUnallocated && (
                          <>
                            <button
                              className="btn btn-outline"
                              onClick={() => open({ ...w, mode: "edit" })}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              className="btn btn-danger-outline"
                              disabled={
                                w.transactionCount > 0 || w.productCount > 0
                              }
                              onClick={() => open({ ...w, mode: "delete" })}
                              aria-label={`Xóa ${w.warehouseName}`}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={filtered.length} page={page} onChange={setPage} />
      </section>
      {selected && (
        <section
          className="card warehouse-detail"
          aria-label="Hàng hóa theo kho"
        >
          <div className="card-header">
            <div>
              <h2 className="card-title">Hàng tại {selected.warehouseName}</h2>
              <p className="card-subtitle">
                {selected.isUnallocated
                  ? "Phân bổ tồn cũ vào đúng kho thực tế trước khi xuất hàng."
                  : "Số dư hiện tại của từng sản phẩm trong kho này."}
              </p>
            </div>
            <button
              className="btn btn-outline"
              onClick={() => loadStock(selected.warehouseId)}
            >
              Làm mới tồn
            </button>
          </div>
          {stockError && (
            <div className="alert alert-error" role="alert">
              {stockError}
            </div>
          )}
          {stockLoading ? (
            <Empty loading title="Đang tải hàng trong kho..." />
          ) : !stocks.length ? (
            <Empty
              title="Kho chưa có hàng"
              description="Ghi nhận nhập từ nhà cung cấp hoặc chuyển hàng từ kho khác."
            />
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>SẢN PHẨM</th>
                    <th>TỒN TẠI KHO</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => (
                    <tr key={s.productId}>
                      <td>{s.productName}</td>
                      <td>
                        <strong>{s.quantity}</strong> {s.unit}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline"
                          disabled={s.quantity <= 0}
                          onClick={() => open({ ...s, mode: "transfer" })}
                        >
                          {selected.isUnallocated
                            ? "Phân bổ vào kho"
                            : "Chuyển kho"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            className="modal-card"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-modal-title"
          >
            <h3 id="warehouse-modal-title">
              {modal.mode === "transfer"
                ? selected.isUnallocated
                  ? "Phân bổ hàng vào kho"
                  : "Chuyển hàng giữa kho"
                : modal.mode === "delete"
                  ? "Xóa kho hàng?"
                  : modal.mode === "edit"
                    ? "Chỉnh sửa kho hàng"
                    : "Thêm kho hàng"}
            </h3>
            <p>
              {modal.mode === "transfer"
                ? `${modal.productName} · Nguồn: ${selected.warehouseName} · Có ${modal.quantity} ${modal.unit}`
                : modal.mode === "delete"
                  ? `Xóa kho ${modal.warehouseName}?`
                  : "Đặt tên rõ ràng để dễ chọn khi nhập/xuất hàng."}
            </p>
            {modal.mode === "create" && (
              <CatalogAiChat
                entityType="warehouse"
                disabled={busy}
                onBusyChange={setAiBusy}
                onApply={(r) => {
                  if (r.warehouseName) setName(r.warehouseName);
                }}
              />
            )}
            <form onSubmit={save}>
              {modal.mode === "transfer" ? (
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="transfer-target">Kho nhận *</label>
                    <select
                      id="transfer-target"
                      required
                      value={toWarehouse}
                      disabled={busy}
                      onChange={(e) => setToWarehouse(e.target.value)}
                    >
                      <option value="">Chọn kho nhận</option>
                      {warehouses
                        .filter(
                          (w) =>
                            !w.isUnallocated &&
                            w.warehouseId !== selected.warehouseId,
                        )
                        .map((w) => (
                          <option key={w.warehouseId} value={w.warehouseId}>
                            {w.warehouseName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="transfer-quantity">Số lượng chuyển *</label>
                    <input
                      id="transfer-quantity"
                      required
                      type="number"
                      min="1"
                      max={modal.quantity}
                      step="1"
                      value={quantity}
                      disabled={busy}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                modal.mode !== "delete" && (
                  <div className="form-field">
                    <label htmlFor="warehouse-name">Tên kho hàng *</label>
                    <input
                      id="warehouse-name"
                      maxLength={200}
                      required
                      value={name}
                      disabled={busy || aiBusy}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )
              )}
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    busy ||
                    aiBusy ||
                    (modal.mode === "transfer"
                      ? !toWarehouse ||
                        Number(quantity) <= 0 ||
                        Number(quantity) > modal.quantity
                      : modal.mode !== "delete" && !name.trim())
                  }
                >
                  {busy
                    ? "Đang lưu..."
                    : modal.mode === "transfer"
                      ? "Xác nhận chuyển kho"
                      : modal.mode === "delete"
                        ? "Xóa kho hàng"
                        : "Lưu kho hàng"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
