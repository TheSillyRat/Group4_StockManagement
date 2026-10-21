const API_BASE_URL = 'http://localhost:5000/api';

export const inventoryApi = {
  // Product endpoints
  getProducts: async () => {
    const res = await fetch(`${API_BASE_URL}/products`);
    return res.json();
  },

  // Warehouse endpoints
  getWarehouses: async () => {
    const res = await fetch(`${API_BASE_URL}/warehouses`);
    return res.json();
  },

  // Supplier endpoints
  getSuppliers: async () => {
    const res = await fetch(`${API_BASE_URL}/suppliers`);
    return res.json();
  },

  // AI Extraction endpoint (R4)
  extractFromAi: async (prompt) => {
    const res = await fetch(`${API_BASE_URL}/inventory/ai-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return res.json();
  },

  // Confirm transaction endpoint (R5)
  confirmTransaction: async (data) => {
    const res = await fetch(`${API_BASE_URL}/inventory/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Transaction history endpoint (R3)
  getTransactionHistory: async () => {
    const res = await fetch(`${API_BASE_URL}/inventory/history`);
    return res.json();
  }
};
