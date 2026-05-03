/**
 * S.A.F.E Table — Centralized API Client
 * All backend API calls go through this file.
 *
 * Base URL: http://localhost:8000 (FastAPI backend)
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const menu = await api.getMenu();
 *   const result = await api.voiceOrder({ transcript: 'I want a steak', table_number: 1 });
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Auth Token Helper ────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem("safetable_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let error;
    try {
      const body = await response.json();
      error = body.detail || body.message || `HTTP ${response.status}`;
    } catch {
      error = `HTTP ${response.status}`;
    }
    throw new Error(error);
  }

  return response.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export const authApi = {
  /** Login with username/password. Stores token to localStorage. */
  login: async (username, password) => {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (data.access_token) {
      localStorage.setItem("safetable_token", data.access_token);
      localStorage.setItem("safetable_role", data.role);
      localStorage.setItem("safetable_user", JSON.stringify(data));
    }
    return data;
  },

  /** Get current logged-in user profile. */
  me: () => request("/api/auth/me"),

  /** Change password. */
  changePassword: (current_password, new_password) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  /** Logout — clears localStorage. */
  logout: () => {
    localStorage.removeItem("safetable_token");
    localStorage.removeItem("safetable_role");
    localStorage.removeItem("safetable_user");
  },

  /** Returns parsed user object or null. */
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem("safetable_user"));
    } catch {
      return null;
    }
  },

  isLoggedIn: () => !!localStorage.getItem("safetable_token"),
  getRole: () => localStorage.getItem("safetable_role"),
};

// ─── Menu ─────────────────────────────────────────────────────────────────

export const menuApi = {
  /** Get all available menu items. Optional category filter. */
  getMenu: (category = null) => {
    const params = category ? `?category=${category}` : "";
    return request(`/api/menu${params}`);
  },

  /** Get all menu categories. */
  getCategories: () => request("/api/menu/categories"),

  /** Get a single menu item by ID. */
  getItem: (id) => request(`/api/menu/${id}`),

  /** Create a menu item (admin). */
  createItem: (data) =>
    request("/api/menu", { method: "POST", body: JSON.stringify(data) }),

  /** Update a menu item (admin). */
  updateItem: (id, data) =>
    request(`/api/menu/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  /** Delete a menu item (admin). */
  deleteItem: (id) =>
    request(`/api/menu/${id}`, { method: "DELETE" }),
};

// ─── Orders ───────────────────────────────────────────────────────────────

export const ordersApi = {
  /** Place a new order. */
  createOrder: (orderData) =>
    request("/api/orders", { method: "POST", body: JSON.stringify(orderData) }),

  /** Get order by ID. */
  getOrder: (orderId) => request(`/api/orders/${orderId}`),

  /** Get all orders for a table. */
  getTableOrders: (tableNumber) => request(`/api/orders/table/${tableNumber}`),

  /** Get active orders for a table. */
  getActiveTableOrders: (tableNumber) =>
    request(`/api/orders/table/${tableNumber}/active`),

  /** Update order status (kitchen/admin). */
  updateStatus: (orderId, status) =>
    request(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /** Get all active kitchen orders. */
  getKitchenOrders: () => request("/api/orders/kitchen/active"),

  /** Get kitchen stats. */
  getKitchenStats: () => request("/api/orders/kitchen/stats"),
};

// ─── Voice ────────────────────────────────────────────────────────────────

export const voiceApi = {
  /**
   * Send a voice order (audio file or text transcript).
   * Uses FormData to support audio upload.
   */
  voiceOrder: async ({ audio = null, transcript = null, table_number = 1, language = "en" }) => {
    const formData = new FormData();
    if (audio) formData.append("audio", audio);
    if (transcript) formData.append("transcript", transcript);
    formData.append("table_number", String(table_number));
    formData.append("language", language);

    const token = localStorage.getItem("safetable_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${BASE_URL}/api/voice/order`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /** Get AI recommendations for a table. */
  getRecommendations: (tableNumber, preferences = null) =>
    request("/api/voice/recommend", {
      method: "POST",
      body: JSON.stringify({ table_number: tableNumber, preferences }),
    }),
};

// ─── AI Chatbot ───────────────────────────────────────────────────────────

export const chatbotApi = {
  /** Send a message to SAGE (the AI chatbot). */
  chat: (sessionId, message, language = "en", tableNumber = null) =>
    request("/api/chatbot/chat", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        message,
        language,
        table_number: tableNumber,
      }),
    }),

  /** Get chat history for a session. */
  getHistory: (sessionId) => request(`/api/chatbot/history/${sessionId}`),

  /** Clear chat history. */
  clearHistory: (sessionId) =>
    request(`/api/chatbot/history/${sessionId}`, { method: "DELETE" }),

  /** Get personalized recommendations. */
  getRecommendations: (tableNumber, preferences = null) =>
    request(`/api/chatbot/recommendations?table_number=${tableNumber}${preferences ? `&preferences=${preferences}` : ""}`),
};

// ─── Languages ────────────────────────────────────────────────────────────

export const languagesApi = {
  /** List all supported languages. */
  getLanguages: () => request("/api/languages"),

  /** Detect language of text. */
  detect: (text) =>
    request("/api/languages/detect", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  /** Translate text to target language. */
  translate: (text, targetLanguage, sourceLanguage = null) =>
    request("/api/languages/translate", {
      method: "POST",
      body: JSON.stringify({ text, target_language: targetLanguage, source_language: sourceLanguage }),
    }),
};

// ─── Payments ─────────────────────────────────────────────────────────────

export const paymentsApi = {
  /** Generate QR code payment (existing system). */
  generateQR: (orderId, amount, method = "qr_code") =>
    request("/api/payments/generate-qr", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId, amount, method }),
    }),

  /** Confirm a payment. */
  confirmPayment: (paymentId) =>
    request("/api/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ payment_id: paymentId }),
    }),

  /** Get payment details. */
  getPayment: (paymentId) => request(`/api/payments/${paymentId}`),
};

// ─── Stripe Payments ──────────────────────────────────────────────────────

export const stripeApi = {
  /** Create Stripe PaymentIntent + QR code. */
  createPaymentIntent: (orderId, amount, currency = "usd", tableNumber = null) =>
    request("/api/stripe/create-payment-intent", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        amount,
        currency,
        table_number: tableNumber,
      }),
    }),

  /** Check payment status. */
  getPaymentStatus: (paymentIntentId) =>
    request(`/api/stripe/payment-status/${paymentIntentId}`),

  /** Generate a QR code for any URL/data. */
  generateQR: (data) =>
    request(`/api/stripe/generate-qr?data=${encodeURIComponent(data)}`),
};

// ─── Ambience ─────────────────────────────────────────────────────────────

export const ambienceApi = {
  /** Get ambience settings for a table. */
  getAmbience: (tableNumber) => request(`/api/ambience/${tableNumber}`),

  /** Update ambience settings. */
  updateAmbience: (tableNumber, settings) =>
    request(`/api/ambience/${tableNumber}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  /** Apply a preset (default, romantic_dinner, family_gathering, business_meeting, celebration). */
  applyPreset: (tableNumber, preset) =>
    request(`/api/ambience/${tableNumber}/preset/${preset}`, { method: "POST" }),
};

// ─── Feedback ─────────────────────────────────────────────────────────────

export const feedbackApi = {
  /** Submit customer feedback. */
  submit: (orderId, tableNumber, text, rating) =>
    request("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId, table_number: tableNumber, text, rating }),
    }),

  /** Get all feedback (admin). */
  getAll: (limit = 50, skip = 0) =>
    request(`/api/feedback?limit=${limit}&skip=${skip}`),

  /** Get feedback stats (admin). */
  getStats: () => request("/api/feedback/stats"),
};

// ─── Staff ────────────────────────────────────────────────────────────────

export const staffApi = {
  /** List all staff. */
  list: (role = null) => request(`/api/staff${role ? `?role=${role}` : ""}`),

  /** Create new staff member. */
  create: (data) =>
    request("/api/staff", { method: "POST", body: JSON.stringify(data) }),

  /** Get staff by username. */
  get: (username) => request(`/api/staff/${username}`),

  /** Update staff member. */
  update: (username, data) =>
    request(`/api/staff/${username}`, { method: "PUT", body: JSON.stringify(data) }),

  /** Delete staff member. */
  delete: (username) =>
    request(`/api/staff/${username}`, { method: "DELETE" }),

  /** Get pending approvals. */
  getPendingApprovals: () => request("/api/staff/approvals/pending"),

  /** Approve a request. */
  approve: (id) =>
    request(`/api/staff/approvals/${id}/approve`, { method: "POST" }),

  /** Reject a request. */
  reject: (id, reason = "") =>
    request(`/api/staff/approvals/${id}/reject?reason=${encodeURIComponent(reason)}`, {
      method: "POST",
    }),
};

// ─── Tasks ────────────────────────────────────────────────────────────────

export const tasksApi = {
  /** List tasks with optional filters. */
  list: (filters = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null))
    ).toString();
    return request(`/api/tasks${params ? `?${params}` : ""}`);
  },

  /** Create a task. */
  create: (data) =>
    request("/api/tasks", { method: "POST", body: JSON.stringify(data) }),

  /** Get task by ID. */
  get: (taskId) => request(`/api/tasks/${taskId}`),

  /** Update task status. */
  updateStatus: (taskId, status, notes = null) =>
    request(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }),

  /** Delete task. */
  delete: (taskId) =>
    request(`/api/tasks/${taskId}`, { method: "DELETE" }),
};

// ─── Sales / Reports ──────────────────────────────────────────────────────

export const salesApi = {
  /** Get sales summary (today/week/month). */
  getSummary: (period = "today") =>
    request(`/api/sales/summary?period=${period}`),

  /** Get top selling items. */
  getTopItems: (period = "month", limit = 10) =>
    request(`/api/sales/top-items?period=${period}&limit=${limit}`),

  /** Get daily revenue chart data. */
  getRevenueChart: (days = 30) =>
    request(`/api/sales/revenue-chart?days=${days}`),
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────

export const adminApi = {
  /** Get dashboard stats. */
  getDashboardStats: () => request("/api/admin/dashboard/stats"),

  /** Get order history (admin). */
  getOrderHistory: (skip = 0, limit = 50, status = null) => {
    const params = new URLSearchParams({ skip, limit, ...(status ? { status } : {}) });
    return request(`/api/admin/orders/history?${params}`);
  },
};

// ─── Tables ───────────────────────────────────────────────────────────────

export const tablesApi = {
  /** Create a new dining session. */
  createSession: (tableNumber, language = "en") =>
    request("/api/tables/session", {
      method: "POST",
      body: JSON.stringify({ table_number: tableNumber, language }),
    }),

  /** Get active session for a table. */
  getSession: (tableNumber) => request(`/api/tables/${tableNumber}/session`),

  /** End active session. */
  endSession: (tableNumber) =>
    request(`/api/tables/${tableNumber}/end-session`, { method: "POST" }),

  /** Get all active tables. */
  getActiveTables: () => request("/api/tables/active"),
};

// ─── Health ───────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => request("/health"),
};

// ─── Default Export — all APIs in one object ─────────────────────────────

export const api = {
  auth: authApi,
  menu: menuApi,
  orders: ordersApi,
  voice: voiceApi,
  chatbot: chatbotApi,
  languages: languagesApi,
  payments: paymentsApi,
  stripe: stripeApi,
  ambience: ambienceApi,
  feedback: feedbackApi,
  staff: staffApi,
  tasks: tasksApi,
  sales: salesApi,
  admin: adminApi,
  tables: tablesApi,
  health: healthApi,
};

export default api;
