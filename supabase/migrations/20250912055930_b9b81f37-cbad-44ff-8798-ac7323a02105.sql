-- Create or update the enrollment approval trigger to handle the new status flow
DROP TRIGGER IF EXISTS enrollment_approval_trigger ON enrollments;

-- Update the enrollment approval function to handle the new status flow
CREATE OR REPLACE FUNCTION public.handle_enrollment_approval() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to approved
  IF NEW.enrollment_status = 'approved' AND OLD.enrollment_status != 'approved' THEN
    -- Update student's application status to enrolled_pending_payment (not student yet)
    UPDATE profiles 
    SET application_status = 'enrolled_pending_payment', updated_at = NOW()
    WHERE user_id = NEW.student_id;
    
    -- Generate billing records if tuition fee exists
    IF NEW.tuition_fee IS NOT NULL AND NEW.tuition_fee > 0 THEN
      PERFORM generate_billing_records(
        NEW.student_id,
        NEW.id,
        NEW.tuition_fee,
        COALESCE(NEW.payment_plan, 'monthly')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
CREATE TRIGGER enrollment_approval_trigger
  AFTER UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION handle_enrollment_approval();

-- Update the billing payment completion function to transition student to final status
CREATE OR REPLACE FUNCTION public.handle_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment is completed (billing status = 'paid'), update to full student status
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Update user to full student status
    UPDATE profiles 
    SET application_status = 'student'
    WHERE user_id = NEW.student_id 
      AND application_status = 'enrolled_pending_payment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment completion
DROP TRIGGER IF EXISTS payment_completion_trigger ON billing;
CREATE TRIGGER payment_completion_trigger
  AFTER UPDATE ON billing
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_completion();