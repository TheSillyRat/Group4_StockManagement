import React, { useState } from "react";
import Icon from "../components/Icon";
import { Empty } from "../components/DataUI";
const number = (value) => Number(value || 0).toLocaleString("vi-VN");
const labels = {
  Receive: "Nhập kho",
  Dispatch: "Xuất ra ngoài",
  TransferOut: "Chuyển đi",
  TransferIn: "Chuyển đến",
};
export default function Dashboard({
  products,
  warehouses,
  history,
  loading,
  error,
  search,
  onSelect,
  navigate,
}) {
  const [days, setDays] = useState(7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const series = Array.from({ length: days }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days + 1 + i);
    return {
      date,
      key: date.toLocaleDateString("sv-SE"),
      receive: 0,
      dispatch: 0,
    };
  });
  history.forEach((t) => {
    const point = series.find(
      (d) => d.key === new Date(t.createdAt).toLocaleDateString("sv-SE"),
    );
    if (point && t.transactionType === "Receive") point.receive++;
    if (point && t.transactionType === "Dispatch") point.dispatch++;
  });
  const receipts = series.reduce((n, d) => n + d.receive, 0),
    dispatches = series.reduce((n, d) => n + d.dispatch, 0);
  const maximum = Math.max(
    1,
    ...series.flatMap((d) => [d.receive, d.dispatch]),
  );
  const low = products
    .filter((p) => p.stockQuantity <= 10)
    .sort((a, b) => a.stockQuantity - b.stockQuantity);
  const pending = products.filter((p) =>
    (p.warehouseStocks || []).some((s) => s.isUnallocated && s.quantity > 0),
  );
  const physical = warehouses.filter((w) => !w.isUnallocated);
  const recent = [...history]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const filtered = products.filter((p) =>
    `${p.productName} ${p.productId}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <div className="dashboard-intro">
        <div>
          <div className="eyebrow">HIỆU QUẢ VẬN HÀNH</div>
          <h1>
            Tổng quan kho hàng<span>.</span>
          </h1>
          <p>Theo dõi tồn kho và hoạt động nhập xuất trên toàn hệ thống.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("ai-entry")}
        >
          <Icon name="plus" size={16} /> Tạo giao dịch
        </button>
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <Empty loading title="Đang tải thống kê..." />
      ) : error ? (
        <Empty
          title="Chưa có dữ liệu thống kê"
          description="Hãy kiểm tra kết nối và làm mới dữ liệu."
        />
      ) : (
        <>
          <section className="dashboard-kpis" aria-label="Chỉ số tổng quan">
            {[
              ["box", "Sản phẩm", products.length, "Toàn bộ danh mục"],
              [
                "warehouse",
                "Kho hàng",
                physical.length,
                "Kho thực tế đang quản lý",
              ],
              ["history", "Phiếu nhập", receipts, `${days} ngày gần nhất`],
              [
                "arrow",
                "Phiếu xuất ra ngoài",
                dispatches,
                `${days} ngày gần nhất`,
              ],
            ].map(([icon, title, value, caption]) => (
              <article className="dashboard-kpi" key={title}>
                <span className="pastel-icon purple">
                  <Icon name={icon} size={20} />
                </span>
                <p>{title}</p>
                <strong>{number(value)}</strong>
                <small>{caption}</small>
              </article>
            ))}
          </section>
          {pending.length > 0 && (
            <div className="dashboard-notice">
              <Icon name="warehouse" size={20} />
              <p>
                <strong>{pending.length} sản phẩm có tồn chờ phân bổ</strong>
                <br />
                Phân bổ vào kho thực tế trước khi xuất hàng.
              </p>
              <button
                className="text-button"
                onClick={() => navigate("warehouses")}
              >
                Phân bổ ngay →
              </button>
            </div>
          )}
          <div className="analytics-grid">
            <section className="analytics-card">
              <div className="analytics-heading">
                <div>
                  <h2>Hoạt động nhập xuất</h2>
                  <p>Số phiếu mỗi ngày · không bao gồm chuyển kho</p>
                </div>
                <select
                  aria-label="Khoảng thời gian thống kê"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  <option value="7">7 ngày</option>
                  <option value="30">30 ngày</option>
                </select>
              </div>
              <div className="chart-legend">
                <span>
                  <i />
                  Nhập kho
                </span>
                <span>
                  <i />
                  Xuất ra ngoài
                </span>
              </div>
              <div
                className="activity-chart"
                role="img"
                aria-label={`${days} ngày gần nhất: ${receipts} phiếu nhập, ${dispatches} phiếu xuất ra ngoài`}
              >
                {series.map((d, i) => (
                  <div
                    className="chart-day"
                    key={d.key}
                    title={`${d.date.toLocaleDateString("vi-VN")}: ${d.receive} nhập, ${d.dispatch} xuất`}
                  >
                    <div className="chart-bars">
                      <span
                        style={{ height: `${(d.receive / maximum) * 100}%` }}
                      />
                      <span
                        style={{ height: `${(d.dispatch / maximum) * 100}%` }}
                      />
                    </div>
                    <small>
                      {days === 7 || i % 5 === 0
                        ? `${d.date.getDate()}/${d.date.getMonth() + 1}`
                        : ""}
                    </small>
                  </div>
                ))}
              </div>
              {!receipts && !dispatches && (
                <p className="muted">
                  Chưa có phiếu nhập hoặc xuất trong khoảng thời gian này.
                </p>
              )}
            </section>
            <section className="analytics-card">
              <div className="analytics-heading">
                <div>
                  <h2>Tình trạng tồn kho</h2>
                  <p>Ngưỡng cảnh báo: ≤ 10 đơn vị / sản phẩm</p>
                </div>
              </div>
              <div className="inventory-health">
                <strong>
                  {products.filter((p) => p.stockQuantity > 10).length}
                  <small> sản phẩm trên ngưỡng</small>
                </strong>
                <div className="health-track">
                  <span
                    style={{
                      width: `${products.length ? ((products.length - low.length) / products.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p>
                  <span className="stock-dot low" /> {low.length} sản phẩm tồn
                  thấp / hết hàng
                </p>
              </div>
              {low.slice(0, 4).map((p) => (
                <button
                  className="dashboard-list-row"
                  key={p.productId}
                  onClick={() => {
                    onSelect(p);
                    navigate("products");
                  }}
                >
                  <span>{p.productName}</span>
                  <strong>
                    {number(p.stockQuantity)} {p.unit}
                  </strong>
                </button>
              ))}
              {!low.length && (
                <p className="muted">Không có sản phẩm tồn thấp.</p>
              )}
            </section>
          </div>
          <div className="analytics-grid">
            <section className="analytics-card">
              <div className="analytics-heading">
                <div>
                  <h2>Hàng hóa theo kho</h2>
                  <p>Tồn kho được nhóm riêng theo đơn vị tính</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("warehouses")}
                >
                  Xem kho →
                </button>
              </div>
              {!physical.length && <p className="muted">Chưa có kho hàng.</p>}
              {physical.map((w) => {
                const stocks = products.flatMap((p) =>
                  (p.warehouseStocks || []).filter(
                    (s) => s.warehouseId === w.warehouseId && s.quantity > 0,
                  ),
                );
                const units = {};
                stocks.forEach(
                  (s) => (units[s.unit] = (units[s.unit] || 0) + s.quantity),
                );
                return (
                  <div className="warehouse-summary" key={w.warehouseId}>
                    <div>
                      <strong>{w.warehouseName}</strong>
                      <small>{stocks.length} sản phẩm còn hàng</small>
                    </div>
                    <span>
                      {Object.entries(units)
                        .map(([u, q]) => `${number(q)} ${u}`)
                        .join(" · ") || "Chưa có hàng"}
                    </span>
                  </div>
                );
              })}
            </section>
            <section className="analytics-card">
              <div className="analytics-heading">
                <div>
                  <h2>Giao dịch gần đây</h2>
                  <p>Các giao dịch đã được xác nhận</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("history")}
                >
                  Lịch sử →
                </button>
              </div>
              {recent.map((t) => (
                <div className="dashboard-transaction" key={t.transactionId}>
                  <span className="pastel-icon purple">
                    <Icon name="history" size={16} />
                  </span>
                  <div>
                    <strong>{t.productName}</strong>
                    <small>
                      {labels[t.transactionType] || t.transactionType} ·{" "}
                      {t.warehouseName}
                      {t.destinationWarehouseName || t.externalDestination
                        ? ` → ${t.destinationWarehouseName || t.externalDestination}`
                        : ""}
                    </small>
                    <small>
                      {new Date(t.createdAt).toLocaleString("vi-VN")}
                    </small>
                  </div>
                  <b>
                    {number(t.quantity)} {t.unit}
                  </b>
                </div>
              ))}
              {!recent.length && <p className="muted">Chưa có giao dịch.</p>}
            </section>
          </div>
          {search.trim() && (
            <section className="analytics-card">
              <h2>Kết quả tìm kiếm ({filtered.length})</h2>
              {filtered.map((p) => (
                <button
                  className="dashboard-list-row"
                  key={p.productId}
                  onClick={() => onSelect(p)}
                >
                  <span>{p.productName}</span>
                  <strong>
                    {number(p.stockQuantity)} {p.unit}
                  </strong>
                </button>
              ))}
              {!filtered.length && <p>Không tìm thấy sản phẩm phù hợp.</p>}
            </section>
          )}
        </>
      )}
    </>
  );
}
