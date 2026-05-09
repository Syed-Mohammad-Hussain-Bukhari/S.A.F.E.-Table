<<<<<<< HEAD
import { create } from 'zustand';
import { persist } from 'zustand/middleware';




















export const useTables = create()(
  persist(
    (set, get) => ({
      tables: [],

      initializeTables: (count) => {
        const currentTables = get().tables;
        if (!currentTables || currentTables.length === 0) {
          const newTables = Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            status: 'available',
            seats: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2, // Varied seats
            zone: i < count * 0.6 ? 'Main Hall' : i < count * 0.8 ? 'Patio' : 'VIP', // Varied zones
            lastUpdated: Date.now()
          }));
          set({ tables: newTables });
        }
      },

      updateStatus: (id, status) => {
        set((state) => ({
          tables: state.tables.map((table) =>
          table.id === id ? { ...table, status, lastUpdated: Date.now() } : table
          )
        }));
      },

      addTable: (seats, zone = 'Main Hall') => {
        set((state) => {
          const newId = state.tables.length > 0 ? Math.max(...state.tables.map((t) => t.id)) + 1 : 1;
          return {
            tables: [...state.tables, {
              id: newId,
              status: 'available',
              seats,
              zone,
              lastUpdated: Date.now()
            }]
          };
        });
      },

      removeTable: (id) => {
        set((state) => ({
          tables: state.tables.filter((table) => table.id !== id)
        }));
      }
    }),
    {
      name: 'restaurant-tables'
    }
  )
);
=======
/**
 * Tables — backend-backed via /api/tables.
 *
 * The previous mock managed an arbitrary tables collection client-side
 * (id, status, seats, zone). The backend models *sessions* per table_number,
 * not tables themselves. We expose:
 *   tables: [{ id, status, lastUpdated }]      derived from active sessions
 *   refresh(): loads /api/tables/active
 *   updateStatus(id, status): no-op for `available`/`occupied`; ends the
 *     active session for `available`, opens one for `occupied` (staff-only).
 */
import { create } from "zustand";
import { tablesApi } from "@/lib/api";

const fromSession = (s) => ({
  id:          s.table_number,
  status:      s.is_active ? "occupied" : "available",
  zone:        s.language === "en" ? "Main Hall" : "Patio",
  seats:       4,
  lastUpdated: s.updated_at || s.created_at || new Date().toISOString(),
  raw:         s,
});

export const useTables = create((set, get) => ({
  tables: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const r = await tablesApi.active();
      const active = (r.active_tables || []).map(fromSession);
      // Pad up to 20 tables for the floor-plan UI; mark unseen ones available.
      const byId = new Map(active.map((t) => [t.id, t]));
      const display = Array.from({ length: 20 }, (_, i) => {
        const id = i + 1;
        return byId.get(id) || {
          id,
          status: "available",
          seats: 4,
          zone: "Main Hall",
          lastUpdated: new Date().toISOString(),
        };
      });
      set({ tables: display, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /** Compatibility no-op for the old `initializeTables(count)` call. */
  initializeTables: () => get().refresh(),

  updateStatus: async (id, status) => {
    try {
      if (status === "available") {
        await tablesApi.endSession(id);
      } else if (status === "occupied") {
        await tablesApi.createSession(id);
      }
    } catch (err) {
      // Customers don't have staff auth — silently swallow; staff sees the
      // backend error if they attempt this from the floor plan.
      console.warn("[useTables] updateStatus failed:", err.message);
    }
    await get().refresh();
  },
}));

export default useTables;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
