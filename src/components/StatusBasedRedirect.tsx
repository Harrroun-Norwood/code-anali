import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const StatusBasedRedirect = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      // Redirect based on application status
      switch (profile.application_status) {
        case 'applicant':
        case 'consultation_pending':
          // Applicants can only access consultation booking
          navigate('/book-consultation');
          break;
        case 'consultation_completed':
          // After consultation, redirect to payment
          navigate('/billing');
          break;
        case 'payment_pending':
          // Payment is required
          navigate('/billing');
          break;
        case 'enrollment_submitted':
        case 'student':
          // Students get full dashboard access
          navigate('/student-dashboard');
          break;
        default:
          // Default based on role
          if (profile.role === 'super_admin') {
            navigate('/admin-dashboard');
          } else if (profile.role === 'registrar') {
            navigate('/registrar-dashboard');
          } else if (profile.role === 'teacher') {
            navigate('/teacher-dashboard');
          } else if (profile.role === 'accountant') {
            navigate('/billing-dashboard');
          } else {
            navigate('/');
          }
      }
    }
  }, [profile, loading, navigate]);

  return null;
};

export default StatusBasedRedirect;