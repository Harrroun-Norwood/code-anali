-- Update the generate-document function to be public (no JWT required)
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Create storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('enrollment-documents', 'enrollment-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for document storage
CREATE POLICY IF NOT EXISTS "Students can view their own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'enrollment-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Registrar can manage all documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'enrollment-documents' AND 
  (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'registrar')
    )
  )
);

-- Update enrollment approval trigger to handle proper notifications
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- When enrollment status changes
  IF TG_OP = 'UPDATE' AND OLD.enrollment_status != NEW.enrollment_status THEN
    
    -- Get user email
    SELECT email INTO user_email 
    FROM public.profiles 
    WHERE user_id = NEW.student_id;
    
    -- Handle approval
    IF NEW.enrollment_status = 'approved' THEN
      -- Update profile status to enrolled_pending_payment
      UPDATE public.profiles 
      SET application_status = 'enrolled_pending_payment'
      WHERE user_id = NEW.student_id;
      
      -- Send approval notification
      IF user_email IS NOT NULL THEN
        INSERT INTO public.notification_log (
          user_id, email_address, type, notification_type, message, status
        ) VALUES (
          NEW.student_id,
          user_email,
          'email',
          'enrollment_approval',
          'Congratulations! Your enrollment has been approved. Please complete your payment to become an active student.',
          'pending'
        );
      END IF;
      
    -- Handle rejection
    ELSIF NEW.enrollment_status = 'rejected' THEN
      -- Keep profile status as consultation_completed so they can reapply
      -- Notification is handled in the enrollment management component
      NULL; -- No additional action needed here
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_enrollment_approval ON public.enrollments;
CREATE TRIGGER trigger_enrollment_approval
  AFTER UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_enrollment_approval();