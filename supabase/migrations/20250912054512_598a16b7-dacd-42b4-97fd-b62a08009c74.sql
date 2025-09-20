-- Fix admin profiles to have correct application_status
UPDATE profiles 
SET application_status = 'student', updated_at = now() 
WHERE role IN ('super_admin', 'registrar', 'accountant', 'teacher') 
AND application_status = 'applicant';

-- Create function to automatically generate billing records
CREATE OR REPLACE FUNCTION generate_billing_records(
  p_student_id UUID,
  p_enrollment_id UUID,
  p_tuition_fee NUMERIC,
  p_payment_plan TEXT
) RETURNS VOID AS $$
DECLARE
  installments INT;
  installment_amount NUMERIC;
  due_date DATE;
  i INT;
BEGIN
  -- Determine installments based on payment plan
  CASE p_payment_plan
    WHEN 'monthly' THEN
      installments := 10;
      installment_amount := CEIL(p_tuition_fee / 10);
    WHEN 'quarterly' THEN
      installments := 4;
      installment_amount := CEIL(p_tuition_fee / 4);
    ELSE
      installments := 1;
      installment_amount := p_tuition_fee;
  END CASE;

  -- Generate billing records
  FOR i IN 1..installments LOOP
    -- Calculate due date
    IF p_payment_plan = 'monthly' THEN
      due_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' * i;
    ELSIF p_payment_plan = 'quarterly' THEN
      due_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '3 months' * i;
    ELSE
      due_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
    END IF;

    -- Insert billing record
    INSERT INTO billing (
      student_id,
      enrollment_id,
      amount,
      due_date,
      status,
      notes,
      created_at,
      updated_at
    ) VALUES (
      p_student_id,
      p_enrollment_id,
      CASE WHEN i = installments THEN p_tuition_fee - (installment_amount * (installments - 1)) ELSE installment_amount END,
      due_date,
      'pending',
      p_payment_plan || ' payment ' || i || ' of ' || installments,
      NOW(),
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update student status after enrollment approval
CREATE OR REPLACE FUNCTION handle_enrollment_approval() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to approved
  IF NEW.enrollment_status = 'approved' AND OLD.enrollment_status != 'approved' THEN
    -- Update student's application status
    UPDATE profiles 
    SET application_status = 'student', updated_at = NOW()
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
$$ LANGUAGE plpgsql;

-- Create trigger for enrollment approval
DROP TRIGGER IF EXISTS trigger_enrollment_approval ON enrollments;
CREATE TRIGGER trigger_enrollment_approval
  AFTER UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION handle_enrollment_approval();

-- Add index for better performance on billing queries
CREATE INDEX IF NOT EXISTS idx_billing_student_status ON billing(student_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_due_date ON billing(due_date);

-- Create a view for student billing summary
CREATE OR REPLACE VIEW student_billing_summary AS
SELECT 
  b.student_id,
  p.first_name,
  p.last_name,
  p.email,
  COUNT(*) as total_bills,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bills,
  COUNT(CASE WHEN b.status = 'paid' THEN 1 END) as paid_bills,
  SUM(b.amount) as total_amount,
  SUM(CASE WHEN b.status = 'pending' THEN b.amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN b.status = 'paid' THEN b.amount ELSE 0 END) as paid_amount
FROM billing b
JOIN profiles p ON p.user_id = b.student_id
GROUP BY b.student_id, p.first_name, p.last_name, p.email;