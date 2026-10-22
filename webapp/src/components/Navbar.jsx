import React from "react";
import Icon from "./Icon";
const groups = [
  [
    "KHÔNG GIAN LÀM VIỆC",
    [
      { id: "dashboard", label: "Tổng quan", icon: "chart" },
      { id: "ai-entry", label: "Nhập / xuất kho", icon: "spark" },
    ],
  ],
  [
    "QUẢN LÝ DANH MỤC",
    [
      { id: "products", label: "Sản phẩm", icon: "box" },
      { id: "warehouses", label: "Kho hàng", icon: "warehouse" },
    ],
  ],
  [
    "THEO DÕI & BÁO CÁO",
    [{ id: "history", label: "Lịch sử giao dịch", icon: "history" }],
  ],
];
export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#dashboard"
        onClick={() => setActiveTab("dashboard")}
      >
        <span className="brand-mark">
          <Icon name="box" size={25} />
        </span>
        <span>
          StockFlow<small>YOUR INVENTORY, IN FLOW</small>
        </span>
      </a>
      <div className="sidebar-groups">
        {groups.map(([label, items]) => (
          <div className="nav-group" key={label}>
            <div className="nav-caption">{label}</div>
            <nav aria-label={label}>
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                  aria-current={activeTab === item.id ? "page" : undefined}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon name={item.icon} />
                  {item.label}
                  {activeTab === item.id && <span className="nav-dot" />}
                </button>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-mini">
          <span className="tiny-ring" />
          <span>
            Sắp xếp tốt hơn.
            <br />
            <strong>Vận hành thông minh hơn.</strong>
          </span>
        </div>
        <button
          className="sidebar-add"
          onClick={() => setActiveTab("ai-entry")}
        >
          <Icon name="plus" size={18} />
          Tạo giao dịch mới
        </button>
        <span className="sidebar-version">STOCKFLOW / GROUP 4</span>
      </div>
    </aside>
  );
}
