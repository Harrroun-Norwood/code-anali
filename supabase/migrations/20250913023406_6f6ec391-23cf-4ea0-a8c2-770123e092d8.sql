-- Fix OTP table exposure - remove overly permissive policy and create secure ones
DROP POLICY IF EXISTS "Users can verify their own email OTP" ON public.email_verification_otps;

-- Create secure OTP policies
CREATE POLICY "Service role can manage OTPs" 
ON public.email_verification_otps 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Users can verify OTP for their email" 
ON public.email_verification_otps 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND email IN (
    SELECT p.email FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Enhance role update security - add audit logging
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  old_role user_role,
  new_role user_role NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  reason text
);

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view role changes" 
ON public.role_change_audit 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- Create function to validate role changes
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only super_admins can change roles
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized role change attempt';
  END IF;
  
  -- Log the role change
  INSERT INTO public.role_change_audit (
    user_id, old_role, new_role, changed_by
  ) VALUES (
    NEW.user_id, OLD.role, NEW.role, auth.uid()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;