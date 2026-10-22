import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);

  const filteredProducts = products.filter(p =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    p.productId.toString().includes(searchTerm.trim())
  );

  return (
    <div>
      {/* Metric Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            📦
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalProducts}</span>
            <span className="stat-label">Tổng Danh Mục Sản Phẩm</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            📊
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalStock}</span>
            <span className="stat-label">Tổng Lượng Tồn Kho</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">📦 Product Management (Quản Lý Sản Phẩm)</h2>
            <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>
              Danh mục các mặt hàng trong kho và số lượng tồn thực tế cập nhật theo thời gian thực.
            </p>
          </div>

          <button onClick={fetchProducts} disabled={loading} className="btn btn-outline">
            {loading ? 'Đang tải...' : '🔄 Làm mới'}
          </button>
        </div>

        {/* Search */}
        <div className="toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Tìm kiếm sản phẩm theo tên hoặc mã ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Hiển thị <strong>{filteredProducts.length}</strong> / {totalProducts} sản phẩm
          </span>
        </div>

        {loading && products.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách sản phẩm...</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã SP</th>
                  <th>Tên Sản Phẩm</th>
                  <th style={{ width: 140 }}>Đơn Vị Tính</th>
                  <th style={{ width: 160 }}>Số Lượng Tồn Kho</th>
                  <th style={{ width: 140 }}>Tình Trạng</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                      Không tìm thấy sản phẩm nào.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(p => (
                    <tr key={p.productId}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{p.productId}</td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>📦 {p.productName}</strong>
                      </td>
                      <td>{p.unit}</td>
                      <td>
                        <strong style={{
                          color: p.stockQuantity <= 10 ? 'var(--danger)' : p.stockQuantity < 50 ? 'var(--warning)' : 'var(--success)',
                          fontSize: '1rem'
                        }}>
                          {p.stockQuantity} {p.unit}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${p.stockQuantity > 20 ? 'badge-matched' : 'badge-unmatched'}`}>
                          {p.stockQuantity > 20 ? '● Sẵn hàng' : '⚠️ Sắp hết'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
