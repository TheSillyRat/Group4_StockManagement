import React, { useState } from 'react';
import { inventoryApi } from '../services/api';

export default function AiInventoryEntry() {
  const [prompt, setPrompt] = useState('Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // TODO [Member 4 & Member 3]: Implement AI submit flow
  const handleExtract = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await inventoryApi.extractFromAi(prompt);
      setExtractedData(result);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error extracting inventory details from AI.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // TODO [Member 4 & Member 2]: Implement confirmation & stock update
  const handleConfirm = async () => {
    if (!extractedData) return;
    try {
      const payload = {
        transactionType: extractedData.transactionType,
        productId: 1, // Map to selected product ID
        supplierId: 1, // Map to selected supplier ID
        warehouseId: 1, // Map to selected warehouse ID
        quantity: Number(extractedData.quantity)
      };
      await inventoryApi.confirmTransaction(payload);
      setStatusMessage({ type: 'success', text: 'Transaction successfully confirmed & stock updated!' });
      setExtractedData(null);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to confirm transaction.' });
    }
  };

  return (
    <div>
      <div className="card">
        <h3>AI Inventory Entry (R2, R4)</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px 0' }}>
          Describe an inventory transaction in natural language (e.g., Receive / Dispatch products).
        </p>

        <form onSubmit={handleExtract}>
          <textarea
            rows="3"
            style={{ width: '100%', marginBottom: 12, resize: 'vertical' }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your inventory request here..."
          />
          <button
            type="submit"
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--accent)',
              color: '#0f172a',
              fontWeight: 700,
              borderRadius: 6
            }}
          >
            {isProcessing ? 'Processing with Gemini...' : '✨ Extract with AI'}
          </button>
        </form>

        {statusMessage && (
          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 6,
            background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: statusMessage.type === 'error' ? '#f87171' : '#34d399'
          }}>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Review and Confirmation Form (R4.6, R5) */}
      {extractedData && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <h3>Review & Confirm Extracted Transaction (R4.6, R5)</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Please verify the extracted parameters before committing the transaction to the database.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transaction Type</label>
              <input
                style={{ width: '100%', marginTop: 4 }}
                value={extractedData.transactionType || ''}
                onChange={(e) => setExtractedData({ ...extractedData, transactionType: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Product Name</label>
              <input
                style={{ width: '100%', marginTop: 4 }}
                value={extractedData.productName || ''}
                onChange={(e) => setExtractedData({ ...extractedData, productName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Quantity</label>
              <input
                type="number"
                style={{ width: '100%', marginTop: 4 }}
                value={extractedData.quantity || 0}
                onChange={(e) => setExtractedData({ ...extractedData, quantity: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unit</label>
              <input
                style={{ width: '100%', marginTop: 4 }}
                value={extractedData.unit || ''}
                onChange={(e) => setExtractedData({ ...extractedData, unit: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supplier</label>
              <input
                style={{ width: '100%', marginTop: 4 }}
                value={extractedData.supplierName || ''}
                onChange={(e) => setExtractedData({ ...extractedData, supplierName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Warehouse</label>
              <input
                style={{ width: '100%', marginTop: 4 }}
                value={extractedData.warehouseName || ''}
                onChange={(e) => setExtractedData({ ...extractedData, warehouseName: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleConfirm}
              style={{ padding: '10px 24px', background: 'var(--success)', color: 'white', borderRadius: 6, fontWeight: 700 }}
            >
              ✅ Confirm & Update Stock
            </button>
            <button
              onClick={() => setExtractedData(null)}
              style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
