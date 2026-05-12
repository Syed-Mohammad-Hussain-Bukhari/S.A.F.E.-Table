import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MenuPage from "./pages/MenuPage";
import OrdersPage from "./pages/OrdersPage";
import VoiceOrderPage from "./pages/VoiceOrderPage";
import AIPersonalizationPage from "./pages/AIPersonalizationPage";
import QRPaymentsPage from "./pages/QRPaymentsPage";
import AmbienceControlPage from "./pages/AmbienceControlPage";
import LanguagesPage from "./pages/LanguagesPage";
import ContactPage from "./pages/ContactPage";
import NotFound from "./pages/NotFound";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import KitchenTrackPage from "./pages/admin/KitchenTrackPage";
import StaffPage from "./pages/admin/StaffPage";
import ApprovalsPage from "./pages/admin/ApprovalsPage";
import SalesReportPage from "./pages/admin/SalesReportPage";
import KitchenLayout from "./layouts/KitchenLayout";
import CleanerLayout from "./layouts/CleanerLayout";
import ServerLayout from "./layouts/ServerLayout";
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";
import SignupPage from "./pages/common/SignupPage";
import CleanerDashboard from "./pages/service/CleanerDashboard";
import ServerDashboard from "./pages/server/ServerDashboard";
import ManagerLayout from "./layouts/ManagerLayout";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import TableManagement from "./pages/manager/TableManagement";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

import ProfileSettings from "./pages/common/ProfileSettings";
import SecuritySettings from "./pages/common/SecuritySettings";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const Bootstrap = ({ children }) => {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Bootstrap>
          <Routes>
            {/* Public — landing + auth */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* Customer-facing */}
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/voice-order" element={<VoiceOrderPage />} />
            <Route path="/ai-personalization" element={<AIPersonalizationPage />} />
            <Route path="/qr-payments" element={<QRPaymentsPage />} />
            <Route path="/ambience-control" element={<AmbienceControlPage />} />
            <Route path="/languages" element={<LanguagesPage />} />

            {/* Kitchen */}
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute allowedRoles={["kitchen", "manager", "admin"]}>
                  <KitchenLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<KitchenDashboard />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="security" element={<SecuritySettings />} />
            </Route>

            {/* Cleaner */}
            <Route
              path="/cleaner"
              element={
                <ProtectedRoute allowedRoles={["cleaner", "manager", "admin"]}>
                  <CleanerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CleanerDashboard />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="security" element={<SecuritySettings />} />
            </Route>

            {/* Server */}
            <Route
              path="/server"
              element={
                <ProtectedRoute allowedRoles={["server", "manager", "admin"]}>
                  <ServerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ServerDashboard />} />
              <Route path="tables" element={<TableManagement />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="security" element={<SecuritySettings />} />
            </Route>

            {/* Manager */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={["manager", "admin"]}>
                  <ManagerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ManagerDashboard />} />
              <Route path="kitchen" element={<KitchenDashboard />} />
              <Route path="server" element={<ServerDashboard />} />
              <Route path="cleaner" element={<CleanerDashboard />} />
              <Route path="tables" element={<TableManagement />} />
              <Route path="approvals" element={<ApprovalsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="security" element={<SecuritySettings />} />
            </Route>

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="kitchen" element={<KitchenDashboard />} />
              <Route path="kitchen-track" element={<KitchenTrackPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="approvals" element={<ApprovalsPage />} />
              <Route path="sales" element={<SalesReportPage />} />
              <Route path="cleaner" element={<CleanerDashboard />} />
              <Route path="server" element={<ServerDashboard />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="security" element={<SecuritySettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Bootstrap>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;