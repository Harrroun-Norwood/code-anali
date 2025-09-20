-- Update billing status check constraint to include pending_approval
ALTER TABLE public.billing DROP CONSTRAINT IF EXISTS billing_status_check;

ALTER TABLE public.billing ADD CONSTRAINT billing_status_check 
CHECK (status IN ('pending', 'paid', 'overdue', 'pending_approval'));