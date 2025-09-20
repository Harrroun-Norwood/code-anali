import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import StatusManager from '@/utils/statusManager';

interface ProtectedBookingRouteProps {
  children: React.ReactNode;
}

const ProtectedBookingRoute = ({ children }: ProtectedBookingRouteProps) => {
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
    // Redirect to login with return path
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!profile || profile.role !== 'student') {
    return <Navigate to="/" replace />;
  }

  // Use StatusManager to check if user can book consultations
  const currentStatus = StatusManager.getCurrentStatus(profile);
  
  if (!StatusManager.canBookConsultation(currentStatus)) {
    // Redirect to appropriate dashboard based on current status
    const appropriateDashboard = StatusManager.getDashboardRoute(profile);
    return <Navigate to={appropriateDashboard} replace />;
  }

  return <>{children}</>;
};

export default ProtectedBookingRoute;