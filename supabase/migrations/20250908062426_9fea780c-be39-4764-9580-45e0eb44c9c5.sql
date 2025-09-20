-- Add application_status to profiles table to track user journey
ALTER TABLE public.profiles 
ADD COLUMN application_status TEXT DEFAULT 'applicant' CHECK (application_status IN ('applicant', 'consultation_pending', 'consultation_completed', 'enrolled', 'student'));

-- Update existing users who have approved enrollments to 'student' status
UPDATE public.profiles 
SET application_status = 'student' 
WHERE user_id IN (
  SELECT DISTINCT student_id 
  FROM public.enrollments 
  WHERE enrollment_status = 'approved'
);

-- Create index for performance
CREATE INDEX idx_profiles_application_status ON public.profiles(application_status);

-- Update existing consultation records to link them to user profiles
UPDATE public.consultations 
SET status = 'consultation_pending' 
WHERE status = 'pending';

-- Create function to update application status based on consultation and enrollment status
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update application status
CREATE TRIGGER trigger_update_status_on_consultation
  AFTER UPDATE ON public.consultations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.update_application_status();

CREATE TRIGGER trigger_update_status_on_enrollment
  AFTER UPDATE ON public.enrollments
  FOR EACH ROW
  WHEN (OLD.enrollment_status IS DISTINCT FROM NEW.enrollment_status)
  EXECUTE FUNCTION public.update_application_status();