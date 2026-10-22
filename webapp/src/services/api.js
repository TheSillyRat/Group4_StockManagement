const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(45000),
    });
  } catch (err) {
    throw new Error(
      err.name === "TimeoutError"
        ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại."
        : "Không kết nối được máy chủ. Vui lòng kiểm tra backend và thử lại.",
    );
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false)
    throw new Error(
      json?.message ||
        json?.detail ||
        (res.status >= 500
          ? "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau."
          : "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường."),
    );
  return json;
}
export const inventoryApi = {
  getProductById: (id) => request(`/products/${id}`),
  createProduct: (data) =>
    request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  getProductStock: (id) => request(`/products/${id}/stock`),
  getAllProductsStock: () => request("/products/stock"),
  getProducts: () => request("/products"),
  getWarehouses: () => request("/warehouses"),
  getSuppliers: () => request("/suppliers"),
  createWarehouse: (data) =>
    request("/warehouses", { method: "POST", body: JSON.stringify(data) }),
  updateWarehouse: (id, data) =>
    request(`/warehouses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWarehouse: (id) => request(`/warehouses/${id}`, { method: "DELETE" }),
  extractFromAi: (prompt) =>
    request("/inventory/ai-extract", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
  confirmTransaction: (data) =>
    request("/inventory/confirm", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getTransactionHistory: () => request("/inventory/history"),
};
