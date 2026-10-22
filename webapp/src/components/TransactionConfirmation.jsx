import React from 'react';

export default function TransactionConfirmation({
  extractedData,
  onChangeData,
  onConfirm,
  onCancel,
  isSubmitting,
  products = [],
  warehouses = [],
  suppliers = []
}) {
  if (!extractedData) return null;

  // Find currently matched product in DB to show real-time stock
  const matchedProduct = products.find(p =>
    (extractedData.productId && p.productId === extractedData.productId) ||
    (extractedData.productName && p.productName.toLowerCase() === extractedData.productName.trim().toLowerCase())
  );

  const isDispatch = (extractedData.transactionType || 'Receive').toLowerCase() === 'dispatch';
  const currentStock = matchedProduct ? matchedProduct.stockQuantity : null;
  const requestedQty = Number(extractedData.quantity) || 0;
  const isInsufficientStock = isDispatch && currentStock !== null && requestedQty > currentStock;

  const handleFieldChange = (field, value) => {
    const updated = { ...extractedData, [field]: value };

    // When changing product name from dropdown, auto-fill unit & productId
    if (field === 'productName') {
      const prod = products.find(p => p.productName.toLowerCase() === value.toLowerCase());
      if (prod) {
        updated.productId = prod.productId;
        updated.productExists = true;
        updated.unit = prod.unit;
      } else {
        updated.productId = null;
        updated.productExists = false;
      }
    }

    // When changing warehouse name from dropdown
    if (field === 'warehouseName') {
      const wh = warehouses.find(w => w.warehouseName.toLowerCase() === value.toLowerCase());
      if (wh) {
        updated.warehouseId = wh.warehouseId;
        updated.warehouseExists = true;
      } else {
        updated.warehouseId = null;
        updated.warehouseExists = false;
      }
    }

    // When changing supplier name from dropdown
    if (field === 'supplierName') {
      const sup = suppliers.find(s => s.supplierName.toLowerCase() === value.toLowerCase());
      if (sup) {
        updated.supplierId = sup.supplierId;
        updated.supplierExists = true;
      } else {
        updated.supplierId = null;
        updated.supplierExists = false;
      }
    }

    onChangeData(updated);
  };

  return (
    <div className="card" style={{ borderColor: 'var(--accent)', marginTop: 24, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)' }}>
      {/* Card Header & Verification Status */}
      <div className="card-header">
        <div>
          <h3 className="card-title" style={{ color: 'var(--accent)' }}>
            📝 Transaction Confirmation UI (Kiểm Tra & Xác Nhận)
          </h3>
          <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>
            Rà soát và chỉnh sửa thông số giao dịch trước khi cập nhật vào cơ sở dữ liệu SQL Server.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge ${extractedData.isValid ? 'badge-matched' : 'badge-unmatched'}`}>
            {extractedData.isValid ? '✓ Đã Đối Soát Với DB' : '⚠️ Cần Kiểm Tra Lại'}
          </span>
        </div>
      </div>

      {/* Ambiguity Alert Notice if applicable */}
      {extractedData.isAmbiguous && (
        <div className="alert alert-warning">
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong>Cảnh báo từ AI: Yêu cầu chưa đầy đủ hoặc còn mơ hồ</strong>
            <p style={{ marginTop: 4, fontSize: '0.88rem' }}>
              {extractedData.clarificationMessage || 'Yêu cầu thiếu các thông tin bắt buộc. Vui lòng bổ sung Sản phẩm, Kho và Số lượng vào các trường bên dưới.'}
            </p>
          </div>
        </div>
      )}

      {/* Database Reference Status Strip */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 16px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Sản phẩm:</span>
          {extractedData.productExists ? (
            <span className="badge badge-matched">✓ {extractedData.productName} (ID: #{extractedData.productId})</span>
          ) : (
            <span className="badge badge-unmatched">❌ Chưa có trong DB</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Kho hàng:</span>
          {extractedData.warehouseExists ? (
            <span className="badge badge-matched">✓ {extractedData.warehouseName} (ID: #{extractedData.warehouseId})</span>
          ) : (
            <span className="badge badge-unmatched">❌ Chưa có trong DB</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Nhà cung cấp:</span>
          {isDispatch ? (
            <span className="badge badge-neutral">ℹ️ Không bắt buộc cho Xuất kho</span>
          ) : extractedData.supplierExists ? (
            <span className="badge badge-matched">✓ {extractedData.supplierName} (ID: #{extractedData.supplierId})</span>
          ) : (
            <span className="badge badge-neutral">Chưa xác định</span>
          )}
        </div>
      </div>

      {/* Editable Fields Form */}
      <div className="form-grid">
        {/* Transaction Type */}
        <div className="form-field">
          <label className="form-label">
            Loại Giao Dịch <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            value={extractedData.transactionType || 'Receive'}
            onChange={(e) => handleFieldChange('transactionType', e.target.value)}
            style={{ fontWeight: 600 }}
          >
            <option value="Receive">📥 Nhập kho (Receive / Inbound)</option>
            <option value="Dispatch">📤 Xuất kho (Dispatch / Outbound)</option>
          </select>
        </div>

        {/* Product selection */}
        <div className="form-field">
          <label className="form-label">
            <span>Sản Phẩm <span style={{ color: 'var(--danger)' }}>*</span></span>
            {matchedProduct && (
              <span style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '0.75rem' }}>
                Tồn hiện tại: {matchedProduct.stockQuantity} {matchedProduct.unit}
              </span>
            )}
          </label>
          <input
            list="product-list"
            type="text"
            value={extractedData.productName || ''}
            placeholder="Chọn hoặc nhập tên sản phẩm..."
            onChange={(e) => handleFieldChange('productName', e.target.value)}
            style={{
              borderColor: extractedData.productExists ? 'var(--success)' : 'var(--border)'
            }}
          />
          <datalist id="product-list">
            {products.map(p => (
              <option key={p.productId} value={p.productName}>
                {p.productName} ({p.stockQuantity} {p.unit})
              </option>
            ))}
          </datalist>
        </div>

        {/* Quantity */}
        <div className="form-field">
          <label className="form-label">
            Số Lượng <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={extractedData.quantity ?? ''}
            onChange={(e) => handleFieldChange('quantity', e.target.value)}
            placeholder="Nhập số lượng > 0"
          />
        </div>

        {/* Unit */}
        <div className="form-field">
          <label className="form-label">Đơn Vị Tính</label>
          <input
            type="text"
            value={extractedData.unit || ''}
            placeholder="Ví dụ: box, kg, cái..."
            onChange={(e) => handleFieldChange('unit', e.target.value)}
          />
        </div>

        {/* Warehouse */}
        <div className="form-field">
          <label className="form-label">
            Kho Hàng Đích / Nguồn <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            list="warehouse-list"
            type="text"
            value={extractedData.warehouseName || ''}
            placeholder="Chọn hoặc nhập tên kho..."
            onChange={(e) => handleFieldChange('warehouseName', e.target.value)}
            style={{
              borderColor: extractedData.warehouseExists ? 'var(--success)' : 'var(--border)'
            }}
          />
          <datalist id="warehouse-list">
            {warehouses.map(w => (
              <option key={w.warehouseId} value={w.warehouseName} />
            ))}
          </datalist>
        </div>

        {/* Supplier */}
        <div className="form-field">
          <label className="form-label">
            Nhà Cung Cấp {isDispatch ? '(Không bắt buộc)' : ''}
          </label>
          <input
            list="supplier-list"
            type="text"
            value={extractedData.supplierName || ''}
            placeholder={isDispatch ? 'Tùy chọn khi xuất kho...' : 'Chọn hoặc nhập nhà cung cấp...'}
            onChange={(e) => handleFieldChange('supplierName', e.target.value)}
          />
          <datalist id="supplier-list">
            {suppliers.map(s => (
              <option key={s.supplierId} value={s.supplierName} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Stock Preview & Balance Projection */}
      {matchedProduct && (
        <div style={{
          background: isInsufficientStock ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${isInsufficientStock ? 'var(--danger)' : 'rgba(16, 185, 129, 0.25)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Dự kiến biến động tồn kho ({matchedProduct.productName}):
              </span>
              <div style={{ marginTop: 4, fontWeight: 600 }}>
                Tồn hiện tại: <strong>{currentStock} {matchedProduct.unit}</strong>
                {' ➔ '}
                {isDispatch ? (
                  <span style={{ color: isInsufficientStock ? 'var(--danger)' : 'var(--warning)' }}>
                    Xuất -{requestedQty} {matchedProduct.unit}
                    {' = '}
                    {currentStock - requestedQty} {matchedProduct.unit}
                  </span>
                ) : (
                  <span style={{ color: 'var(--success)' }}>
                    Nhập +{requestedQty} {matchedProduct.unit}
                    {' = '}
                    {currentStock + requestedQty} {matchedProduct.unit}
                  </span>
                )}
              </div>
            </div>

            {isInsufficientStock && (
              <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.9rem' }}>
                ❌ Cảnh báo: Tồn kho không đủ! Yêu cầu sẽ bị hệ thống từ chối.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onConfirm}
          disabled={isSubmitting || requestedQty <= 0 || !extractedData.productName || !extractedData.warehouseName}
          className="btn btn-success"
          style={{ padding: '10px 24px', fontSize: '0.95rem' }}
        >
          {isSubmitting ? 'Đang xác nhận...' : '✓ Confirm Transaction (Xác Nhận & Cập Nhật Tồn Kho)'}
        </button>

        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn btn-outline"
          style={{ padding: '10px 20px' }}
        >
          ✕ Cancel (Hủy Bỏ)
        </button>

        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          * Giao dịch được bảo toàn tính toàn vẹn ACID với SQL Server
        </span>
      </div>
    </div>
  );
}
