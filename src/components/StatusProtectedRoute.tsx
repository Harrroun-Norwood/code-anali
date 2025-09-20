import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import StatusManager, { ApplicationStatus } from '@/utils/statusManager';

interface StatusProtectedRouteProps {
  children: React.ReactNode;
  allowedStatuses?: ApplicationStatus[];
  requiredRole?: string[];
  redirectTo?: string;
}

const StatusProtectedRoute = ({ 
  children, 
  allowedStatuses = [],
  requiredRole = [],
  redirectTo 
}: StatusProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Check role requirements
  if (requiredRole.length > 0 && profile && !requiredRole.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  // Check status requirements for students
  if (profile?.role === 'student' && allowedStatuses.length > 0) {
    const currentStatus = StatusManager.getCurrentStatus(profile);
    
    if (!allowedStatuses.includes(currentStatus)) {
      // Redirect to appropriate dashboard based on status
      const appropriateDashboard = StatusManager.getDashboardRoute(profile);
      return <Navigate to={redirectTo || appropriateDashboard} replace />;
    }
  }

  return <>{children}</>;
};

export default StatusProtectedRoute;