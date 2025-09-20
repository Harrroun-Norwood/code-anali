-- Create notification system function for status changes
CREATE OR REPLACE FUNCTION public.send_status_notification(
  p_user_id UUID,
  p_email TEXT,
  p_notification_type TEXT,
  p_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert notification into log
  INSERT INTO public.notification_log (
    user_id,
    email_address,
    type,
    notification_type,
    message,
    status
  ) VALUES (
    p_user_id,
    p_email,
    'email',
    p_notification_type,
    p_message,
    'pending'
  );
END;
$$;

-- Enhanced application status trigger with notifications
CREATE OR REPLACE FUNCTION public.update_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When consultation is confirmed, update profile status and send notification
  IF TG_TABLE_NAME = 'consultations' AND NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    UPDATE public.profiles 
    SET application_status = 'consultation_pending'
    WHERE email = NEW.applicant_email AND application_status = 'applicant';
    
    -- Send notification to applicant about consultation confirmation
    PERFORM public.send_status_notification(
      NULL, -- We'll need to look up user_id by email if needed
      NEW.applicant_email,
      'consultation_confirmation',
      'Your consultation has been confirmed! Meeting link: ' || COALESCE(NEW.meeting_link, 'TBA') || '. Please check your email for details.'
    );
  END IF;
  
  -- When consultation is completed, allow enrollment and send notification
  IF TG_TABLE_NAME = 'consultations' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.profiles 
    SET application_status = 'consultation_completed'
    WHERE email = NEW.applicant_email AND application_status = 'consultation_pending';
    
    -- Send notification about enrollment eligibility
    PERFORM public.send_status_notification(
      NULL,
      NEW.applicant_email,
      'consultation_completion',
      'Your consultation is complete! You can now proceed with program enrollment. Visit our enrollment page to continue.'
    );
  END IF;
  
  -- When enrollment is approved, update profile status to enrolled_pending_payment
  IF TG_TABLE_NAME = 'enrollments' THEN
    IF TG_OP = 'UPDATE' AND NEW.enrollment_status = 'approved' AND OLD.enrollment_status != 'approved' THEN
      UPDATE public.profiles 
      SET application_status = 'enrolled_pending_payment'
      WHERE user_id = NEW.student_id;
      
      -- Get user email for notification
      DECLARE
        user_email TEXT;
      BEGIN
        SELECT email INTO user_email FROM public.profiles WHERE user_id = NEW.student_id;
        
        IF user_email IS NOT NULL THEN
          PERFORM public.send_status_notification(
            NEW.student_id,
            user_email,
            'enrollment_approval',
            'Congratulations! Your enrollment has been approved. Please complete your payment to become an active student.'
          );
        END IF;
      END;
    ELSIF TG_OP = 'INSERT' AND NEW.enrollment_status = 'approved' THEN
      UPDATE public.profiles 
      SET application_status = 'enrolled_pending_payment'
      WHERE user_id = NEW.student_id;
    END IF;
  END IF;
  
  -- When payment is completed (billing status = 'paid'), update to full student status
  IF TG_TABLE_NAME = 'billing' THEN
    IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
      -- Update user to full student status
      UPDATE public.profiles 
      SET application_status = 'student'
      WHERE user_id = NEW.student_id 
        AND application_status = 'enrolled_pending_payment';
      
      -- Send welcome notification
      DECLARE
        user_email TEXT;
      BEGIN
        SELECT email INTO user_email FROM public.profiles WHERE user_id = NEW.student_id;
        
        IF user_email IS NOT NULL THEN
          PERFORM public.send_status_notification(
            NEW.student_id,
            user_email,
            'payment_completion',
            'Welcome to ANALI! Your payment has been processed and you are now an active student. Access your student dashboard to get started.'
          );
        END IF;
      END;
    ELSIF TG_OP = 'INSERT' AND NEW.status = 'paid' THEN
      -- New payment record that's already paid
      UPDATE public.profiles 
      SET application_status = 'student'
      WHERE user_id = NEW.student_id 
        AND application_status = 'enrolled_pending_payment';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;