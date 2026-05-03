import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";






const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their appropriate home based on role, or show unauthorized
    // For now, just bounce them to login with a warning (in real app, use toast)
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;