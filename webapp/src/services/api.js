const API_BASE_URL = 'http://localhost:5000/api';

export const inventoryApi = {
  // Product endpoints
  getProducts: async () => {
    const res = await fetch(`${API_BASE_URL}/products`);
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
  },

  // Warehouse endpoints
  getWarehouses: async () => {
    const res = await fetch(`${API_BASE_URL}/warehouses`);
    if (!res.ok) throw new Error('Failed to load warehouses');
    return res.json();
  },

  createWarehouse: async (data) => {
    const res = await fetch(`${API_BASE_URL}/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to create warehouse');
    }
    return json;
  },

  updateWarehouse: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/warehouses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update warehouse');
    }
    return json;
  },

  deleteWarehouse: async (id) => {
    const res = await fetch(`${API_BASE_URL}/warehouses/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete warehouse');
    }
    return json;
  },

  // Supplier endpoints
  getSuppliers: async () => {
    const res = await fetch(`${API_BASE_URL}/suppliers`);
    if (!res.ok) throw new Error('Failed to load suppliers');
    return res.json();
  },

  // AI Extraction endpoint (R4)
  extractFromAi: async (prompt) => {
    const res = await fetch(`${API_BASE_URL}/inventory/ai-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'AI extraction failed');
    }
    return json;
  },

  // Confirm transaction endpoint (R5)
  confirmTransaction: async (data) => {
    const res = await fetch(`${API_BASE_URL}/inventory/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json;
  },

  // Transaction history endpoint (R3)
  getTransactionHistory: async () => {
    const res = await fetch(`${API_BASE_URL}/inventory/history`);
    if (!res.ok) throw new Error('Failed to load transaction history');
    return res.json();
  }
};
