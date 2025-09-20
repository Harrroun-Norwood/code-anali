-- Add city/municipality field to consultations table
ALTER TABLE public.consultations 
ADD COLUMN applicant_city text;

-- Add meeting_link and status change tracking
ALTER TABLE public.consultations 
ADD COLUMN confirmed_by uuid REFERENCES auth.users(id),
ADD COLUMN confirmed_at timestamp with time zone,
ADD COLUMN completed_at timestamp with time zone;

-- Update consultation trigger to handle notifications when status changes
CREATE OR REPLACE FUNCTION public.handle_consultation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When consultation is confirmed
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    NEW.confirmed_by = auth.uid();
    NEW.confirmed_at = now();
    
    -- Update applicant profile status
    UPDATE public.profiles 
    SET application_status = 'consultation_pending'
    WHERE email = NEW.applicant_email AND application_status = 'applicant';
  END IF;
  
  -- When consultation is completed
  IF NEW.status = 'completed' AND OLD.status = 'confirmed' THEN
    NEW.completed_at = now();
    
    -- Update applicant profile to allow enrollment
    UPDATE public.profiles 
    SET application_status = 'consultation_completed'
    WHERE email = NEW.applicant_email AND application_status = 'consultation_pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for consultation status changes
DROP TRIGGER IF EXISTS consultation_status_change_trigger ON public.consultations;
CREATE TRIGGER consultation_status_change_trigger
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_consultation_status_change();