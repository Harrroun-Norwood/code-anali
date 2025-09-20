-- Fix the update_application_status trigger function
CREATE OR REPLACE FUNCTION public.update_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When consultation is confirmed, update profile status
  IF TG_TABLE_NAME = 'consultations' AND NEW.status = 'confirmed' THEN
    UPDATE public.profiles 
    SET application_status = 'consultation_completed'
    WHERE email = NEW.applicant_email AND application_status = 'consultation_pending';
  END IF;
  
  -- When enrollment is approved, update profile status to student
  -- Only check enrollment_status if we're in the enrollments table
  IF TG_TABLE_NAME = 'enrollments' AND NEW.enrollment_status = 'approved' THEN
    UPDATE public.profiles 
    SET application_status = 'student'
    WHERE user_id = NEW.student_id;
  END IF;
  
  RETURN NEW;
END;
$$;