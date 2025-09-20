-- Fix security definer view issue by removing SECURITY DEFINER from student_billing_summary view
DROP VIEW IF EXISTS student_billing_summary;

-- Create the view without SECURITY DEFINER to fix the security issue
CREATE VIEW student_billing_summary AS
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