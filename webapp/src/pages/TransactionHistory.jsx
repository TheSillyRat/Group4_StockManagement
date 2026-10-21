import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

export default function TransactionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO [Member 4 / Frontend Dev]: Fetch confirmed transaction history
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getTransactionHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load transaction history', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>Transaction History (R2, R3)</h3>
        <button onClick={fetchHistory} style={{ padding: '6px 12px', background: 'var(--border)', color: 'white', borderRadius: 4 }}>
          Refresh
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Log of all verified and committed inventory operations.
      </p>

      {loading ? (
        <p>Loading history...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Supplier</th>
              <th>Warehouse</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No transaction records found.
                </td>
              </tr>
            ) : (
              history.map(item => (
                <tr key={item.transactionId}>
                  <td>#{item.transactionId}</td>
                  <td>
                    <span className={`badge ${item.transactionType?.toLowerCase() === 'receive' ? 'badge-receive' : 'badge-dispatch'}`}>
                      {item.transactionType}
                    </span>
                  </td>
                  <td>{item.productName}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{item.supplierName || '—'}</td>
                  <td>{item.warehouseName}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
