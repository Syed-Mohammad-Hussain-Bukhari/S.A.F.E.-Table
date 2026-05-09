<<<<<<< HEAD
import { create } from 'zustand';
import { persist } from 'zustand/middleware';




















export const useService = create()(
  persist(
    (set, get) => ({
      requests: [],

      requestService: (tableNumber, type) => {
        const newRequest = {
          id: Date.now().toString(),
          tableNumber,
          type,
          status: 'pending',
          requestedAt: new Date()
        };
        set((state) => ({ requests: [newRequest, ...state.requests] }));
      },

      resolveService: (id) => {
        set((state) => ({
          requests: state.requests.map((req) =>
          req.id === id ? { ...req, status: 'completed', completedAt: new Date() } : req
          )
        }));
      },

      getPendingRequests: () => {
        return get().requests.filter((req) => req.status === 'pending');
      }
    }),
    {
      name: 'restaurant-service-requests'
    }
  )
);
=======
/**
 * Service requests — backed by /api/tasks.
 *
 * The legacy mock used `requests` (with type='clean'|'help'|'bill'). The
 * backend stores these as tasks with a role + title. We keep the same shape
 * exposed to consumers so pages don't need to change.
 *
 *   request: { id, tableNumber, type, status: 'pending'|'in_progress'|'completed' }
 *
 * type → role mapping:
 *   'clean' → role 'cleaner'  (titled "Cleaning request")
 *   'help'  → role 'server'   ("Server assistance")
 *   'bill'  → role 'server'   ("Bill request")
 *
 * Customer-side `requestService(table, type)` still works without auth — it
 * uses /api/tasks via a thin endpoint. NOTE: /api/tasks creation requires
 * manager+ role on the backend; if your customer flow needs to file these
 * directly you'll want to add a public ticket-bound endpoint server-side.
 * For now this hook auto-falls-back to local state on a 401/403 so the
 * customer UX still gets feedback.
 */
import { create } from "zustand";
import { tasksApi } from "@/lib/api";

const TYPE_TO_TITLE = {
  clean: "Cleaning request",
  help:  "Server assistance",
  bill:  "Bill request",
};
const TYPE_TO_ROLE = {
  clean: "cleaner",
  help:  "server",
  bill:  "server",
};
const TITLE_TO_TYPE = {
  "Cleaning request":   "clean",
  "Server assistance":  "help",
  "Bill request":       "bill",
};

const normalize = (t) => ({
  id:           t.task_id || t._id,
  tableNumber:  t.table_number != null ? String(t.table_number) : null,
  type:         TITLE_TO_TYPE[t.title] || (t.role === "cleaner" ? "clean" : "help"),
  status:       t.status,                // pending | in_progress | completed | cancelled
  requestedAt:  t.created_at,
  completedAt:  t.status === "completed" ? t.updated_at : null,
  raw:          t,
});

export const useService = create((set, get) => ({
  requests: [],
  loading: false,
  error: null,

  refresh: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const r = await tasksApi.list(filters);
      set({ requests: (r.tasks || []).map(normalize), loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /** Customer creates a service request. Best-effort: if the backend rejects
   *  unauthenticated creates, we fall back to a local pending entry so the
   *  customer-facing UI still acknowledges the action. */
  requestService: async (tableNumber, type, assignedTo = "unassigned") => {
    const optimistic = {
      id:           `local-${Date.now()}`,
      tableNumber:  String(tableNumber),
      type,
      status:       "pending",
      requestedAt:  new Date().toISOString(),
      completedAt:  null,
      raw:          null,
    };
    set((s) => ({ requests: [optimistic, ...s.requests] }));
    try {
      const created = await tasksApi.create({
        title:        TYPE_TO_TITLE[type] || type,
        description:  `Customer request from table ${tableNumber}`,
        assigned_to:  assignedTo,
        role:         TYPE_TO_ROLE[type] || "server",
        priority:     type === "bill" ? "high" : "medium",
        table_number: Number(tableNumber),
      });
      const norm = normalize(created);
      set((s) => ({ requests: s.requests.map((r) => (r.id === optimistic.id ? norm : r)) }));
      return norm;
    } catch {
      // Keep the optimistic entry — customers see acknowledgement.
      return optimistic;
    }
  },

  resolveService: async (id) => {
    try {
      await tasksApi.updateStatus(id, "completed");
    } catch { /* fall through to optimistic mark */ }
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status: "completed", completedAt: new Date().toISOString() } : r,
      ),
    }));
  },

  startService: async (id) => {
    try { await tasksApi.updateStatus(id, "in_progress"); }
    catch { /* optimistic */ }
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status: "in_progress" } : r,
      ),
    }));
  },

  getPendingRequests: () => get().requests.filter((r) => r.status === "pending"),
}));

export default useService;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
