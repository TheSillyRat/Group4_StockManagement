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
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(45000)])
        : AbortSignal.timeout(45000),
    });
  } catch (err) {
    throw new Error(
      err.name === "TimeoutError"
        ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại."
        : "Không kết nối được máy chủ. Vui lòng kiểm tra backend và thử lại.",
    );
  }
  const json = await res.json().catch(() => {
    throw new Error(
      "Máy chủ trả về dữ liệu không hợp lệ. Vui lòng kiểm tra cấu hình API hoặc khởi động lại frontend.",
    );
  });
  if (json === null) {
    throw new Error("API chưa trả về dữ liệu. Vui lòng thử lại.");
  }
  if (!res.ok || json?.success === false) {
    const error = new Error(
      json?.message ||
        json?.detail ||
        (res.status >= 500
          ? "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau."
          : "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường."),
    );
    error.dispatchOptions = json?.dispatchOptions;
    throw error;
  }
  return json;
}
export const inventoryApi = {
  extractCatalog: (entityType, messages, signal) =>
    request("/catalog/ai-extract", {
      method: "POST",
      body: JSON.stringify({ entityType, messages }),
      signal,
    }),
  getProductById: (id) => request(`/products/${id}`),
  createProduct: (data) =>
    request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  getProductStock: (id) => request(`/products/${id}/stock`),
  getAllProductsStock: () => request("/products/stock"),
  getProducts: (warehouseId) =>
    request(`/products${warehouseId ? `?warehouseId=${warehouseId}` : ""}`),
  getWarehouseStock: (id) => request(`/warehouses/${id}/stock`),
  getDispatchOptions: (
    productId,
    warehouseId,
    quantity,
    signal,
    destinationWarehouseId,
  ) =>
    request(
      `/inventory/dispatch-options?productId=${productId}&warehouseId=${warehouseId}&quantity=${quantity}${destinationWarehouseId ? `&destinationWarehouseId=${destinationWarehouseId}` : ""}`,
      { signal },
    ),
  transferStock: (data) =>
    request("/inventory/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createSupplier: (data) =>
    request("/suppliers", { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (id, data) =>
    request(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: "DELETE" }),
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
