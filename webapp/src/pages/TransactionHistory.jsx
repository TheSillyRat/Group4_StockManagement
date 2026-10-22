import React, { useEffect, useState } from "react";
import { inventoryApi } from "../services/api";
import Icon from "../components/Icon";
import { Metric, Search, Empty, Pagination } from "../components/DataUI";
export default function TransactionHistory() {
  const [history, setHistory] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [type, setType] = useState("ALL"),
    [page, setPage] = useState(1);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setHistory(await inventoryApi.getTransactionHistory());
      setPage(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const filtered = history.filter(
    (t) =>
      (type === "ALL" || t.transactionType === type) &&
      `${t.transactionId} ${t.productName} ${t.warehouseName} ${t.supplierName || ""} ${t.destinationWarehouseName || ""} ${t.externalDestination || ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  const date = (value) =>
    new Date(
      /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`,
    ).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <>
      <div className="stat-grid">
        <Metric
          icon="history"
          value={history.length}
          label="Giao dịch đã xác nhận"
        />
        <Metric
          icon="down"
          value={history.filter((t) => t.transactionType === "Receive").length}
          label="Giao dịch nhập kho"
        />
        <Metric
          icon="up"
          value={history.filter((t) => t.transactionType === "Dispatch").length}
          label="Giao dịch xuất kho"
        />
      </div>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Nhật ký giao dịch</h2>
            <p className="card-subtitle">
              Các giao dịch đã lưu thành công, mới nhất ở trên.
            </p>
          </div>
          <button className="btn btn-outline" onClick={load} disabled={loading}>
            <Icon name="refresh" size={16} />
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
        {error && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" />
            {error}
          </div>
        )}
        <div className="toolbar">
          <div className="filter-group">
            {[
              ["ALL", "Tất cả"],
              ["Receive", "Nhập kho"],
              ["Dispatch", "Xuất kho"],
              ["TransferIn", "Nhận chuyển kho"],
              ["TransferOut", "Chuyển đi"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`filter-btn ${type === key ? "active" : ""}`}
                aria-pressed={type === key}
                onClick={() => {
                  setType(key);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <Search
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm mã, sản phẩm hoặc kho..."
          />
        </div>
        {loading ? (
          <Empty loading title="Đang tải lịch sử..." />
        ) : !filtered.length ? (
          <Empty
            title={
              error ? "Chưa tải được dữ liệu" : "Chưa có giao dịch phù hợp"
            }
            description="Giao dịch sẽ xuất hiện sau khi bạn xác nhận và lưu thành công."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>GIAO DỊCH</th>
                  <th>SẢN PHẨM</th>
                  <th>LOẠI</th>
                  <th>SỐ LƯỢNG</th>
                  <th>KHO HÀNG</th>
                  <th>NƠI ĐẾN</th>
                  {(type === "ALL" || type === "Receive") && (
                    <th>NHÀ CUNG CẤP</th>
                  )}
                  <th>THỜI GIAN</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 10, page * 10).map((t) => (
                  <tr key={t.transactionId}>
                    <td>
                      <strong>
                        GD-{String(t.transactionId).padStart(4, "0")}
                      </strong>
                      <small>Đã ghi nhận</small>
                    </td>
                    <td>
                      <strong>{t.productName}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${t.transactionType === "Receive" ? "badge-receive" : "badge-dispatch"}`}
                      >
                        <Icon
                          name={t.transactionType === "Receive" ? "down" : "up"}
                          size={12}
                        />
                        {{
                          Receive: "Nhập từ NCC",
                          Dispatch: "Xuất ra ngoài",
                          TransferIn: "Nhận chuyển kho",
                          TransferOut: "Chuyển đi",
                        }[t.transactionType] || t.transactionType}
                      </span>
                    </td>
                    <td
                      className={
                        t.transactionType === "Receive"
                          ? "text-success"
                          : "text-warning"
                      }
                    >
                      <strong>
                        {["Receive", "TransferIn"].includes(t.transactionType)
                          ? "+"
                          : "−"}
                        {t.quantity.toLocaleString("vi-VN")}
                      </strong>{" "}
                      {t.unit}
                    </td>
                    <td>{t.warehouseName}</td>
                    <td>
                      {t.destinationWarehouseName ||
                        t.externalDestination ||
                        (t.destinationType === "External" ? "Bên ngoài" : "—")}
                    </td>
                    {(type === "ALL" || type === "Receive") && (
                      <td className="muted">
                        {t.transactionType === "Receive"
                          ? t.supplierName || "Không ghi nhận (lịch sử cũ)"
                          : "—"}
                      </td>
                    )}
                    <td className="muted">{date(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={filtered.length} page={page} onChange={setPage} />
      </section>
    </>
  );
}
