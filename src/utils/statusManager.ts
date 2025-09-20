import { supabase } from '@/integrations/supabase/client';

// Define all possible application statuses
export type ApplicationStatus = 
  | 'applicant'
  | 'consultation_pending' 
  | 'consultation_completed'
  | 'payment_pending'
  | 'enrollment_submitted'
  | 'student';

// Status transition rules
const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  'applicant': ['consultation_pending'],
  'consultation_pending': ['consultation_completed'],
  'consultation_completed': ['payment_pending'],
  'payment_pending': ['enrollment_submitted'],
  'enrollment_submitted': ['student'],
  'student': [] // Final status - no transitions
};

// Route access permissions by status
const STATUS_PERMISSIONS: Record<ApplicationStatus, string[]> = {
  'applicant': [
    '/applicant-dashboard',
    '/book-consultation',
    '/profile',
    '/about',
    '/contact',
    '/programs'
  ],
  'consultation_pending': [
    '/applicant-dashboard', 
    '/profile',
    '/about', 
    '/contact',
    '/programs'
  ],
  'consultation_completed': [
    '/applicant-dashboard',
    '/profile', 
    '/about',
    '/contact',
    '/programs'
  ],
  'payment_pending': [
    '/applicant-dashboard',
    '/billing',
    '/profile',
    '/about', 
    '/contact'
  ],
  'enrollment_submitted': [
    '/applicant-dashboard',
    '/enrollment',
    '/profile',
    '/about', 
    '/contact'
  ],
  'student': [
    '/student-dashboard',
    '/billing',
    '/documents', 
    '/profile',
    '/about',
    '/contact'
  ]
};

export class StatusManager {
  /**
   * Get user's current application status
   */
  static getCurrentStatus(profile: any): ApplicationStatus {
    return (profile?.application_status as ApplicationStatus) || 'applicant';
  }

  /**
   * Check if status transition is allowed
   */
  static isTransitionAllowed(
    currentStatus: ApplicationStatus,
    targetStatus: ApplicationStatus
  ): boolean {
    return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;
  }

  /**
   * Get routes accessible for current status
   */
  static getAccessibleRoutes(status: ApplicationStatus): string[] {
    return STATUS_PERMISSIONS[status] || STATUS_PERMISSIONS['applicant'];
  }

  /**
   * Check if user can access a specific route
   */
  static canAccessRoute(status: ApplicationStatus, route: string): boolean {
    const accessibleRoutes = this.getAccessibleRoutes(status);
    return accessibleRoutes.includes(route);
  }

  /**
   * Get appropriate dashboard route for status
   */
  static getDashboardRoute(profile: any): string {
    if (!profile) return '/auth';

    // Handle different roles first
    if (profile.role !== 'student') {
      switch (profile.role) {
        case 'super_admin': return '/admin-dashboard';
        case 'registrar': return '/registrar-dashboard';  
        case 'teacher': return '/teacher-dashboard';
        case 'accountant': return '/accountant-dashboard';
        default: return '/';
      }
    }

    // Handle student statuses
    const status = this.getCurrentStatus(profile);
    switch (status) {
      case 'student':
        return '/student-dashboard';
      case 'payment_pending':
        return '/billing'; // Direct to payment
      case 'enrollment_submitted':
        return '/applicant-dashboard'; // Stay in applicant dashboard but show submitted status
      default:
        return '/applicant-dashboard';
    }
  }

  /**
   * Transition user to next status
   */
  static async transitionStatus(
    userId: string,
    targetStatus: ApplicationStatus,
    adminUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('application_status')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentStatus = (profile.application_status as ApplicationStatus) || 'applicant';

      // Validate transition
      if (!this.isTransitionAllowed(currentStatus, targetStatus)) {
        return {
          success: false,
          error: `Invalid status transition from ${currentStatus} to ${targetStatus}`
        };
      }

      // Update status
      const updateData: any = {
        application_status: targetStatus,
        updated_at: new Date().toISOString()
      };

      // Add status-specific data
      if (targetStatus === 'consultation_pending') {
        // Nothing additional needed - handled by consultation booking
      } else if (targetStatus === 'consultation_completed') {
        // Should be handled by admin when marking consultation complete
      } else if (targetStatus === 'payment_pending') {
        // Should be handled when consultation is completed
      } else if (targetStatus === 'enrollment_submitted') {
        // Should be handled after payment is completed
      } else if (targetStatus === 'student') {
        // Final transition - student is fully enrolled
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('Status transition error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get status display information
   */
  static getStatusDisplay(status: ApplicationStatus): {
    label: string;
    description: string;
    color: string;
    nextAction?: string;
  } {
    switch (status) {
      case 'applicant':
        return {
          label: 'New Applicant',
          description: 'Ready to book consultation',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          nextAction: 'Book consultation to get started'
        };
      case 'consultation_pending':
        return {
          label: 'Consultation Scheduled',
          description: 'Awaiting consultation completion',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          nextAction: 'Complete your consultation with our team'
        };
      case 'consultation_completed':
        return {
          label: 'Consultation Complete',
          description: 'Ready to proceed with payment',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          nextAction: 'Complete payment to proceed with enrollment'
        };
      case 'payment_pending':
        return {
          label: 'Payment Required',
          description: 'Complete payment to proceed with enrollment',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          nextAction: 'Complete payment to enable enrollment'
        };
      case 'enrollment_submitted':
        return {
          label: 'Enrollment Submitted',
          description: 'Your enrollment application is under review',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          nextAction: 'Wait for enrollment approval from registrar'
        };
      case 'student':
        return {
          label: 'Active Student',
          description: 'Fully enrolled and active',
          color: 'bg-green-100 text-green-800 border-green-200'
        };
      default:
        return {
          label: 'Unknown Status',
          description: 'Status needs to be updated',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  }

  /**
   * Check if user needs payment to complete enrollment
   */
  static needsPayment(status: ApplicationStatus): boolean {
    return status === 'payment_pending';
  }

  /**
   * Check if user is fully enrolled student
   */
  static isFullStudent(status: ApplicationStatus): boolean {
    return status === 'student';
  }

  /**
   * Check if user can book consultations
   */
  static canBookConsultation(status: ApplicationStatus): boolean {
    return status === 'applicant';
  }

  /**
   * Check if user can access enrollment
   */
  static canAccessEnrollment(status: ApplicationStatus): boolean {
    return status === 'enrollment_submitted' || this.hasCompletedPayment(status);
  }

  /**
   * Check if user has completed payment
   */
  static hasCompletedPayment(status: ApplicationStatus): boolean {
    return ['enrollment_submitted', 'student'].includes(status);
  }

  /**
   * Check if user has submitted enrollment
   */
  static hasSubmittedEnrollment(status: ApplicationStatus): boolean {
    return ['enrollment_submitted', 'student'].includes(status);
  }

  /**
   * Check if user can access student features
   */
  static canAccessStudentFeatures(status: ApplicationStatus): boolean {
    return ['student'].includes(status);
  }
}

export default StatusManager;