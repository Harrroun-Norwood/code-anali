-- Update the application status trigger to handle new enrolled_pending_payment status
CREATE OR REPLACE FUNCTION public.update_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When consultation is confirmed, update profile status
  IF TG_TABLE_NAME = 'consultations' AND NEW.status = 'confirmed' THEN
    UPDATE public.profiles 
    SET application_status = 'consultation_completed'
    WHERE email = NEW.applicant_email AND application_status = 'consultation_pending';
  END IF;
  
  -- When consultation is completed
  IF TG_TABLE_NAME = 'consultations' AND NEW.status = 'completed' THEN
    UPDATE public.profiles 
    SET application_status = 'consultation_completed'
    WHERE email = NEW.applicant_email AND application_status = 'consultation_pending';
  END IF;
  
  -- When enrollment is approved, update profile status to enrolled_pending_payment (awaiting payment)
  IF TG_TABLE_NAME = 'enrollments' THEN
    -- Check if enrollment_status field exists and is approved
    IF TG_OP = 'UPDATE' AND NEW.enrollment_status = 'approved' AND OLD.enrollment_status != 'approved' THEN
      UPDATE public.profiles 
      SET application_status = 'enrolled_pending_payment'
      WHERE user_id = NEW.student_id;
    ELSIF TG_OP = 'INSERT' AND NEW.enrollment_status = 'approved' THEN
      UPDATE public.profiles 
      SET application_status = 'enrolled_pending_payment'
      WHERE user_id = NEW.student_id;
    END IF;
  END IF;
  
  -- When payment is completed (billing status = 'paid'), update to full student status
  IF TG_TABLE_NAME = 'billing' THEN
    -- Check if payment is marked as paid
    IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
      -- Check if this user has pending enrollment
      UPDATE public.profiles 
      SET application_status = 'student'
      WHERE user_id = NEW.student_id 
        AND application_status = 'enrolled_pending_payment';
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

-- Create trigger for billing table to handle payment status changes
DROP TRIGGER IF EXISTS trigger_billing_status_change ON public.billing;
CREATE TRIGGER trigger_billing_status_change
  AFTER INSERT OR UPDATE ON public.billing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_application_status();