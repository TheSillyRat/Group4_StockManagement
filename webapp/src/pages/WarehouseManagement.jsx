import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO [Member 4 / Frontend Dev]: Fetch available warehouses
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>Warehouse Management (R2)</h3>
        <button onClick={fetchWarehouses} style={{ padding: '6px 12px', background: 'var(--border)', color: 'white', borderRadius: 4 }}>
          Refresh
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Displays all available warehouse locations for inventory transactions.
      </p>

      {loading ? (
        <p>Loading warehouses...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Warehouse ID</th>
              <th>Warehouse Name</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No warehouses found</td>
              </tr>
            ) : (
              warehouses.map(w => (
                <tr key={w.warehouseId}>
                  <td>#{w.warehouseId}</td>
                  <td><strong>{w.warehouseName}</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
