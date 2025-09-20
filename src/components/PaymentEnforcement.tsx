import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Payment Enforcement Component
 * Prevents students from enrolling without completing payments
 * Runs automatic checks and blocks enrollment when payment is overdue
 */
export const PaymentEnforcement = () => {
  const { toast } = useToast();

  useEffect(() => {
    const checkPaymentCompliance = async () => {
      try {
        // Get all students with pending enrollments
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('enrollments')
          .select(`
            id,
            student_id,
            enrollment_status,
            created_at,
            profiles!enrollments_student_id_fkey(first_name, last_name, email, application_status)
          `)
          .eq('enrollment_status', 'approved');

        if (enrollmentError) throw enrollmentError;

        // Check each approved enrollment for payment compliance
        for (const enrollment of enrollments || []) {
          const { data: billing, error: billingError } = await supabase
            .from('billing')
            .select('*')
            .eq('student_id', enrollment.student_id)
            .eq('enrollment_id', enrollment.id);

          if (billingError) throw billingError;

          const hasPendingPayments = billing?.some(bill => 
            bill.status === 'pending' && new Date(bill.due_date) < new Date()
          );

          // If student has overdue payments and is not yet marked as student
          if (hasPendingPayments && enrollment.profiles?.application_status !== 'student') {
            // Block enrollment progression until payment is made
            const { error: blockError } = await supabase
              .from('profiles')
              .update({ 
                application_status: 'enrolled_pending_payment'
              })
              .eq('user_id', enrollment.student_id);

            if (blockError) throw blockError;

            // Send notification about payment requirement
            const { error: notificationError } = await supabase
              .from('notification_log')
              .insert({
                user_id: enrollment.student_id,
                email_address: enrollment.profiles?.email,
                type: 'email',
                notification_type: 'payment_required',
                message: `Your enrollment is on hold due to outstanding payments. Please complete your payment to access student services.`,
                status: 'pending'
              });

            if (notificationError) {
              console.error('Error sending payment notification:', notificationError);
            }
          }
        }

      } catch (error) {
        console.error('Error in payment enforcement:', error);
      }
    };

    // Run payment compliance check on component mount
    checkPaymentCompliance();

    // Set up real-time monitoring for enrollment and billing changes
    const enrollmentChannel = supabase
      .channel('payment-enforcement')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments'
        },
        () => {
          checkPaymentCompliance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing'
        },
        () => {
          checkPaymentCompliance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(enrollmentChannel);
    };
  }, []);

  // This component doesn't render anything, it just runs background enforcement
  return null;
};

/**
 * Hook to check if a student can proceed with enrollment
 */
export const usePaymentEnforcement = (studentId: string) => {
  const checkPaymentStatus = async (): Promise<boolean> => {
    try {
      const { data: billing, error } = await supabase
        .from('billing')
        .select('status, due_date, amount')
        .eq('student_id', studentId);

      if (error) throw error;

      // Check if there are any overdue payments
      const hasOverduePayments = billing?.some(bill => 
        bill.status === 'pending' && new Date(bill.due_date) < new Date()
      );

      return !hasOverduePayments;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  };

  return { checkPaymentStatus };
};