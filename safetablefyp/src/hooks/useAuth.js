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