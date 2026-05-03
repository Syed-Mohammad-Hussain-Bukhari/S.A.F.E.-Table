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