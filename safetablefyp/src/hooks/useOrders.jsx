<<<<<<< HEAD
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
=======
/**
 * Orders — backend-backed.
 *
 * Staff (kitchen/admin/manager) calls refreshKitchen() to load all active
 * orders. Customers call refreshForTable(n) to load their own.
 *
 * Backwards-compat: getAllOrders / getMyOrders / getActiveOrders exposed so
 * existing pages render unchanged.
 */
import { create } from "zustand";
import { ordersApi } from "@/lib/api";
import { useCustomerSession } from "@/hooks/useCustomerSession";

const normalize = (o) => ({
  orderId:       o.order_id,
  _id:           o._id,
  items: (o.items || []).map((i, idx) => ({
    id:          i.menu_item_id || `${o.order_id}-${idx}`,
    name:        i.name,
    price:       i.price,
    quantity:    i.quantity,
    customizations: i.customizations,
    notes:       i.special_instructions || null,
  })),
  totalPrice:    o.total_price,
  status:        o.status,
  paymentStatus: o.payment_status,
  createdAt:     o.created_at,
  updatedAt:     o.updated_at,
  tableNumber:   o.table_number,
  source:        o.order_source,
});

export const useOrders = create((set, get) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  tableNumber: useCustomerSession.getState().tableNumber,

  refreshKitchen: async () => {
    set({ loading: true, error: null });
    try {
      const r = await ordersApi.kitchenActive();
      set({ orders: (r.orders || []).map(normalize), loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  refreshForTable: async (tableNumber) => {
    if (!tableNumber) return;
    set({ loading: true, error: null });
    try {
      const r = await ordersApi.byTable(tableNumber);
      set({ orders: (r.orders || []).map(normalize), loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /** Place a customer order. items: [{ name, quantity, notes? }] */
  placeOrder: async (cartItems) => {
    const items = cartItems.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      special_instructions: i.notes || null,
    }));
    const created = await ordersApi.create(items);
    const norm = normalize(created);
    set((s) => ({ orders: [norm, ...s.orders], currentOrder: norm }));
    return norm;
  },

  updateOrderStatus: async (orderId, status) => {
    const allowed = new Set([
      "pending", "confirmed", "preparing", "ready", "completed", "cancelled",
    ]);
    const apiStatus = allowed.has(status) ? status : "ready";
    const updated = await ordersApi.updateStatus(orderId, apiStatus);
    const norm = normalize(updated);
    set((s) => ({
      orders: s.orders.map((o) => (o.orderId === orderId ? norm : o)),
      currentOrder: s.currentOrder?.orderId === orderId ? norm : s.currentOrder,
    }));
    return norm;
  },

  clearCurrentOrder: () => set({ currentOrder: null }),

  /* Legacy selectors */
  getAllOrders: () => get().orders,
  getMyOrders: () => {
    const tn = useCustomerSession.getState().tableNumber;
    if (!tn) return [];
    return get().orders.filter((o) => o.tableNumber === tn);
  },
  getActiveOrders: () => {
    const tn = useCustomerSession.getState().tableNumber;
    return get().orders.filter(
      (o) =>
        (!tn || o.tableNumber === tn) &&
        o.status !== "completed" &&
        o.status !== "cancelled",
    );
  },

}));

// Mirror customer-session.tableNumber into the orders store so existing
// `const { tableNumber } = useOrders()` destructuring keeps working.
useCustomerSession.subscribe((s, prev) => {
  if (s.tableNumber !== prev.tableNumber) {
    useOrders.setState({ tableNumber: s.tableNumber });
  }
});

export default useOrders;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
