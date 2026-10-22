import React from "react";
import Icon from "./Icon";
export function Metric({ icon, value, label }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">
        <Icon name={icon} />
      </span>
      <div className="stat-info">
        <strong className="stat-value">{value}</strong>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}
export function Search({ value, onChange, placeholder }) {
  return (
    <div className="search-box">
      <Icon name="search" size={17} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
export function Empty({ title, description, loading = false }) {
  return (
    <div className="empty-state" role="status">
      {loading ? <span className="spinner" /> : <Icon name="box" size={30} />}
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
export function Pagination({ total, page, onChange, pageSize = 10 }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="table-caption">
      <span>
        {total
          ? `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong ${total} kết quả`
          : "Chưa có kết quả"}
      </span>
      <div className="pagination">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          ←
        </button>
        <span>
          Trang {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          →
        </button>
      </div>
    </div>
  );
}
