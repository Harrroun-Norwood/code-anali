-- Add RLS policy for accountants to update billing records
CREATE POLICY "Accountants can update billing records" 
ON public.billing 
FOR UPDATE 
USING (has_role(auth.uid(), 'accountant'::user_role))
WITH CHECK (has_role(auth.uid(), 'accountant'::user_role));