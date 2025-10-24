// client/app/services/api.js
import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // KHÔNG redirect 401 cho các request auth, để Login/Register tự hiển thị lỗi chính xác
    const status = error.response?.status
    const url = error.config?.url || ""
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register")

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getCurrentUser: () => api.get("/auth/me"),
}

// Products API
export const productsAPI = {
  getProducts: (params) => api.get("/products", { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  getRecommendations: (id) => api.get(`/products/${id}/recommendations`),
}

// Cart API
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart", data),
  updateCartItem: (itemId, data) => api.put(`/cart/${itemId}`, data),
  removeFromCart: (itemId) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete("/cart"),
}

// Orders API
export const ordersAPI = {
  createOrder: (data) => api.post("/orders", data),
  getOrders: () => api.get("/orders"),
  getOrderById: (id) => api.get(`/orders/${id}`),
}

// Admin API
export const adminAPI = {
  // Products
  createProduct: (data) => api.post("/admin/products", data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),

  // Variations
  createVariation: (productId, data) => api.post(`/admin/products/${productId}/variations`, data),
  updateVariation: (productId, variationId, data) =>
    api.put(`/admin/products/${productId}/variations/${variationId}`, data),
  deleteVariation: (productId, variationId) => api.delete(`/admin/products/${productId}/variations/${variationId}`),

  // Orders
  getOrders: (params) => api.get("/admin/orders", { params }),
  updateOrderStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),

  // Users
  getUsers: (params) => api.get("/admin/users", { params }),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Categories
  getCategories: () => api.get("/admin/categories"), // Lấy tất cả categories
  createCategory: (data) => api.post("/admin/categories", data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
}
export const geoAPI = {
  // Trả về nhẹ: chỉ lấy id + name; có thể thêm q, limit nếu BE hỗ trợ
  getProvinces: (params = {}) =>
    api.get("/provinces", { params: { fields: "province_id,name", ...params } }),

  // Lấy phường theo province_id
  getWards: (province_id, params = {}) =>
    api.get("/wards", { params: { province_id, fields: "ward_id,name,province_id", ...params } }),
}
export default api
