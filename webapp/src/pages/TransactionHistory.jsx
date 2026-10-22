import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

export default function TransactionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'Receive' | 'Dispatch'
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getTransactionHistory();
      // Ensure data is array
      const list = Array.isArray(data) ? data : (data?.value || []);
      setHistory(list);
    } catch (err) {
      setError('Không thể tải lịch sử giao dịch: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  };

  // KPI Computations
  const totalTransactions = history.length;
  const receiveCount = history.filter(h => h.transactionType?.toLowerCase() === 'receive').length;
  const dispatchCount = history.filter(h => h.transactionType?.toLowerCase() === 'dispatch').length;
  const totalQuantityMoved = history.reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);

  // Filtered List
  const filteredHistory = history.filter(item => {
    const matchesType =
      filterType === 'ALL' ||
      item.transactionType?.toLowerCase() === filterType.toLowerCase();

    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      item.transactionId?.toString().includes(searchLower) ||
      item.productName?.toLowerCase().includes(searchLower) ||
      item.warehouseName?.toLowerCase().includes(searchLower) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(searchLower));

    return matchesType && matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      {/* KPI Metrics Summary Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            📊
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalTransactions}</span>
            <span className="stat-label">Tổng Giao Dịch Đã Ghi</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            📥
          </div>
          <div className="stat-info">
            <span className="stat-value">{receiveCount}</span>
            <span className="stat-label">Lượt Nhập Kho (Receive)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            📤
          </div>
          <div className="stat-info">
            <span className="stat-value">{dispatchCount}</span>
            <span className="stat-label">Lượt Xuất Kho (Dispatch)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            📦
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalQuantityMoved}</span>
            <span className="stat-label">Tổng Đơn Vị Luân Chuyển</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">📜 Transaction History (Nhật Ký Giao Dịch)</h2>
            <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>
              Danh sách chi tiết tất cả giao dịch kho được bảo vệ tính toàn vẹn ACID trong SQL Server.
            </p>
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="btn btn-outline"
          >
            {loading ? 'Đang tải...' : '🔄 Làm mới'}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <span>❌</span>
            <div style={{ flex: 1 }}>{error}</div>
            <button
              onClick={() => setError(null)}
              style={{ background: 'transparent', color: 'inherit', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Toolbar: Filters & Search */}
        <div className="toolbar">
          <div className="filter-group">
            <button
              type="button"
              className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              Tất cả ({totalTransactions})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === 'Receive' ? 'active' : ''}`}
              onClick={() => setFilterType('Receive')}
            >
              📥 Nhập kho ({receiveCount})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === 'Dispatch' ? 'active' : ''}`}
              onClick={() => setFilterType('Dispatch')}
            >
              📤 Xuất kho ({dispatchCount})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Tìm theo sản phẩm, kho, nhà cung cấp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Hiển thị: <strong>{filteredHistory.length}</strong> / {totalTransactions}
            </span>
          </div>
        </div>

        {/* Data Table */}
        {loading && history.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Đang tải dữ liệu lịch sử giao dịch...
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã GD</th>
                  <th style={{ width: 130 }}>Loại Giao Dịch</th>
                  <th>Sản Phẩm</th>
                  <th style={{ width: 140 }}>Biến Động Tồn</th>
                  <th>Kho Hàng</th>
                  <th>Nhà Cung Cấp</th>
                  <th style={{ width: 180 }}>Thời Gian Ghi Nhận</th>
                  <th style={{ width: 110 }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                      {searchTerm || filterType !== 'ALL'
                        ? 'Không tìm thấy giao dịch nào khớp với điều kiện lọc.'
                        : 'Chưa có bản ghi giao dịch nào được lưu trong hệ thống.'}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(item => {
                    const isReceive = item.transactionType?.toLowerCase() === 'receive';
                    return (
                      <tr key={item.transactionId}>
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          #{item.transactionId}
                        </td>
                        <td>
                          <span className={`badge ${isReceive ? 'badge-receive' : 'badge-dispatch'}`}>
                            {isReceive ? '📥 Receive' : '📤 Dispatch'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.productName}</strong>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: isReceive ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {isReceive ? `+${item.quantity}` : `-${item.quantity}`} {item.unit}
                          </span>
                        </td>
                        <td>🏢 {item.warehouseName}</td>
                        <td>{item.supplierName ? `🚚 ${item.supplierName}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatDate(item.createdAt)}
                        </td>
                        <td>
                          <span className="badge badge-matched" style={{ fontSize: '0.72rem' }}>
                            ✓ Đã Ghi DB
                          </span>
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
    </div>
  );
}
