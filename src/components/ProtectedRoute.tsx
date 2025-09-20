import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requireAuth && !user) {
    // Redirect to login with return path
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredRoles.length > 0 && profile) {
    const hasRequiredRole = requiredRoles.includes(profile.role);
    if (!hasRequiredRole) {
      // Redirect to appropriate dashboard based on user role
      const dashboardRoute = profile.role === 'super_admin' ? '/admin-dashboard' :
                            profile.role === 'registrar' ? '/registrar-dashboard' :
                            profile.role === 'teacher' ? '/teacher-dashboard' :
                            profile.role === 'accountant' ? '/accountant-dashboard' :
                            profile.application_status === 'applicant' || 
                            profile.application_status === 'consultation_pending' ||
                            profile.application_status === 'consultation_completed' ? '/applicant-dashboard' :
                            '/student-dashboard';
      return <Navigate to={dashboardRoute} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;