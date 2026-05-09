import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

<<<<<<< HEAD





const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

=======
/**
 * Gate a subtree behind staff auth + an optional role allow-list.
 * - While bootstrapping (initial /me check), renders nothing so we don't
 *   flash protected content or bounce to /login on refresh.
 * - On unauthenticated, sends to /login keeping `from` so we can redirect back.
 * - On insufficient role, sends to /login (an unauthorized page would be nicer).
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();

  if (bootstrapping) return null;

>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

<<<<<<< HEAD
  if (!allowedRoles.includes(user.role)) {
    // Redirect to their appropriate home based on role, or show unauthorized
    // For now, just bounce them to login with a warning (in real app, use toast)
=======
  if (allowedRoles && allowedRoles.length && !allowedRoles.includes(user.role)) {
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

<<<<<<< HEAD
export default ProtectedRoute;
=======
export default ProtectedRoute;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
