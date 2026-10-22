import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';
import TransactionConfirmation from '../components/TransactionConfirmation';

export default function AiInventoryEntry() {
  const [prompt, setPrompt] = useState('Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Reference data for auto-completing and real-time stock verification
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const [prods, whs, sups] = await Promise.all([
        inventoryApi.getProducts().catch(() => []),
        inventoryApi.getWarehouses().catch(() => []),
        inventoryApi.getSuppliers().catch(() => [])
      ]);
      setProducts(prods || []);
      setWarehouses(whs || []);
      setSuppliers(sups || []);
    } catch (err) {
      console.error('Failed to load initial catalog references', err);
    }
  };

  const samplePrompts = [
    {
      label: 'TC-01: Nhập 20 boxes Product A',
      text: 'Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse.',
      type: 'valid'
    },
    {
      label: 'TC-02: Xuất 15 boxes Product A',
      text: 'Dispatch 15 boxes of Product A from Binh Tan Warehouse.',
      type: 'valid'
    },
    {
      label: 'TC-03: Nhập 50 kg Product C',
      text: 'Receive 50 kg of Product C from Supplier Y into Thu Duc Warehouse.',
      type: 'valid'
    },
    {
      label: 'TC-04: Mơ hồ (Thiếu thông tin)',
      text: 'Send some items to warehouse.',
      type: 'ambiguous'
    }
  ];

  const handleExtract = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập câu lệnh giao dịch trước khi trích xuất.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await inventoryApi.extractFromAi(prompt.trim());
      setExtractedData(result);

      if (result.isAmbiguous) {
        setStatusMessage({
          type: 'warning',
          text: result.clarificationMessage || 'Yêu cầu còn mơ hồ hoặc thiếu dữ liệu. Vui lòng xem thông tin bên dưới.'
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Không thể kết nối đến AI Service: ' + (err.message || 'Lỗi không xác định.')
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!extractedData) return;

    const qty = Number(extractedData.quantity);
    if (!extractedData.productName || !extractedData.warehouseName || isNaN(qty) || qty <= 0) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng hoàn tất các thông tin bắt buộc: Tên sản phẩm, Kho hàng và Số lượng > 0.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        transactionType: extractedData.transactionType || 'Receive',
        productId: extractedData.productId || null,
        productName: extractedData.productName,
        supplierId: extractedData.supplierId || null,
        supplierName: extractedData.supplierName || null,
        warehouseId: extractedData.warehouseId || null,
        warehouseName: extractedData.warehouseName,
        quantity: qty
      };

      const res = await inventoryApi.confirmTransaction(payload);
      if (res && res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || `Giao dịch #${res.transactionId} đã được ghi nhận thành công và cập nhật tồn kho vào SQL Server.`
        });
        setExtractedData(null);
        // Refresh catalog reference to reflect new stock
        await loadReferences();
      } else {
        setStatusMessage({
          type: 'error',
          text: res?.message || 'Giao dịch bị từ chối do vi phạm ràng buộc dữ liệu hoặc tồn kho.'
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Lỗi trong quá trình xác nhận giao dịch: ' + (err.message || 'Lỗi hệ thống.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
    setStatusMessage(null);
  };

  return (
    <div>
      {/* Prompt Input Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">🤖 AI Inventory Entry (Giao Diện Nhập Prompt)</h2>
            <p className="card-subtitle" style={{ margin: '4px 0 0 0' }}>
              Mô tả yêu cầu nhập hoặc xuất kho bằng ngôn ngữ tự nhiên. Hệ thống sẽ tự động trích xuất các thông số giao dịch.
            </p>
          </div>
        </div>

        {/* Quick Sample Prompts */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            💡 Gợi ý câu lệnh mẫu (Click để thử nghiệm ngay):
          </span>
          <div className="chip-container">
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                type="button"
                className={`prompt-chip ${sp.type === 'ambiguous' ? 'warning' : ''}`}
                onClick={() => {
                  setPrompt(sp.text);
                  setStatusMessage(null);
                }}
              >
                {sp.type === 'ambiguous' ? '⚠️' : '⚡'} {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Natural Language Prompt Textarea */}
        <form onSubmit={handleExtract}>
          <textarea
            rows="3"
            style={{
              width: '100%',
              fontSize: '1rem',
              lineHeight: 1.5,
              resize: 'vertical',
              marginBottom: 14
            }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse..."
          />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="submit"
              disabled={isProcessing || !prompt.trim()}
              className="btn btn-primary"
              style={{ padding: '10px 22px' }}
            >
              {isProcessing ? '⏳ Đang Phân Tích Với Gemini AI...' : '⚡ Trích Xuất Bằng AI (Extract with AI)'}
            </button>

            <button
              type="button"
              onClick={() => { setPrompt(''); setExtractedData(null); setStatusMessage(null); }}
              className="btn btn-outline"
            >
              🗑️ Xóa prompt
            </button>
          </div>
        </form>

        {/* Global Notifications */}
        {statusMessage && (
          <div
            className={`alert ${
              statusMessage.type === 'error'
                ? 'alert-error'
                : statusMessage.type === 'warning'
                ? 'alert-warning'
                : 'alert-success'
            }`}
            style={{ marginTop: 20 }}
          >
            <span style={{ fontSize: '1.2rem' }}>
              {statusMessage.type === 'error' ? '❌' : statusMessage.type === 'warning' ? '⚠️' : '✅'}
            </span>
            <div style={{ flex: 1 }}>{statusMessage.text}</div>
            <button
              onClick={() => setStatusMessage(null)}
              style={{ background: 'transparent', color: 'inherit', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Transaction Confirmation UI Section */}
      {extractedData && (
        <TransactionConfirmation
          extractedData={extractedData}
          onChangeData={setExtractedData}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          products={products}
          warehouses={warehouses}
          suppliers={suppliers}
        />
      )}
    </div>
  );
}
