import React, { useState } from 'react';
import { inventoryApi } from '../services/api';

export default function AiInventoryEntry() {
  const [prompt, setPrompt] = useState('Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setStatusMessage({ type: 'error', text: 'Prompt cannot be empty.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await inventoryApi.extractFromAi(prompt);
      setExtractedData(result);

      if (result.isAmbiguous) {
        setStatusMessage({
          type: 'warning',
          text: result.clarificationMessage || 'Prompt is ambiguous. Missing required transaction parameters.'
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error extracting inventory details from AI service.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!extractedData) return;

    // Validation check prior to submission
    if (!extractedData.productName || !extractedData.warehouseName || Number(extractedData.quantity) <= 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please complete all required fields (Product, Warehouse, and Quantity > 0) before confirming.'
      });
      return;
    }

    try {
      const payload = {
        transactionType: extractedData.transactionType || 'Receive',
        productId: extractedData.productId || null,
        productName: extractedData.productName,
        supplierId: extractedData.supplierId || null,
        supplierName: extractedData.supplierName || null,
        warehouseId: extractedData.warehouseId || null,
        warehouseName: extractedData.warehouseName,
        quantity: Number(extractedData.quantity)
      };

      const res = await inventoryApi.confirmTransaction(payload);
      if (res && res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || 'Transaction successfully confirmed and stock updated in SQL Server.'
        });
        setExtractedData(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: res?.message || 'Failed to confirm transaction due to inventory constraints.'
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network or server error while confirming transaction.' });
    }
  };

  return (
    <div>
      <div className="card">
        <h3>AI Inventory Entry (R2, R4)</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px 0' }}>
          Describe an inventory transaction in natural language (Receive / Dispatch products).
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
              borderRadius: 6,
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            {isProcessing ? 'Processing with Gemini...' : 'Extract with AI'}
          </button>
        </form>

        {statusMessage && (
          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 6,
            background: statusMessage.type === 'error'
              ? 'rgba(239, 68, 68, 0.2)'
              : statusMessage.type === 'warning'
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(16, 185, 129, 0.2)',
            color: statusMessage.type === 'error'
              ? '#f87171'
              : statusMessage.type === 'warning'
                ? '#fbbf24'
                : '#34d399',
            border: `1px solid ${statusMessage.type === 'error' ? '#ef4444' : statusMessage.type === 'warning' ? '#f59e0b' : '#10b981'}`
          }}>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Review and Confirmation Form (R4.6, R5) */}
      {extractedData && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Review & Confirm Extracted Transaction (R4.6, R5)</h3>
            <span style={{
              fontSize: '0.85rem',
              padding: '4px 8px',
              borderRadius: 4,
              backgroundColor: extractedData.isValid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: extractedData.isValid ? '#34d399' : '#f87171'
            }}>
              {extractedData.isValid ? 'Database References Verified' : 'Unverified / Ambiguous'}
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Verify extracted parameters before committing the transaction to SQL Server.
          </p>

          {extractedData.isAmbiguous && (
            <div style={{
              marginBottom: 16,
              padding: 10,
              borderRadius: 4,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              color: '#fbbf24',
              fontSize: '0.9rem'
            }}>
              <strong>Ambiguity Notice:</strong> {extractedData.clarificationMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transaction Type</label>
              <select
                style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 4, background: '#1e293b', color: '#f8fafc', border: '1px solid var(--border)' }}
                value={extractedData.transactionType || 'Receive'}
                onChange={(e) => setExtractedData({ ...extractedData, transactionType: e.target.value })}
              >
                <option value="Receive">Receive (Import)</option>
                <option value="Dispatch">Dispatch (Export)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Product Name {extractedData.productExists ? ' (Matched)' : ' (Not in DB)'}
              </label>
              <input
                style={{
                  width: '100%',
                  marginTop: 4,
                  border: extractedData.productExists ? '1px solid #10b981' : '1px solid #ef4444'
                }}
                value={extractedData.productName || ''}
                onChange={(e) => setExtractedData({ ...extractedData, productName: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Quantity</label>
              <input
                type="number"
                min="1"
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
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Supplier {extractedData.supplierExists ? ' (Matched)' : ''}
              </label>
              <input
                style={{ width: '100%', marginTop: 4 }}
                value={extractedData.supplierName || ''}
                placeholder="Optional for Dispatch"
                onChange={(e) => setExtractedData({ ...extractedData, supplierName: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Warehouse {extractedData.warehouseExists ? ' (Matched)' : ' (Not in DB)'}
              </label>
              <input
                style={{
                  width: '100%',
                  marginTop: 4,
                  border: extractedData.warehouseExists ? '1px solid #10b981' : '1px solid #ef4444'
                }}
                value={extractedData.warehouseName || ''}
                onChange={(e) => setExtractedData({ ...extractedData, warehouseName: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleConfirm}
              style={{
                padding: '10px 24px',
                background: 'var(--success)',
                color: 'white',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Confirm & Update Stock
            </button>
            <button
              onClick={() => setExtractedData(null)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
