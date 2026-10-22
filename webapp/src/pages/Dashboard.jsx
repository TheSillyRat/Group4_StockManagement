import React, { useState } from "react";
import Icon from "../components/Icon";
import { Empty } from "../components/DataUI";
export default function Dashboard({
  products,
  warehouses,
  history,
  loading,
  error,
  search,
  selected,
  onSelect,
  navigate,
  favorites,
  toggleFavorite,
}) {
  const [filter, setFilter] = useState("all");
  const filtered = products.filter(
    (p) =>
      `${p.productName} ${p.productId}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()) &&
      (filter !== "favorites" || favorites.includes(p.productId)),
  );
  return (
    <>
      <div className="dashboard-intro">
        <div>
          <div className="eyebrow">KHÔNG GIAN QUẢN LÝ KHO</div>
          <h1>
            Mọi thứ đều trong tầm tay<span>.</span>
          </h1>
          <p>Một góc nhìn rõ ràng. Một ngày vận hành hiệu quả.</p>
        </div>
        <span className="dashboard-date">
          {new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "short",
          }).format(new Date())}
        </span>
      </div>
      <section className="featured-banner">
        <div className="featured-art">
          <img
            src="/warehouse.svg"
            alt="Minh họa kho hàng và các kiện sản phẩm"
          />
        </div>
        <div className="featured-copy">
          <span className="feature-label">
            <span /> SMART INVENTORY
          </span>
          <h2>
            Để AI lo thao tác.
            <br />
            Bạn giữ quyền kiểm soát.
          </h2>
          <p>
            Mô tả yêu cầu nhập, xuất hàng. Kiểm tra thông tin và xác nhận — đơn
            giản như một cuộc trò chuyện.
          </p>
          <button
            className="btn btn-primary pill"
            onClick={() => navigate("ai-entry")}
          >
            Tạo giao dịch mới <Icon name="arrow" size={17} />
          </button>
        </div>
      </section>
      <div className="overview-heading">
        <div>
          <h2>Danh mục của bạn</h2>
          <p>Chọn sản phẩm để xem nhanh tồn kho.</p>
        </div>
        <button className="text-button" onClick={() => navigate("products")}>
          Xem tất cả <Icon name="arrow" size={15} />
        </button>
      </div>
      <div className="collection-tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Tất cả sản phẩm <span>{products.length}</span>
        </button>
        <button
          className={filter === "favorites" ? "active" : ""}
          onClick={() => setFilter("favorites")}
        >
          Đã đánh dấu <span>{favorites.length}</span>
        </button>
        <span className="collection-caption">TỒN KHO TOÀN HỆ THỐNG</span>
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <Empty loading title="Đang tải danh mục..." />
      ) : filtered.length === 0 ? (
        <Empty
          title="Chưa có sản phẩm phù hợp"
          description="Thay đổi từ khóa hoặc đánh dấu sản phẩm bằng biểu tượng trái tim."
        />
      ) : (
        <div className="product-collection">
          {filtered.map((p, i) => (
            <article
              className={`collection-row ${selected?.productId === p.productId ? "selected" : ""}`}
              key={p.productId}
            >
              <span className="row-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                className={`icon-button favorite ${favorites.includes(p.productId) ? "is-favorite" : ""}`}
                aria-label={`${favorites.includes(p.productId) ? "Bỏ đánh dấu" : "Đánh dấu"} ${p.productName}`}
                aria-pressed={favorites.includes(p.productId)}
                onClick={() => toggleFavorite(p.productId)}
              >
                <Icon name="heart" size={16} />
              </button>
              <button
                className="row-product"
                onClick={() => onSelect(p)}
                aria-label={`Xem ${p.productName}`}
              >
                <img
                  src="/product.svg"
                  alt=""
                  className={`product-thumb tint-${i % 3}`}
                />
                <span>
                  <strong>{p.productName}</strong>
                  <small>
                    SP-{String(p.productId).padStart(3, "0")} · Đơn vị {p.unit}
                  </small>
                </span>
              </button>
              <div className="row-stock">
                <strong>{p.stockQuantity.toLocaleString("vi-VN")}</strong>
                <small>{p.unit} hiện có</small>
              </div>
              <span
                className={`stock-dot ${p.stockQuantity <= 10 ? "low" : ""}`}
                title={p.stockQuantity <= 10 ? "Tồn thấp" : "Còn hàng"}
              />
              <button
                className="icon-button"
                aria-label={`Thao tác với ${p.productName}`}
                onClick={() => {
                  onSelect(p);
                  navigate("products");
                }}
              >
                <Icon name="more" size={19} />
              </button>
            </article>
          ))}
        </div>
      )}
      <div className="dashboard-summary">
        <span>
          <Icon name="warehouse" size={16} />
          {warehouses.filter((w) => !w.isUnallocated).length} điểm kho
        </span>
        <span>
          <Icon name="history" size={16} />
          {history.length} giao dịch đã xác nhận
        </span>
        <button onClick={() => navigate("history")}>
          Mở nhật ký giao dịch <Icon name="arrow" size={14} />
        </button>
      </div>
      <div className="dashboard-tip">
        <span>
          <Icon name="spark" size={19} />
        </span>
        <p>
          <strong>Mẹo nhỏ, hiệu quả lớn</strong>Luôn kiểm tra đơn vị tính và số
          lượng trước khi xác nhận giao dịch.
        </p>
      </div>
    </>
  );
}
