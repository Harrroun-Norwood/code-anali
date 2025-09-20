-- Drop the security definer view that's causing the security issue
DROP VIEW IF EXISTS public.student_billing_summary;

-- Recreate as a regular view without security definer
CREATE VIEW public.student_billing_summary AS
SELECT 
  p.user_id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  COUNT(b.id) as total_bills,
  COUNT(CASE WHEN b.status = 'paid' THEN 1 END) as paid_bills,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bills,
  COALESCE(SUM(b.amount), 0) as total_amount,
  COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.amount ELSE 0 END), 0) as paid_amount,
  COALESCE(SUM(CASE WHEN b.status = 'pending' THEN b.amount ELSE 0 END), 0) as pending_amount
FROM profiles p
LEFT JOIN billing b ON p.user_id = b.student_id
WHERE p.role = 'student'
GROUP BY p.user_id, p.first_name, p.last_name, p.email;