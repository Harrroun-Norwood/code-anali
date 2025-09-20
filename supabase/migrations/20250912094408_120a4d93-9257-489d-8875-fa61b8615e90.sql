-- Update the check constraint to include 'enrolled_pending_payment' status
ALTER TABLE public.profiles 
DROP CONSTRAINT profiles_application_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_application_status_check 
CHECK (application_status IN ('applicant', 'consultation_pending', 'consultation_completed', 'enrollment_submitted', 'enrolled_pending_payment', 'enrolled', 'student'));