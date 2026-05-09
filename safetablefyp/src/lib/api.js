/**
<<<<<<< HEAD
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
=======
 * S.A.F.E. Table — Single canonical API client.
 *
 * Talks to the FastAPI backend. Every page/component goes through this file.
 * Auth headers are attached automatically by an interceptor — never set them
 * manually elsewhere.
 *
 * Storage keys (intentional — read elsewhere):
 *   safetable_token         → staff JWT (Bearer)   — set on login, cleared on logout
 *   safetable_user          → cached /me response  — refreshed on bootstrap
 *   safetable_ticket        → customer ticket JWT  — issued by /api/tables/session
 *   safetable_session       → { table_number, session_id } for the customer flow
 */

const RAW_API_URL = import.meta.env.VITE_API_URL ?? "";
// Strip any trailing slash so concatenation `${BASE}/api/...` always works.
export const API_BASE = RAW_API_URL.replace(/\/+$/, "");

// ─── Storage helpers (single source of truth) ─────────────────────────────

export const tokenStore = {
  get: () => localStorage.getItem("safetable_token"),
  set: (t) => localStorage.setItem("safetable_token", t),
  clear: () => localStorage.removeItem("safetable_token"),
};

export const userCache = {
  get: () => {
    try { return JSON.parse(localStorage.getItem("safetable_user") || "null"); }
    catch { return null; }
  },
  set: (u) => localStorage.setItem("safetable_user", JSON.stringify(u)),
  clear: () => localStorage.removeItem("safetable_user"),
};

export const customerTicket = {
  get: () => localStorage.getItem("safetable_ticket"),
  set: (t) => localStorage.setItem("safetable_ticket", t),
  clear: () => localStorage.removeItem("safetable_ticket"),
};

export const customerSession = {
  get: () => {
    try { return JSON.parse(localStorage.getItem("safetable_session") || "null"); }
    catch { return null; }
  },
  set: (s) => localStorage.setItem("safetable_session", JSON.stringify(s)),
  clear: () => localStorage.removeItem("safetable_session"),
};

// ─── Core request helper (interceptor pattern) ────────────────────────────

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/**
 * Make a JSON request to the backend.
 *
 * @param {string} path      starts with `/api/...`
 * @param {object} options
 * @param {string} options.method
 * @param {object} options.body          serialized as JSON
 * @param {object} options.params        appended as querystring
 * @param {boolean} options.withTicket   attach X-Customer-Ticket
 * @param {boolean} options.withAuth     attach Authorization (default true if token exists)
 * @param {object} options.headers
 */
async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    params,
    withTicket = false,
    withAuth = true,
    headers = {},
  } = options;

  let url = `${API_BASE}${path}`;
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    );
    if ([...qs].length) url += `?${qs.toString()}`;
  }

  const finalHeaders = { Accept: "application/json", ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (withAuth) {
    const token = tokenStore.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }
  if (withTicket) {
    const ticket = customerTicket.get();
    if (ticket) finalHeaders["X-Customer-Ticket"] = ticket;
  }

  const init = { method, headers: finalHeaders };
  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    throw new ApiError(`Network error contacting ${url}: ${err.message}`, 0, null);
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try { data = await response.json(); } catch { /* empty body */ }
  } else if (response.status !== 204) {
    try { data = await response.text(); } catch { /* ignore */ }
  }

  if (!response.ok) {
    const detail =
      (data && (data.detail || data.message)) ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${response.status}`;
    if (response.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(detail, response.status, data);
  }

  return data;
}

const get   = (path, opts) => request(path, { ...opts, method: "GET" });
const post  = (path, body, opts) => request(path, { ...opts, method: "POST", body });
const put   = (path, body, opts) => request(path, { ...opts, method: "PUT", body });
const patch = (path, body, opts) => request(path, { ...opts, method: "PATCH", body });
const del   = (path, opts) => request(path, { ...opts, method: "DELETE" });

// ─── WebSocket helper ─────────────────────────────────────────────────────

const WS_OVERRIDE = import.meta.env.VITE_WS_URL ?? "";
function buildWsUrl(path, query) {
  const origin = WS_OVERRIDE
    || (API_BASE
        ? API_BASE.replace(/^http/, "ws")
        : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`);
  const qs = query
    ? "?" + new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null)
      ).toString()
    : "";
  return `${origin}${path}${qs}`;
}

/** Open a kitchen WebSocket. Caller wires onmessage / onclose. */
export function openKitchenSocket() {
  const token = tokenStore.get();
  return new WebSocket(buildWsUrl("/ws/kitchen", { token }));
}

/** Open a customer-table WebSocket. Caller wires onmessage / onclose. */
export function openCustomerSocket(tableNumber, sessionId) {
  return new WebSocket(buildWsUrl(`/ws/customer/${tableNumber}`, { session_id: sessionId }));
}

// ─── Namespaced helpers — every backend route covered ─────────────────────

export const authApi = {
  login: async (username, password) => {
    const data = await post("/api/auth/login", { username, password }, { withAuth: false });
    if (data?.access_token) tokenStore.set(data.access_token);
    return data;
  },
  signup: (payload) => post("/api/auth/signup", payload, { withAuth: false }),
  me: () => get("/api/auth/me"),
  logout: async () => {
    try { await post("/api/auth/logout"); } catch { /* server-side is a no-op */ }
    tokenStore.clear();
    userCache.clear();
  },
  changePassword: (current_password, new_password) =>
    post("/api/auth/change-password", { current_password, new_password }),
};

export const menuApi = {
  list: (params = {}) => get("/api/menu", { params }),
  categories: () => get("/api/menu/categories"),
  get: (id) => get(`/api/menu/${id}`),
  create: (data) => post("/api/menu", data),
  update: (id, data) => put(`/api/menu/${id}`, data),
  remove: (id) => del(`/api/menu/${id}`),
};

export const ordersApi = {
  /** Customer order placement — uses the customer ticket. */
  create: (items) => post("/api/orders", { items }, { withTicket: true, withAuth: false }),
  get: (orderId) => get(`/api/orders/${orderId}`, { withTicket: true }),
  byTable: (tableNumber) => get(`/api/orders/table/${tableNumber}`, { withTicket: true }),
  activeByTable: (tableNumber) =>
    get(`/api/orders/table/${tableNumber}/active`, { withTicket: true }),
  /** Staff: transition status. */
  updateStatus: (orderId, status) => patch(`/api/orders/${orderId}/status`, { status }),
  /** Kitchen views (staff). */
  kitchenActive: () => get("/api/orders/kitchen/active"),
  kitchenStats: () => get("/api/orders/kitchen/stats"),
};

export const voiceApi = {
  order: ({ audio = null, transcript = null, language = "en" } = {}) => {
    const fd = new FormData();
    const ticket = customerTicket.get();
    if (ticket) fd.append("customer_ticket", ticket);
    if (audio) fd.append("audio", audio, "voice.webm");
    if (transcript) fd.append("transcript", transcript);
    fd.append("language", language);
    return post("/api/voice/order", fd, { withAuth: false });
  },
};

export const chatbotApi = {
  chat: ({ session_id, message, language = "en", table_number = null, context = null }) =>
    post("/api/chatbot/chat", { session_id, message, language, table_number, context },
         { withTicket: true }),
  history: (sessionId, limit = 50) =>
    get(`/api/chatbot/history/${encodeURIComponent(sessionId)}`, {
      params: { limit }, withTicket: true,
    }),
  clear: (sessionId) =>
    del(`/api/chatbot/history/${encodeURIComponent(sessionId)}`),
  recommendations: (table_number, preferences = null) =>
    post("/api/chatbot/recommendations", null, { params: { table_number, preferences } }),
};

export const languagesApi = {
  list: () => get("/api/languages"),
  detect: (text) => post("/api/languages/detect", { text }),
  translate: (text, target_language, source_language = null) =>
    post("/api/languages/translate", { text, target_language, source_language }),
};

export const paymentsApi = {
  generateQR: (order_id, method = "qr_code") =>
    post("/api/payments/generate-qr", { order_id, method }, { withTicket: true }),
  confirm: (payment_id) => post("/api/payments/confirm", { payment_id }),
  get: (paymentId) => get(`/api/payments/${paymentId}`),
  byOrder: (orderId) => get(`/api/payments/order/${orderId}`),
};

export const stripeApi = {
  createPaymentIntent: ({ order_id, currency = "usd", description = null, table_number = null }) =>
    post("/api/stripe/create-payment-intent",
         { order_id, currency, description, table_number },
         { withTicket: true }),
  paymentStatus: (intentId) => get(`/api/stripe/payment-status/${intentId}`),
  generateQR: (data) => post("/api/stripe/generate-qr", { data }),
  /** Dev simulator — only mounted on the backend when ENV != production. */
  simulate: (order_id, amount) => get("/api/stripe/simulate", { params: { order_id, amount } }),
};

export const ambienceApi = {
  get: (tableNumber) => get(`/api/ambience/${tableNumber}`),
  update: (tableNumber, settings) => put(`/api/ambience/${tableNumber}`, settings),
  applyPreset: (tableNumber, preset) =>
    post(`/api/ambience/${tableNumber}/preset/${encodeURIComponent(preset)}`),
};

export const feedbackApi = {
  submit: ({ order_id, table_number, text, rating }) =>
    post("/api/feedback", { order_id, table_number, text, rating },
         { withTicket: true, withAuth: false }),
  list: (limit = 50, skip = 0) => get("/api/feedback", { params: { limit, skip } }),
  stats: () => get("/api/feedback/stats"),
};

export const staffApi = {
  list: ({ role, active_only } = {}) =>
    get("/api/staff", { params: { role, active_only } }),
  create: (data) => post("/api/staff", data),
  get: (username) => get(`/api/staff/${encodeURIComponent(username)}`),
  update: (username, data) => put(`/api/staff/${encodeURIComponent(username)}`, data),
  remove: (username) => del(`/api/staff/${encodeURIComponent(username)}`),
  pendingApprovals: () => get("/api/staff/approvals/pending"),
  approve: (id) => post(`/api/staff/approvals/${encodeURIComponent(id)}/approve`),
  reject: (id, reason = "") =>
    post(`/api/staff/approvals/${encodeURIComponent(id)}/reject`, null, { params: { reason } }),
};

export const tasksApi = {
  list: (filters = {}) => get("/api/tasks", { params: filters }),
  create: (data) => post("/api/tasks", data),
  get: (taskId) => get(`/api/tasks/${encodeURIComponent(taskId)}`),
  updateStatus: (taskId, status, notes = null) =>
    patch(`/api/tasks/${encodeURIComponent(taskId)}/status`, { status, notes }),
  remove: (taskId) => del(`/api/tasks/${encodeURIComponent(taskId)}`),
};

export const salesApi = {
  summary: (period = "today") => get("/api/sales/summary", { params: { period } }),
  topItems: (period = "month", limit = 10) =>
    get("/api/sales/top-items", { params: { period, limit } }),
  revenueChart: (days = 30) => get("/api/sales/revenue-chart", { params: { days } }),
};

export const adminApi = {
  dashboardStats: () => get("/api/admin/dashboard/stats"),
  orderHistory: ({ skip = 0, limit = 50, status } = {}) =>
    get("/api/admin/orders/history", { params: { skip, limit, status } }),
};

export const tablesApi = {
  /** Staff opens a session — returns { session_id, customer_ticket, … }. */
  createSession: (table_number, language = "en") =>
    post("/api/tables/session", { table_number, language }),
  getSession: (table_number) => get(`/api/tables/${table_number}/session`),
  endSession: (table_number) => post(`/api/tables/${table_number}/end-session`),
  active: () => get("/api/tables/active"),
  /** Customer-side: confirm the ticket maps to a still-live session. */
  mySession: () => get("/api/tables/me/session", { withTicket: true, withAuth: false }),
  /** Dev only — bootstraps a session WITHOUT staff auth (backend gates on ENV). */
  devSession: (table_number, language = "en") =>
    post("/api/tables/dev-session", null, {
      params: { table_number, language }, withAuth: false,
    }),
};

export const models3dApi = {
  list: () => get("/api/models3d"),
  get: (modelId) => get(`/api/models3d/${encodeURIComponent(modelId)}`),
  byMenuItem: (itemName) =>
    get(`/api/models3d/menu-item/${encodeURIComponent(itemName)}`),
};

export const healthApi = {
  check: () => get("/health"),
};

// ─── Default — namespaced bag (back-compat with `api.<thing>.<verb>(…)`) ──
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

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
<<<<<<< HEAD
  health: healthApi,
};

export default api;
=======
  models3d: models3dApi,
  health: healthApi,

  // raw verbs for one-offs
  get, post, put, patch, delete: del,

  // sockets
  openKitchenSocket,
  openCustomerSocket,
};

export default api;
export { ApiError };
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
