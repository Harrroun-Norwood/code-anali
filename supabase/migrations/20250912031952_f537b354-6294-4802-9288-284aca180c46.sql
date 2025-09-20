-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION generate_billing_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  installment_amount NUMERIC;
  due_dates DATE[];
  i INTEGER;
BEGIN
  -- Only generate billing when status changes to approved  
  IF NEW.enrollment_status = 'approved' AND OLD.enrollment_status != 'approved' THEN
    
    -- Calculate installment amount based on payment plan
    IF NEW.payment_plan = 'monthly' THEN
      installment_amount := CEIL(NEW.tuition_fee / 10); -- 10 months
    ELSIF NEW.payment_plan = 'quarterly' THEN  
      installment_amount := CEIL(NEW.tuition_fee / 4); -- 4 quarters
    ELSE 
      installment_amount := NEW.tuition_fee; -- full payment
    END IF;
    
    -- Generate due dates
    IF NEW.payment_plan = 'monthly' THEN
      -- Generate 10 monthly due dates starting from first day of next month
      FOR i IN 1..10 LOOP
        due_dates := array_append(due_dates, DATE_TRUNC('month', NOW()) + INTERVAL '1 month' * i);
      END LOOP;
    ELSIF NEW.payment_plan = 'quarterly' THEN
      -- Generate 4 quarterly due dates
      FOR i IN 1..4 LOOP
        due_dates := array_append(due_dates, DATE_TRUNC('month', NOW()) + INTERVAL '3 months' * i);
      END LOOP;
    ELSE
      -- Full payment due next month
      due_dates := ARRAY[DATE_TRUNC('month', NOW()) + INTERVAL '1 month'];
    END IF;
    
    -- Insert billing records
    FOR i IN 1..array_length(due_dates, 1) LOOP
      INSERT INTO public.billing (
        student_id,
        enrollment_id, 
        amount,
        due_date,
        status,
        notes
      ) VALUES (
        NEW.student_id,
        NEW.id,
        installment_amount,
        due_dates[i],
        'pending',
        NEW.payment_plan || ' payment ' || i || ' of ' || array_length(due_dates, 1)
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;