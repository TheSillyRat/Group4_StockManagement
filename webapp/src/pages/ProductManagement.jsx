import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO [Member 4 / Frontend Dev]: Fetch products and display current stock quantities
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>Product Management (R2)</h3>
        <button onClick={fetchProducts} style={{ padding: '6px 12px', background: 'var(--border)', color: 'white', borderRadius: 4 }}>
          Refresh
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Displays all registered products along with their real-time stock quantities.
      </p>

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Unit</th>
              <th>Current Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No products found</td>
              </tr>
            ) : (
              products.map(p => (
                <tr key={p.productId}>
                  <td>#{p.productId}</td>
                  <td><strong>{p.productName}</strong></td>
                  <td>{p.unit}</td>
                  <td style={{ color: p.stockQuantity < 10 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                    {p.stockQuantity}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
