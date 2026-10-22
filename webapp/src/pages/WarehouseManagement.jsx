import React, { useEffect, useState, useRef } from "react";
import { inventoryApi } from "../services/api";
import Icon from "../components/Icon";
import { Metric, Search, Empty, Pagination } from "../components/DataUI";
export default function WarehouseManagement({ onDataChange }) {
  const [warehouses, setWarehouses] = useState([]),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(null),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(null),
    [name, setName] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [formError, setFormError] = useState("");
  const dialogRef = useRef(null),
    returnFocus = useRef(null);
  const load = async () => {
    setLoading(true);
    try {
      setWarehouses(await inventoryApi.getWarehouses());
      setPage(1);
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!modal) return;
    returnFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("input, button")?.focus();
    const key = (e) => {
      if (e.key === "Escape" && !submitting) setModal(null);
      if (e.key === "Tab") {
        const els = [
          ...dialogRef.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled)",
          ),
        ];
        if (!els.length) {
          e.preventDefault();
          return;
        }
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      returnFocus.current?.focus();
    };
  }, [modal, submitting]);
  const open = (value) => {
    setModal(value);
    setFormError("");
    setName(value.warehouseName || "");
  };
  const save = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError("");
    try {
      if (modal.mode === "delete")
        await inventoryApi.deleteWarehouse(modal.warehouseId);
      else if (modal.mode === "edit")
        await inventoryApi.updateWarehouse(modal.warehouseId, {
          warehouseName: name.trim(),
        });
      else await inventoryApi.createWarehouse({ warehouseName: name.trim() });
      setNotice({
        type: "success",
        text:
          modal.mode === "delete"
            ? "Đã xóa kho hàng."
            : "Đã lưu thông tin kho hàng.",
      });
      setModal(null);
      await load();
      onDataChange?.();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };
  const filtered = warehouses.filter((w) =>
    `${w.warehouseId} ${w.warehouseName}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <>
      <div className="stat-grid">
        <Metric
          icon="warehouse"
          value={warehouses.length}
          label="Điểm kho trong hệ thống"
        />
        <Metric
          icon="history"
          value={warehouses.reduce((sum, w) => sum + w.transactionCount, 0)}
          label="Giao dịch đã ghi nhận"
        />
        <Metric
          icon="chart"
          value={warehouses.filter((w) => w.transactionCount > 0).length}
          label="Kho đã phát sinh giao dịch"
        />
      </div>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Danh sách kho hàng</h2>
            <p className="card-subtitle">
              Quản lý thông tin và địa điểm ghi nhận giao dịch.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline"
              disabled={loading}
              onClick={load}
              aria-label="Làm mới danh sách kho"
            >
              <Icon name="refresh" size={16} />
            </button>
            <button
              className="btn btn-primary"
              onClick={() => open({ mode: "create" })}
            >
              <Icon name="plus" size={16} />
              Thêm kho hàng
            </button>
          </div>
        </div>
        {notice && (
          <div className={`alert alert-${notice.type}`} role="status">
            <Icon name={notice.type === "error" ? "alert" : "check"} />
            <span>{notice.text}</span>
          </div>
        )}
        <div className="toolbar">
          <Search
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm tên hoặc mã kho hàng..."
          />
          <span className="muted">{filtered.length} kho hàng</span>
        </div>
        {loading ? (
          <Empty loading title="Đang tải kho hàng..." />
        ) : !filtered.length ? (
          <Empty
            title="Không tìm thấy kho hàng"
            description="Thêm kho mới hoặc thay đổi từ khóa tìm kiếm."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>KHO HÀNG</th>
                  <th>MÃ KHO</th>
                  <th>GIAO DỊCH</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 10, page * 10).map((w) => (
                  <tr key={w.warehouseId}>
                    <td>
                      <div className="product-cell">
                        <span>
                          <Icon name="warehouse" size={18} />
                        </span>
                        <strong>{w.warehouseName}</strong>
                      </div>
                    </td>
                    <td className="muted">
                      KHO-{String(w.warehouseId).padStart(3, "0")}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {w.transactionCount} giao dịch
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-outline"
                          onClick={() => open({ ...w, mode: "edit" })}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          className="btn btn-danger-outline"
                          disabled={w.transactionCount > 0}
                          title={
                            w.transactionCount > 0
                              ? "Kho đã có giao dịch, không thể xóa"
                              : "Xóa kho"
                          }
                          onClick={() => open({ ...w, mode: "delete" })}
                          aria-label={`Xóa ${w.warehouseName}`}
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
        <Pagination total={filtered.length} page={page} onChange={setPage} />
      </section>
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setModal(null);
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-modal-title"
            ref={dialogRef}
          >
            <h3 id="warehouse-modal-title">
              {modal.mode === "delete"
                ? "Xóa kho hàng?"
                : modal.mode === "edit"
                  ? "Chỉnh sửa kho hàng"
                  : "Thêm kho hàng"}
            </h3>
            <p>
              {modal.mode === "delete"
                ? `Kho “${modal.warehouseName}” sẽ bị xóa khỏi danh mục. Thao tác này không thể hoàn tác.`
                : "Đặt tên rõ ràng để dễ chọn khi nhập hoặc xuất hàng."}
            </p>
            <form onSubmit={save}>
              {modal.mode !== "delete" && (
                <div className="form-field">
                  <label htmlFor="warehouse-name">Tên kho hàng *</label>
                  <input
                    id="warehouse-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={200}
                    required
                    disabled={submitting}
                    placeholder="Ví dụ: Kho Bình Tân"
                  />
                </div>
              )}
              {formError && (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModal(null)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`btn ${modal.mode === "delete" ? "btn-danger-outline" : "btn-primary"}`}
                  disabled={
                    submitting || (modal.mode !== "delete" && !name.trim())
                  }
                >
                  {submitting
                    ? "Đang lưu..."
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
