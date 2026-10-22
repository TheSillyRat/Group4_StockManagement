import React, { useState, useEffect, useRef } from "react";
import { inventoryApi } from "../services/api";
import CatalogAiChat from "../components/CatalogAiChat";

export default function ProductManagement({ onDataChange }) {
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoSync, setAutoSync] = useState(true);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef(null);
  useEffect(() => {
    if (!modalOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      modalRef.current?.querySelector("textarea") ||
      modalRef.current?.querySelector("input")
    )?.focus();
    const key = (event) => {
      if (event.key === "Escape" && !saving) setModalOpen(false);
      if (event.key === "Tab") {
        const nodes = [
          ...modalRef.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),textarea:not(:disabled)",
          ),
        ];
        if (!nodes.length) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === nodes[0]) {
          event.preventDefault();
          nodes[nodes.length - 1].focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === nodes[nodes.length - 1]
        ) {
          event.preventDefault();
          nodes[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      previousFocus?.focus();
    };
  }, [modalOpen, saving]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    productName: "",
    unit: "box",
    stockQuantity: 0,
  });

  // Modal State for Single Stock Query Inspection (R3)
  const [stockInspection, setStockInspection] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Status message
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Real-time polling effect (polls every 10 seconds if autoSync is active)
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      fetchProducts(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoSync]);

  const fetchProducts = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await inventoryApi.getProducts();
      if (Array.isArray(data)) {
        setProducts(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to load products", err);
      if (!isBackground) {
        showFeedback("error", "Failed to retrieve products from server.");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open Add Product Modal
  const handleOpenAdd = () => {
    setModalError("");
    setEditingProduct(null);
    setFormData({
      productName: "",
      unit: "",
      stockQuantity: 0,
    });
    setModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEdit = (product) => {
    setModalError("");
    setEditingProduct(product);
    setFormData({
      productName: product.productName,
      unit: product.unit,
      stockQuantity: product.stockQuantity,
    });
    setModalOpen(true);
  };

  // Submit Add or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (saving || aiBusy) return;
    if (!formData.productName.trim()) {
      setModalError("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (
      !formData.unit.trim() ||
      !Number.isInteger(Number(formData.stockQuantity)) ||
      Number(formData.stockQuantity) < 0
    ) {
      setModalError(
        "Vui lòng nhập đơn vị tính và số lượng tồn ban đầu là số nguyên không âm.",
      );
      return;
    }

    const payload = {
      productName: formData.productName.trim(),
      unit: formData.unit.trim(),
      stockQuantity: Number(formData.stockQuantity),
    };

    setSaving(true);
    setModalError("");
    try {
      if (editingProduct) {
        await inventoryApi.updateProduct(editingProduct.productId, payload);
        showFeedback(
          "success",
          `Product '${payload.productName}' updated successfully.`,
        );
      } else {
        await inventoryApi.createProduct(payload);
        showFeedback(
          "success",
          `Product '${payload.productName}' created successfully.`,
        );
      }
      setModalOpen(false);
      await fetchProducts();
      onDataChange?.();
    } catch (err) {
      setModalError(err.message || "Không thể lưu sản phẩm. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (product) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete '${product.productName}'?`,
    );
    if (!confirmDelete) return;

    try {
      await inventoryApi.deleteProduct(product.productId);
      showFeedback(
        "success",
        `Product '${product.productName}' deleted successfully.`,
      );
      await fetchProducts();
    } catch (err) {
      showFeedback("error", err.message || "Failed to delete product.");
    }
  };

  // Real-time Stock Inspection via R3 Stock Query API
  const handleInspectStock = async (productId) => {
    setInspectLoading(true);
    setStockInspection(null);
    try {
      const data = await inventoryApi.getProductStock(productId);
      setStockInspection({
        ...data,
        checkedAt: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      showFeedback(
        "error",
        "Could not query real-time stock for this product.",
      );
    } finally {
      setInspectLoading(false);
    }
  };

  // Filter products based on search term and stock filter
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.unit.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (stockFilter === "IN_STOCK") return p.stockQuantity > 0;
    if (stockFilter === "LOW_STOCK")
      return p.stockQuantity > 0 && p.stockQuantity < 50;
    if (stockFilter === "OUT_OF_STOCK") return p.stockQuantity === 0;

    return true;
  });

  // KPI Calculations
  const totalProducts = products.length;
  const totalUnits = products.reduce(
    (acc, p) => acc + (p.stockQuantity || 0),
    0,
  );
  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity < 50,
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

  return (
    <div>
      {/* Header & Controls */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: 4,
                color: "var(--text-primary)",
              }}
            >
              Product Management
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Real-time inventory levels, stock quantities, and catalog
              management.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Auto-Sync Indicator */}
            <div
              onClick={() => setAutoSync(!autoSync)}
              title="Click to toggle live auto-sync (polls every 10s)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                background: "#f1f5f9",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: "0.8rem",
                cursor: "pointer",
                userSelect: "none",
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: autoSync
                    ? "var(--success)"
                    : "var(--text-secondary)",
                }}
              />
              <span>
                {autoSync ? "Live Sync: ON (10s)" : "Live Sync: PAUSED"}
              </span>
            </div>

            <button
              onClick={() => fetchProducts()}
              disabled={loading}
              style={{
                padding: "8px 14px",
                background: "#f1f5f9",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={handleOpenAdd}
              style={{
                padding: "8px 16px",
                background: "var(--accent)",
                color: "#ffffff",
                fontWeight: 600,
                borderRadius: 6,
                fontSize: "0.85rem",
              }}
            >
              Add Product
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: "0.9rem",
              backgroundColor:
                feedback.type === "success" ? "#dcfce7" : "#fee2e2",
              color: feedback.type === "success" ? "#15803d" : "#b91c1c",
              border: `1px solid ${feedback.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Quick KPI Stats Cards */}
        <div className="stat-grid" style={{ marginTop: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Products</div>
            <div className="stat-value">{totalProducts}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Stock Quantity</div>
            <div className="stat-value" style={{ color: "var(--accent)" }}>
              {totalUnits.toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Low Stock (&lt; 50)</div>
            <div className="stat-value" style={{ color: "var(--warning)" }}>
              {lowStockCount}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Out of Stock</div>
            <div
              className="stat-value"
              style={{
                color:
                  outOfStockCount > 0
                    ? "var(--danger)"
                    : "var(--text-secondary)",
              }}
            >
              {outOfStockCount}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <input
            type="text"
            placeholder="Search by product name or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock (&gt; 0)</option>
            <option value="LOW_STOCK">Low Stock (&lt; 50)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0)</option>
          </select>

          {lastUpdated && (
            <span
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              Last sync: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Product Table */}
      <div className="card">
        {loading && products.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              padding: 24,
              color: "var(--text-secondary)",
            }}
          >
            Loading catalog...
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th>Product Name</th>
                  <th>Unit</th>
                  <th style={{ width: 160 }}>Current Stock</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 200, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: "var(--text-secondary)",
                      }}
                    >
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOutOfStock = p.stockQuantity <= 0;
                    const isLowStock =
                      p.stockQuantity > 0 && p.stockQuantity < 50;

                    let badgeClass = "badge-instock";
                    let statusLabel = "In Stock";
                    let stockColor = "var(--success)";

                    if (isOutOfStock) {
                      badgeClass = "badge-outstock";
                      statusLabel = "Out of Stock";
                      stockColor = "var(--danger)";
                    } else if (isLowStock) {
                      badgeClass = "badge-lowstock";
                      statusLabel = "Low Stock";
                      stockColor = "var(--warning)";
                    }

                    return (
                      <tr key={p.productId}>
                        <td
                          style={{
                            color: "var(--text-secondary)",
                            fontWeight: 600,
                          }}
                        >
                          #{p.productId}
                        </td>
                        <td>
                          <strong>{p.productName}</strong>
                        </td>
                        <td>{p.unit}</td>
                        <td>
                          <span
                            style={{
                              color: stockColor,
                              fontWeight: 700,
                              fontSize: "1.05rem",
                            }}
                          >
                            {p.stockQuantity.toLocaleString()}
                          </span>{" "}
                          <span
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: "0.85rem",
                            }}
                          >
                            {p.unit}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              onClick={() => handleInspectStock(p.productId)}
                              title="Query real-time stock directly from API"
                              style={{
                                padding: "5px 10px",
                                background: "#eff6ff",
                                color: "var(--accent)",
                                border: "1px solid #bfdbfe",
                                borderRadius: 4,
                                fontSize: "0.8rem",
                                fontWeight: 500,
                              }}
                            >
                              Check
                            </button>
                            <button
                              onClick={() => handleOpenEdit(p)}
                              title="Edit product details"
                              style={{
                                padding: "5px 10px",
                                background: "#f1f5f9",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border)",
                                borderRadius: 4,
                                fontSize: "0.8rem",
                                fontWeight: 500,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              title="Delete product"
                              style={{
                                padding: "5px 10px",
                                background: "#fef2f2",
                                color: "var(--danger)",
                                border: "1px solid #fecaca",
                                borderRadius: 4,
                                fontSize: "0.8rem",
                                fontWeight: 500,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit Product */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!saving) setModalOpen(false);
          }}
        >
          <div
            className="modal-content"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="product-modal-title"
              style={{ marginBottom: 16, color: "var(--text-primary)" }}
            >
              {editingProduct
                ? `Edit Product #${editingProduct.productId}`
                : "Add New Product"}
            </h3>
            {!editingProduct && (
              <CatalogAiChat
                entityType="product"
                disabled={saving}
                onBusyChange={setAiBusy}
                onApply={(result) =>
                  setFormData((current) => ({
                    ...current,
                    ...(result.productName
                      ? { productName: result.productName }
                      : {}),
                    ...(result.unit ? { unit: result.unit } : {}),
                    ...((Number.isInteger(result.stockQuantity) &&
                      result.stockQuantity >= 0) ||
                    result.isComplete
                      ? { stockQuantity: result.stockQuantity ?? 0 }
                      : {}),
                  }))
                }
              />
            )}
            <form onSubmit={handleSubmitForm}>
              <fieldset disabled={saving || aiBusy}>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span id="product-name-label">Product Name *</span>
                  </label>
                  <input
                    type="text"
                    aria-labelledby="product-name-label"
                    maxLength={200}
                    required
                    placeholder="e.g., Solar Panel 400W"
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData({ ...formData, productName: e.target.value })
                    }
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span id="product-unit-label">Unit of Measure *</span>
                  </label>
                  <input
                    type="text"
                    aria-labelledby="product-unit-label"
                    maxLength={50}
                    required
                    placeholder="e.g., box, kg, item, pack, roll"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span id="product-stock-label">
                      Current Stock Quantity *
                    </span>
                  </label>
                  <input
                    type="number"
                    aria-labelledby="product-stock-label"
                    step="1"
                    max="2147483647"
                    min="0"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stockQuantity: e.target.value,
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    style={{
                      padding: "8px 16px",
                      background: "#f1f5f9",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 18px",
                      background: "var(--accent)",
                      color: "#ffffff",
                      fontWeight: 600,
                      borderRadius: 6,
                    }}
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingProduct
                        ? "Save Changes"
                        : "Create Product"}
                  </button>
                </div>
              </fieldset>
              {modalError && (
                <p className="field-error" role="alert">
                  {modalError}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal: Live Stock Inspection (R3 Stock Query API Demo) */}
      {stockInspection && (
        <div
          className="modal-backdrop"
          onClick={() => setStockInspection(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: "1.2rem", color: "var(--accent)" }}>
                Live Stock Query
              </h3>
              <button
                onClick={() => setStockInspection(null)}
                style={{
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 4,
                }}
              >
                Close
              </button>
            </div>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                marginBottom: 16,
              }}
            >
              Direct live query response from{" "}
              <code>GET /api/products/{stockInspection.productId}/stock</code>:
            </p>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>Product:</span>{" "}
                <strong>{stockInspection.productName}</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  (#{stockInspection.productId})
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  Stock in Database:
                </span>{" "}
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--success)",
                  }}
                >
                  {stockInspection.stockQuantity}
                </span>{" "}
                <span>{stockInspection.unit}</span>
              </div>
              <div
                style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
              >
                Queried at: {stockInspection.checkedAt}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setStockInspection(null)}
                style={{
                  padding: "8px 16px",
                  background: "#f1f5f9",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
