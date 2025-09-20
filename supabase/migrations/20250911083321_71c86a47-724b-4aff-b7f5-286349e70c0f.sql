-- Create table to store temporary OTP codes
CREATE TABLE public.email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_verification_otps ENABLE ROW LEVEL SECURITY;

-- Create policy for OTP verification (anyone can verify their own email)
CREATE POLICY "Users can verify their own email OTP" 
ON public.email_verification_otps 
FOR SELECT 
USING (true);

-- Create policy for inserting OTP (service role only)
CREATE POLICY "Service role can insert OTP" 
ON public.email_verification_otps 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_email_verification_otps_email_code ON public.email_verification_otps(email, otp_code);
CREATE INDEX idx_email_verification_otps_expires_at ON public.email_verification_otps(expires_at);

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.email_verification_otps 
  WHERE expires_at < now() - INTERVAL '1 hour';
$$;