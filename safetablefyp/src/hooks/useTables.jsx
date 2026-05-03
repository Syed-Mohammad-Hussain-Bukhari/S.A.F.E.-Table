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