import { create } from 'zustand';
import { persist } from 'zustand/middleware';

































const generateOrderId = () => {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
};

// Generate a random table number for this customer session (1-20)
const getInitialTableNumber = () => Math.floor(Math.random() * 20) + 1;

export const useOrders = create()(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,
      tableNumber: getInitialTableNumber(),

      addOrder: (items, totalPrice) => {
        const { tableNumber } = get();
        const newOrder = {
          orderId: generateOrderId(),
          items,
          totalPrice,
          status: 'pending',
          createdAt: new Date(),
          tableNumber // Use the session's table number
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
          currentOrder: newOrder
        }));

        return newOrder;
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((order) =>
          order.orderId === orderId ? { ...order, status } : order
          ),
          currentOrder:
          state.currentOrder?.orderId === orderId ?
          { ...state.currentOrder, status } :
          state.currentOrder
        }));
      },

      getMyOrders: () => {
        const { orders, tableNumber } = get();
        return orders.filter((order) => order.tableNumber === tableNumber);
      },

      getActiveOrders: () => {
        const { orders, tableNumber } = get();
        return orders.filter(
          (order) => order.tableNumber === tableNumber && order.status !== 'completed'
        );
      },

      getAllOrders: () => {
        const { orders } = get();
        return orders;
      },

      clearCurrentOrder: () => set({ currentOrder: null }),

      setTableNumber: (table) => set({ tableNumber: table })
    }),
    {
      name: 'restaurant-orders',
      skipHydration: true // We'll handle hydration manually
    }
  )
);

// Initialize persistence
useOrders.persist.rehydrate();

// Listen for storage changes to sync across tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'restaurant-orders') {
    useOrders.persist.rehydrate();
  }
});