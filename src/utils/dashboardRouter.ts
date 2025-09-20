import { Profile } from '@/hooks/useAuth';

export const getDashboardRoute = (profile: Profile | null): string => {
  if (!profile) return '/auth';

  // Super Admin - can access everything
  if (profile.role === 'super_admin') {
    return '/admin-dashboard';
  }

  // Registrar - handles enrollment and admin tasks
  if (profile.role === 'registrar') {
    return '/registrar-dashboard';
  }

  // Teacher - manages classes and grades
  if (profile.role === 'teacher') {
    return '/teacher-dashboard';
  }

  // Accountant - handles billing
  if (profile.role === 'accountant') {
    return '/accountant-dashboard';
  }

  // Student role with different application statuses
  if (profile.role === 'student') {
    switch (profile.application_status) {
      case 'applicant':
      case 'consultation_pending':
      case 'consultation_completed':
      case 'enrollment_submitted':
        return '/applicant-dashboard';
      case 'payment_pending':
      case 'student':
        return '/student-dashboard';
      default:
        return '/applicant-dashboard';
    }
  }

  // Default fallback
  return '/applicant-dashboard';
};

export const getAccessibleRoutes = (profile: Profile | null): string[] => {
  if (!profile) return ['/auth'];

  const baseRoutes = ['/profile', '/about', '/contact'];

  if (profile.role === 'super_admin') {
    return [...baseRoutes, '/admin-dashboard'];
  }

  if (profile.role === 'registrar') {
    return [...baseRoutes, '/registrar-dashboard'];
  }

  if (profile.role === 'teacher') {
    return [...baseRoutes, '/teacher-dashboard'];
  }

  if (profile.role === 'accountant') {
    return [...baseRoutes, '/accountant-dashboard'];
  }

  if (profile.role === 'student') {
    const routes = [...baseRoutes];
    
    // Applicants can only book consultations
    if (['applicant', 'consultation_pending', 'consultation_completed', 'payment_pending'].includes(profile.application_status || '')) {
      routes.push('/applicant-dashboard', '/book-consultation');
      // Only after consultation is completed can they access enrollment
      if (profile.application_status === 'consultation_completed') {
        routes.push('/enrollment');
      }
    }
    
    // Students can access full student features
    if (['enrollment_submitted', 'student'].includes(profile.application_status || '')) {
      routes.push('/student-dashboard', '/billing', '/documents');
    }
    
    return routes;
  }

  return baseRoutes;
};