import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Không thể tải danh sách kho: ' + (err.message || 'Lỗi kết nối máy chủ.')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    if (!newWarehouseName.trim()) {
      setNotification({ type: 'error', text: 'Vui lòng nhập tên kho hàng.' });
      return;
    }

    setSubmitting(true);
    setNotification(null);
    try {
      await inventoryApi.createWarehouse({ warehouseName: newWarehouseName.trim() });
      setNotification({
        type: 'success',
        text: `Đã thêm mới kho "${newWarehouseName.trim()}" thành công.`
      });
      setNewWarehouseName('');
      setShowAddModal(false);
      await fetchWarehouses();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Thêm kho thất bại.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async (warehouse) => {
    if (warehouse.transactionCount > 0) {
      setNotification({
        type: 'error',
        text: `Không thể xóa kho "${warehouse.warehouseName}" vì kho này đã phát sinh ${warehouse.transactionCount} giao dịch trong hệ thống.`
      });
      return;
    }

    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa kho "${warehouse.warehouseName}"?`);
    if (!confirmDelete) return;

    try {
      await inventoryApi.deleteWarehouse(warehouse.warehouseId);
      setNotification({
        type: 'success',
        text: `Đã xóa kho "${warehouse.warehouseName}" thành công.`
      });
      await fetchWarehouses();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Xóa kho thất bại.'
      });
    }
  };

  // Filtered warehouses by search term
  const filteredWarehouses = warehouses.filter(w =>
    w.warehouseName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    w.warehouseId.toString().includes(searchTerm.trim())
  );

  // Statistics
  const totalWarehouses = warehouses.length;
  const totalTransactions = warehouses.reduce((acc, curr) => acc + (curr.transactionCount || 0), 0);
  const mostActive = warehouses.slice().sort((a, b) => (b.transactionCount || 0) - (a.transactionCount || 0))[0];

  return (
    <div>
      {/* Metrics Summary Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            🏢
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalWarehouses}</span>
            <span className="stat-label">Tổng Số Điểm Kho</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            🔄
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalTransactions}</span>
            <span className="stat-label">Tổng Giao Dịch Ghi Nhận</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            ⭐
          </div>
          <div className="stat-info">
            <span className="stat-value" style={{ fontSize: '1.15rem' }}>
              {mostActive && mostActive.transactionCount > 0 ? mostActive.warehouseName : 'Chưa có dữ liệu'}
            </span>
            <span className="stat-label">
              Kho Hoạt Động Nhiều Nhất {mostActive && mostActive.transactionCount > 0 ? `(${mostActive.transactionCount} lượt)` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Main Warehouse Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">🏢 Warehouse Management</h2>
            <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>
              Quản lý danh sách các địa điểm kho hàng, theo dõi giao dịch và đăng ký kho mới.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setShowAddModal(true); setNotification(null); }}
              className="btn btn-primary"
            >
              + Thêm Kho Mới
            </button>
            <button
              onClick={fetchWarehouses}
              disabled={loading}
              className="btn btn-outline"
            >
              {loading ? 'Đang tải...' : '🔄 Làm mới'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`alert ${notification.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <span>{notification.type === 'error' ? '❌' : '✅'}</span>
            <div style={{ flex: 1 }}>{notification.text}</div>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'transparent', color: 'inherit', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Tìm kiếm theo tên kho hoặc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Hiển thị <strong>{filteredWarehouses.length}</strong> / {totalWarehouses} kho
          </span>
        </div>

        {/* Warehouses Table */}
        {loading && warehouses.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Đang tải danh sách kho...
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã Kho</th>
                  <th>Tên Kho Hàng</th>
                  <th style={{ width: 180 }}>Giao Dịch Ghi Nhận</th>
                  <th style={{ width: 140 }}>Trạng Thái</th>
                  <th style={{ width: 120, textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                      {searchTerm ? 'Không tìm thấy kho nào phù hợp với từ khóa.' : 'Chưa có kho hàng nào được đăng ký.'}
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map(w => (
                    <tr key={w.warehouseId}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{w.warehouseId}</td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          🏢 {w.warehouseName}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${w.transactionCount > 0 ? 'badge-receive' : 'badge-neutral'}`}>
                          {w.transactionCount} giao dịch
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-matched">
                          ● Sẵn sàng
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteWarehouse(w)}
                          title={w.transactionCount > 0 ? 'Kho đã có giao dịch, không thể xóa' : 'Xóa kho hàng'}
                          className="btn btn-danger-outline"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add New Warehouse */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                🏢 Thêm Kho Hàng Mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
                style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Tên kho hàng <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: Quang Trung Warehouse, Kho Tân Bình..."
                  value={newWarehouseName}
                  onChange={(e) => setNewWarehouseName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !newWarehouseName.trim()}
                >
                  {submitting ? 'Đang lưu...' : 'Thêm Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
