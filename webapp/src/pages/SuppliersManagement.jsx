import React, { useEffect, useState } from "react";
import { inventoryApi } from "../services/api";
import Icon from "../components/Icon";
import { Search, Empty, Pagination, Metric } from "../components/DataUI";
export default function SuppliersManagement({ onDataChange }) {
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(null),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      setItems(await inventoryApi.getSuppliers());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const open = (item) => {
    setModal(item);
    setName(item.supplierName || "");
    setError("");
  };
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (modal.mode === "delete")
        await inventoryApi.deleteSupplier(modal.supplierId);
      else if (modal.mode === "edit")
        await inventoryApi.updateSupplier(modal.supplierId, {
          supplierName: name.trim(),
        });
      else await inventoryApi.createSupplier({ supplierName: name.trim() });
      setModal(null);
      setNotice("Đã cập nhật danh mục nhà cung cấp.");
      await load();
      onDataChange?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const filtered = items.filter((s) =>
    `${s.supplierName} ${s.supplierId}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <>
      <div className="stat-grid">
        <Metric
          icon="box"
          value={items.length}
          label="Nhà cung cấp trong danh mục"
        />
      </div>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Danh sách nhà cung cấp</h2>
            <p className="card-subtitle">
              Nguồn hàng bắt buộc khi nhập sản phẩm vào kho.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => open({ mode: "create" })}
          >
            <Icon name="plus" size={16} />
            Thêm nhà cung cấp
          </button>
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
            placeholder="Tìm tên nhà cung cấp..."
          />
          <button className="btn btn-outline" disabled={loading} onClick={load}>
            Làm mới
          </button>
        </div>
        {loading ? (
          <Empty loading title="Đang tải nhà cung cấp..." />
        ) : !filtered.length ? (
          <Empty
            title="Chưa có nhà cung cấp phù hợp"
            description="Thêm nhà cung cấp để ghi nhận giao dịch nhập kho."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>NHÀ CUNG CẤP</th>
                  <th>MÃ</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 10, page * 10).map((s) => (
                  <tr key={s.supplierId}>
                    <td>
                      <strong>{s.supplierName}</strong>
                    </td>
                    <td>NCC-{s.supplierId}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => open({ ...s, mode: "edit" })}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          className="btn btn-danger-outline"
                          onClick={() => open({ ...s, mode: "delete" })}
                        >
                          Xóa
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
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-modal-title"
          >
            <h3 id="supplier-modal-title">
              {modal.mode === "delete"
                ? "Xóa nhà cung cấp?"
                : modal.mode === "edit"
                  ? "Chỉnh sửa nhà cung cấp"
                  : "Thêm nhà cung cấp"}
            </h3>
            <p>
              {modal.mode === "delete"
                ? `Xóa “${modal.supplierName}”? Nhà cung cấp đã có giao dịch sẽ không được xóa.`
                : "Nhập tên để dễ chọn nguồn hàng khi nhập kho."}
            </p>
            <form onSubmit={save}>
              {modal.mode !== "delete" && (
                <div className="form-field">
                  <label htmlFor="supplier-name">Tên nhà cung cấp *</label>
                  <input
                    id="supplier-name"
                    autoFocus
                    required
                    maxLength={200}
                    value={name}
                    disabled={busy}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
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
                  disabled={busy || (modal.mode !== "delete" && !name.trim())}
                >
                  {busy
                    ? "Đang lưu..."
                    : modal.mode === "delete"
                      ? "Xóa nhà cung cấp"
                      : "Lưu nhà cung cấp"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
