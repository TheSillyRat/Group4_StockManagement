import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import Icon from "./components/Icon";
import Dashboard from "./pages/Dashboard";
import AiInventoryEntry from "./pages/AiInventoryEntry";
import ProductManagement from "./pages/ProductManagement";
import WarehouseManagement from "./pages/WarehouseManagement";
import SuppliersManagement from "./pages/SuppliersManagement";
import TransactionHistory from "./pages/TransactionHistory";
import { inventoryApi } from "./services/api";
const pages = {
  dashboard: ["Tổng quan", "Không gian làm việc"],
  "ai-entry": ["Nhập / xuất kho", "Vận hành kho"],
  products: ["Sản phẩm", "Quản lý danh mục"],
  warehouses: ["Kho hàng", "Quản lý danh mục"],
  suppliers: ["Nhà cung cấp", "Quản lý danh mục"],
  history: ["Lịch sử giao dịch", "Theo dõi & báo cáo"],
};
function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard"),
    [search, setSearch] = useState(""),
    [panel, setPanel] = useState(null);
  const [catalog, setCatalog] = useState({
      products: [],
      warehouses: [],
      history: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(() =>
    stored("stockflow-profile-open", true),
  );
  const [isNarrow, setIsNarrow] = useState(
    () => window.matchMedia("(max-width:900px)").matches,
  );
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const profileVisible = isNarrow ? mobileProfileOpen : profileOpen;
  const closeProfile = () =>
    isNarrow ? setMobileProfileOpen(false) : setProfileOpen(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width:900px)");
    const change = (e) => setIsNarrow(e.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "stockflow-profile-open",
        JSON.stringify(profileOpen),
      );
    } catch {}
  }, [profileOpen]);
  const [compact, setCompact] = useState(() =>
    stored("stockflow-compact", false),
  );
  const navigate = (id) => {
    setActiveTab(id);
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [products, warehouses, history] = await Promise.all([
        inventoryApi.getProducts(),
        inventoryApi.getWarehouses(),
        inventoryApi.getTransactionHistory(),
      ]);
      setCatalog({ products, warehouses, history });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") {
        setPanel(null);
        setMobileProfileOpen(false);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("stockflow-compact", JSON.stringify(compact));
    } catch {}
  }, [compact]);
  const { products, warehouses, history } = catalog;
  const selected =
    products.find((p) => p.productId === selectedId) || products[0];
  const select = (p) => setSelectedId(p.productId);
  const low = products.filter((p) => p.stockQuantity <= 10);
  return (
    <div
      className={`app-shell ${compact ? "compact" : ""} ${profileVisible ? "profile-expanded" : "profile-collapsed"} ${isNarrow && profileVisible ? "profile-mobile-open" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Navbar activeTab={activeTab} setActiveTab={navigate} />
      <div className="main-shell">
        <header className="topbar">
          <div className="header-navigation">
            <button
              className="icon-button"
              aria-label="Về tổng quan"
              onClick={() => navigate("dashboard")}
            >
              <Icon name="chevron" size={19} />
            </button>
            <span>{pages[activeTab][1]}</span>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("dashboard");
            }}
          >
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (activeTab !== "dashboard") setActiveTab("dashboard");
              }}
              placeholder="Tìm kiếm sản phẩm..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <kbd>↵</kbd>
          </form>
          <div className="header-tools">
            <button
              className="icon-button profile-toggle"
              aria-label={
                profileVisible ? "Ẩn bảng thông tin" : "Mở bảng thông tin"
              }
              aria-expanded={profileVisible}
              aria-controls="profile-panel"
              onClick={() =>
                isNarrow
                  ? setMobileProfileOpen(!mobileProfileOpen)
                  : setProfileOpen(!profileOpen)
              }
            >
              <Icon name="box" size={20} />
            </button>
            <button
              className={`icon-button notification-button ${panel === "notifications" ? "active" : ""}`}
              aria-label={`Thông báo: ${low.length} sản phẩm tồn thấp`}
              aria-expanded={panel === "notifications"}
              onClick={() =>
                setPanel(panel === "notifications" ? null : "notifications")
              }
            >
              <Icon name="bell" size={20} />
              {low.length > 0 && <i />}
            </button>
            <button
              className="icon-button"
              aria-label="Cài đặt hiển thị"
              aria-expanded={panel === "settings"}
              onClick={() => setPanel(panel === "settings" ? null : "settings")}
            >
              <Icon name="settings" size={20} />
            </button>
          </div>
          {panel && (
            <div className="header-popover">
              <h3>
                {panel === "notifications"
                  ? "Thông báo tồn kho"
                  : "Cài đặt hiển thị"}
              </h3>
              {panel === "notifications" ? (
                <>
                  <p>
                    {error
                      ? "Chưa tải được dữ liệu để kiểm tra tồn kho."
                      : low.length
                        ? `${low.length} sản phẩm có tồn kho từ 10 trở xuống.`
                        : "Không có cảnh báo tồn kho thấp."}
                  </p>
                  {low.map((p) => (
                    <button
                      key={p.productId}
                      onClick={() => {
                        select(p);
                        navigate("products");
                      }}
                    >
                      {p.productName}
                      <strong>
                        {p.stockQuantity} {p.unit}
                      </strong>
                    </button>
                  ))}
                </>
              ) : (
                <label className="setting-toggle">
                  <span>Hiển thị thu gọn danh sách</span>
                  <input
                    type="checkbox"
                    checked={compact}
                    onChange={(e) => setCompact(e.target.checked)}
                  />
                </label>
              )}
            </div>
          )}
        </header>
        <div className="workspace-body">
          <main className="container" id="main-content">
            {activeTab !== "dashboard" && (
              <div className="page-heading">
                <div>
                  <div className="eyebrow">{pages[activeTab][1]}</div>
                  <h1>{pages[activeTab][0]}</h1>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate("dashboard")}
                >
                  Về tổng quan
                </button>
              </div>
            )}
            {activeTab === "dashboard" && (
              <Dashboard
                {...catalog}
                loading={loading}
                error={error}
                search={search}
                onSelect={select}
                navigate={navigate}
              />
            )}
            {activeTab === "ai-entry" && (
              <AiInventoryEntry
                onViewHistory={() => navigate("history")}
                onDataChange={load}
              />
            )}{" "}
            {activeTab === "products" && (
              <ProductManagement onDataChange={load} />
            )}
            {activeTab === "suppliers" && (
              <SuppliersManagement onDataChange={load} />
            )}
            {activeTab === "warehouses" && (
              <WarehouseManagement onDataChange={load} />
            )}{" "}
            {activeTab === "history" && <TransactionHistory />}
            <footer className="page-footer">
              <span>StockFlow © {new Date().getFullYear()}</span>
              <span>Made for a better workflow.</span>
            </footer>
          </main>
          {isNarrow && profileVisible && (
            <button
              className="profile-backdrop"
              aria-label="Đóng bảng thông tin"
              onClick={closeProfile}
            />
          )}
          {profileVisible && (
            <aside className="profile-panel" id="profile-panel">
              <div className="profile-top">
                <span className={`connection-label ${error ? "offline" : ""}`}>
                  <i />
                  {loading
                    ? "Đang kết nối"
                    : error
                      ? "Chưa kết nối"
                      : "Đã kết nối"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Đóng bảng thông tin"
                  onClick={closeProfile}
                >
                  <Icon name="close" size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={load}
                  disabled={loading}
                  aria-label="Làm mới thống kê"
                >
                  <Icon name="refresh" size={16} />
                </button>
              </div>
              <div className="profile-identity">
                <div className="profile-avatar">
                  <img src="/avatar.svg" alt="Ảnh đại diện minh họa Group 4" />
                  <span />
                </div>
                <h2>Group 4</h2>
                <p>Không gian quản lý kho</p>
                <span className="profile-role">STOCK MANAGEMENT</span>
              </div>
              <div className="profile-stats">
                <div>
                  <span className="pastel-icon purple">
                    <Icon name="box" size={19} />
                  </span>
                  <p>
                    Danh mục sản phẩm
                    <strong>
                      {loading ? "—" : products.length}
                      <small> sản phẩm</small>
                    </strong>
                  </p>
                </div>
                <div>
                  <span className="pastel-icon peach">
                    <Icon name="warehouse" size={19} />
                  </span>
                  <p>
                    Điểm kho đang quản lý
                    <strong>
                      {loading
                        ? "—"
                        : warehouses.filter((w) => !w.isUnallocated).length}
                      <small> kho hàng</small>
                    </strong>
                  </p>
                </div>
                <div>
                  <span className="pastel-icon blue">
                    <Icon name="history" size={19} />
                  </span>
                  <p>
                    Giao dịch đã xác nhận
                    <strong>
                      {loading ? "—" : history.length}
                      <small> giao dịch</small>
                    </strong>
                  </p>
                </div>
              </div>
              <div className="selected-detail">
                <div className="side-heading">
                  ĐANG THEO DÕI<span>LIVE</span>
                </div>
                {selected ? (
                  <>
                    <h3>{selected.productName}</h3>
                    <p>
                      <strong>
                        {selected.stockQuantity.toLocaleString("vi-VN")}
                      </strong>{" "}
                      {selected.unit}
                    </p>
                    <small>Tồn kho tổng trên toàn hệ thống</small>
                  </>
                ) : (
                  <p>Chọn một sản phẩm để xem thông tin.</p>
                )}
              </div>
              <div className="upgrade-card">
                <div className="upgrade-symbol">
                  <Icon name="spark" size={24} />
                  <span>+</span>
                </div>
                <h3>
                  Nâng tầm quy trình
                  <br />
                  cùng trợ lý AI.
                </h3>
                <p>
                  Giảm thao tác nhập liệu.
                  <br />
                  Dành thời gian cho điều quan trọng.
                </p>
                <button
                  className="btn pill"
                  onClick={() => navigate("ai-entry")}
                >
                  Khám phá ngay <Icon name="arrow" size={16} />
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
