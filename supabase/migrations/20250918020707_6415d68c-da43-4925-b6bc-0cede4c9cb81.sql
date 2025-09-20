-- Add RLS policy for accountants to view all billing records
CREATE POLICY "Accountants can view all billing records" 
ON public.billing 
FOR SELECT 
USING (has_role(auth.uid(), 'accountant'::user_role));