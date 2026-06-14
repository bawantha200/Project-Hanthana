import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  // Wait until auth state is determined
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // Not logged in → redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control (if allowedRoles is provided)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role?.toUpperCase();
    if (!allowedRoles.includes(userRole)) {
      // User has wrong role – send to customer dashboard as fallback
      return <Navigate to="/customer/dashboard" replace />;
    }
  }

  // Authorized – render the protected component
  return children;
}