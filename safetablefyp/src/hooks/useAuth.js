<<<<<<< HEAD
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
































export const useAuth = create()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      pendingUsers: [],
      approvedUsers: [],

      login: (role, credential, identifier) => {
        if (role === 'admin') {
          if (credential === 'admin123' && (identifier === 'admin' || identifier === 'admin@safe.com')) {
            set({ user: { id: 'admin', role: 'admin', name: 'Administrator' }, isAuthenticated: true });
            return { success: true };
          }
          return { success: false, message: 'Invalid Admin Credentials' };
        }

        if (role === 'kitchen' || role === 'cleaner' || role === 'server' || role === 'manager') {

          // Force refresh from localStorage to handle multi-tab synchronization
          try {
            const stored = localStorage.getItem('auth-storage');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.state && parsed.state.approvedUsers) {
                // Sync local state with storage to prevent overwriting with stale data
                set({ approvedUsers: parsed.state.approvedUsers, pendingUsers: parsed.state.pendingUsers || [] });
              }
            }
          } catch (e) {
            console.error("Failed to sync auth state", e);
          }

          const { approvedUsers } = get();
          
          // Find user by identifier and role first
          const existingUserIndex = approvedUsers.findIndex((u) => 
            (u.email === identifier || u.username === identifier) && u.role === role
          );

          if (existingUserIndex !== -1) {
            const staffUser = approvedUsers[existingUserIndex];

            if (staffUser.status === 'locked') {
              return { success: false, message: 'Account is locked due to too many failed attempts (5/5). Please contact Admin.' };
            }

            if (staffUser.status === 'suspended') {
              return { success: false, message: 'Your account is suspended. Please contact Admin.' };
            }

            // Check PIN
            if (staffUser.pin === credential) {
              // Success: Reset failed attempts for this user
              const updatedUsers = [...approvedUsers];
              updatedUsers[existingUserIndex] = { ...staffUser, failedAttempts: 0 };
              set({ approvedUsers: updatedUsers, user: updatedUsers[existingUserIndex], isAuthenticated: true });
              return { success: true };
            } else {
              // Failure: Increment failed attempts for this user
              const updatedAttempts = (staffUser.failedAttempts || 0) + 1;
              const isNowLocked = updatedAttempts >= 5;
              
              const updatedUsers = [...approvedUsers];
              updatedUsers[existingUserIndex] = { 
                ...staffUser, 
                failedAttempts: updatedAttempts,
                status: isNowLocked ? 'locked' : staffUser.status
              };
              
              set({ approvedUsers: updatedUsers });
              
              if (isNowLocked) {
                return { success: false, message: 'Account locked after 5 failed attempts. Contact Admin.' };
              }
              return { success: false, message: `Invalid Access Code. Attempt ${updatedAttempts}/5. Account locks at 5.` };
            }
          }

          // Special tracking for Demo users if they are not yet in approvedUsers
          const isDemoIdentifier = (role === 'kitchen' && identifier === 'chef') ||
                                   (role === 'cleaner' && identifier === 'cleaner') ||
                                   (role === 'server' && identifier === 'server') ||
                                   (role === 'manager' && identifier === 'manager');
          
          if (isDemoIdentifier && !approvedUsers.some(u => u.username === identifier)) {
             // Create a shadow account for the demo user to track their lockout status persistently
             const demoUser = {
                id: `demo-${role}`,
                role: role,
                name: `Demo ${role}`,
                username: identifier,
                pin: '123456', // The correct demo pin
                status: 'approved',
                failedAttempts: 0
             };
             // Add them to approved users list so they can be tracked from now on
             set({ approvedUsers: [...approvedUsers, demoUser] });
             // Recursive call to run the tracking login logic now that they exist in approvedUsers
             return get().login(role, credential, identifier);
          }

          // Check if pending
          const { pendingUsers } = get();
          const isPending = pendingUsers.some((u) =>
          u.pin === credential && (
          u.email === identifier || u.username === identifier) &&
          u.role === role
          );

          if (isPending) return { success: false, message: 'Account is pending approval' };

          return { success: false, message: 'Invalid Credentials' };

        }

        return { success: false, message: 'Invalid Role' };
      },

      logout: () => {
        // Sync before modifying state
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state) {
              set({
                approvedUsers: parsed.state.approvedUsers || [],
                pendingUsers: parsed.state.pendingUsers || []
              });
            }
          }
        } catch (e) {console.error("Sync failed", e);}

        set({ user: null, isAuthenticated: false });
      },

      signup: (name, email, username, phone, pin, role = 'kitchen', status = 'pending') => {
        const { pendingUsers, approvedUsers } = get();

        // Check if email or username already exists
        const emailExists = [...pendingUsers, ...approvedUsers].some((u) => u.email === email);
        const usernameExists = [...pendingUsers, ...approvedUsers].some((u) => u.username === username);

        if (emailExists) return { success: false, message: "Email already registered" };
        if (usernameExists) return { success: false, message: "Username already taken" };

        const newUser = {
          id: Date.now().toString(),
          role, // Use passed role
          name,
          email,
          username,
          phone,
          pin,
          status, // Use passed status
          failedAttempts: 0
        };

        if (status === 'approved') {
          set((state) => ({ approvedUsers: [...state.approvedUsers, newUser] }));
        } else {
          set((state) => ({ pendingUsers: [...state.pendingUsers, newUser] }));
        }

        return { success: true, user: newUser };
      },

      approveUser: (id) => {
        set((state) => {
          const userToApprove = state.pendingUsers.find((u) => u.id === id);
          if (!userToApprove) return state;

          return {
            pendingUsers: state.pendingUsers.filter((u) => u.id !== id),
            approvedUsers: [...state.approvedUsers, { ...userToApprove, status: 'approved', failedAttempts: 0 }]
          };
        });
      },

      rejectUser: (id) => {
        set((state) => ({
          pendingUsers: state.pendingUsers.filter((u) => u.id !== id)
        }));
      },

      deleteUser: (id) => {
        set((state) => ({
          approvedUsers: state.approvedUsers.filter((u) => u.id !== id)
        }));
      },

      toggleUserStatus: (id, newStatus) => {
        set((state) => ({
          approvedUsers: state.approvedUsers.map((u) =>
          u.id === id ? { ...u, status: newStatus, failedAttempts: newStatus === 'approved' ? 0 : u.failedAttempts } : u
          )
        }));
      },

      updateProfile: (id, data) => {
        set((state) => {
          const currentUser = state.user;

          // If updating current user
          if (currentUser && currentUser.id === id) {
            const updatedUser = { ...currentUser, ...data };

            // Also update in approvedUsers list if it exists there
            const updatedApprovedUsers = state.approvedUsers.map((u) =>
            u.id === id ? { ...u, ...data } : u
            );

            return {
              user: updatedUser,
              approvedUsers: updatedApprovedUsers
            };
          }
          return state;
        });
        return { success: true, message: "Profile updated successfully" };
      },

      updateCredentials: (id, newPin) => {
        set((state) => {
          const currentUser = state.user;

          // If updating current user
          if (currentUser && currentUser.id === id) {
            const updatedUser = { ...currentUser, pin: newPin };

            // Also update in approvedUsers list if it exists there
            const updatedApprovedUsers = state.approvedUsers.map((u) =>
            u.id === id ? { ...u, pin: newPin } : u
            );

            return {
              user: updatedUser,
              approvedUsers: updatedApprovedUsers
            };
          }
          return state;
        });
        return { success: true, message: "Credentials updated successfully" };
      },

      getPendingUsers: () => get().pendingUsers
    }),
    {
      name: 'auth-storage'
    }
  )
);
=======
/**
 * Authentication state, backed by the real FastAPI backend.
 *
 * Public API kept compatible with the old client-side mock so existing pages
 * keep working: login(role, credential, identifier), signup(...), logout(),
 * approveUser(id), deleteUser(username), toggleUserStatus(username, status),
 * updateProfile(username, data), updateCredentials(username, newPassword),
 * approvedUsers, pendingUsers — but each one now hits the backend and
 * mirrors the result into local state for components that read it directly.
 */
import { create } from "zustand";
import {
  authApi,
  staffApi,
  tokenStore,
  userCache,
  setUnauthorizedHandler,
} from "@/lib/api";

const initialState = {
  user: null,                // { username, role, full_name, _id, email?, phone? }
  isAuthenticated: false,
  bootstrapping: true,       // true until we've verified the persisted token
  approvedUsers: [],         // mirrored staff list
  pendingUsers: [],          // mirrored approval queue
  staffLoading: false,
};

export const useAuth = create((set, get) => ({
  ...initialState,

  /* Called once on app start. Validates the persisted token via /me. */
  bootstrap: async () => {
    if (!tokenStore.get()) {
      set({ bootstrapping: false });
      return;
    }
    try {
      const me = await authApi.me();
      userCache.set(me);
      set({ user: me, isAuthenticated: true, bootstrapping: false });
      // Best-effort warm of staff data when we have the role for it.
      if (me.role === "admin" || me.role === "manager") {
        get().refreshStaff().catch(() => {});
      }
    } catch {
      tokenStore.clear();
      userCache.clear();
      set({ user: null, isAuthenticated: false, bootstrapping: false });
    }
  },

  /**
   * login(role, credential, identifier)
   *   role       — informational (used for post-login redirect)
   *   credential — password or 6-digit access code (sent to backend as password)
   *   identifier — username or email (sent as username)
   * Returns { success, message?, user? } so the existing pages keep working.
   */
  login: async (role, credential, identifier) => {
    try {
      const data = await authApi.login(identifier, credential);
      const me = await authApi.me();
      userCache.set(me);
      set({ user: me, isAuthenticated: true });
      if (role && data.role && role !== data.role) {
        // Role on the form didn't match the role on file. Don't deny — the
        // backend already authoritative — but surface it.
        return {
          success: true,
          user: me,
          message: `Signed in as ${data.role}.`,
        };
      }
      return { success: true, user: me };
    } catch (err) {
      return { success: false, message: err.message || "Login failed" };
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch { /* fall through */ }
    set({ user: null, isAuthenticated: false, approvedUsers: [], pendingUsers: [] });
  },

  /**
   * signup(name, email, username, phone, pin, role, status?)
   *
   * - status === 'approved' (admin-created): creates the user directly via
   *   /api/staff (admin auth required). Used by StaffPage's "Add Staff" form.
   * - otherwise (public signup): submits via /api/auth/signup which creates
   *   a row in db.approvals. Returns { success, message? }.
   */
  signup: async (name, email, username, phone, pin, role = "kitchen", status = "pending") => {
    try {
      if (status === "approved") {
        const user = await staffApi.create({
          username,
          password: pin,
          full_name: name,
          role,
          email: email || null,
          phone: phone || null,
        });
        // Refresh local cache so StaffPage sees it immediately.
        await get().refreshStaff().catch(() => {});
        return { success: true, user };
      }
      const r = await authApi.signup({
        full_name: name,
        email: email || null,
        username,
        phone: phone || null,
        password: pin,
        role,
      });
      return { success: true, message: r?.message || "Signup submitted" };
    } catch (err) {
      return { success: false, message: err.message || "Signup failed" };
    }
  },

  /* ─── Staff/approvals mirror — only for admins/managers ──────────────── */

  refreshStaff: async () => {
    set({ staffLoading: true });
    try {
      const [{ staff }, { approvals }] = await Promise.all([
        staffApi.list().catch(() => ({ staff: [] })),
        staffApi.pendingApprovals().catch(() => ({ approvals: [] })),
      ]);
      set({
        approvedUsers: (staff || []).map((u) => ({
          ...u,
          id: u.username,                 // legacy callers used .id
          name: u.full_name || u.username,
          status: u.is_active ? "approved" : "suspended",
        })),
        pendingUsers: (approvals || []).map((a) => ({
          ...a,
          id: a._id,
          name: a.full_name || a.username,
          status: "pending",
        })),
        staffLoading: false,
      });
    } catch {
      set({ staffLoading: false });
    }
  },

  approveUser: async (approvalId) => {
    await staffApi.approve(approvalId);
    await get().refreshStaff();
  },

  rejectUser: async (approvalId, reason = "") => {
    await staffApi.reject(approvalId, reason);
    await get().refreshStaff();
  },

  deleteUser: async (username) => {
    await staffApi.remove(username);
    set((s) => ({
      approvedUsers: s.approvedUsers.filter((u) => u.username !== username),
    }));
  },

  toggleUserStatus: async (username, newStatus) => {
    await staffApi.update(username, { is_active: newStatus !== "suspended" });
    set((s) => ({
      approvedUsers: s.approvedUsers.map((u) =>
        u.username === username
          ? { ...u, status: newStatus, is_active: newStatus !== "suspended" }
          : u,
      ),
    }));
  },

  updateProfile: async (username, data) => {
    try {
      const updated = await staffApi.update(username, {
        full_name: data.name ?? data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
      });
      set((s) => ({
        approvedUsers: s.approvedUsers.map((u) =>
          u.username === username ? { ...updated, id: updated.username, name: updated.full_name } : u,
        ),
        user: s.user && s.user.username === username ? { ...s.user, ...updated } : s.user,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateCredentials: async (currentPassword, newPassword) => {
    try {
      await authApi.changePassword(currentPassword, newPassword);
      return { success: true, message: "Password updated" };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  getPendingUsers: () => get().pendingUsers,
}));

// Wire global 401 handler — if any request returns 401, drop the session.
setUnauthorizedHandler(() => {
  tokenStore.clear();
  userCache.clear();
  useAuth.setState({ user: null, isAuthenticated: false });
});

export default useAuth;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
