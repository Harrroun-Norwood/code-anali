-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.update_application_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When consultation is confirmed, update profile status
  IF TG_TABLE_NAME = 'consultations' AND NEW.status = 'confirmed' THEN
    UPDATE public.profiles 
    SET application_status = 'consultation_completed'
    WHERE email = NEW.applicant_email AND application_status = 'consultation_pending';
  END IF;
  
  -- When enrollment is approved, update profile status to student
  IF TG_TABLE_NAME = 'enrollments' AND NEW.enrollment_status = 'approved' THEN
    UPDATE public.profiles 
    SET application_status = 'student'
    WHERE user_id = NEW.student_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;