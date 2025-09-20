-- Update triggers to use new payment-first flow

-- Update consultation status change trigger
CREATE OR REPLACE FUNCTION public.on_consultations_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target text;
BEGIN
  IF NEW.status = 'pending' THEN
    v_target := 'consultation_pending';
  ELSIF NEW.status IN ('confirmed','completed') THEN
    v_target := 'payment_pending';  -- Changed to payment_pending
  ELSE
    RETURN NEW; -- other statuses: no-op
  END IF;

  UPDATE public.profiles p
     SET application_status = v_target,
         updated_at = now()
   WHERE p.email = NEW.applicant_email
     AND (
          (v_target = 'consultation_pending'
             AND p.application_status IN ('applicant','consultation_pending'))
       OR (v_target = 'payment_pending'
             AND p.application_status IN ('applicant','consultation_pending','consultation_completed','payment_pending'))
         );

  RETURN NEW;
END;
$function$;

-- Update enrollment status change trigger
CREATE OR REPLACE FUNCTION public.on_enrollments_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.enrollment_status = 'approved' THEN
    UPDATE public.profiles p
       SET application_status = 'student',  -- Direct to student status
           updated_at = now()
     WHERE p.user_id = NEW.student_id
       AND p.application_status IN ('enrollment_submitted','student');
  END IF;

  RETURN NEW;
END;
$function$;

-- Update billing status change trigger to handle payment completion
CREATE OR REPLACE FUNCTION public.on_billing_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Check if all payments are completed for this student
    IF NOT EXISTS (
      SELECT 1 FROM public.billing 
      WHERE student_id = NEW.student_id 
        AND status != 'paid'
    ) THEN
      -- All payments completed, allow enrollment
      UPDATE public.profiles p
         SET application_status = 'enrollment_submitted',
             updated_at = now()
       WHERE p.user_id = NEW.student_id
         AND p.application_status = 'payment_pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;