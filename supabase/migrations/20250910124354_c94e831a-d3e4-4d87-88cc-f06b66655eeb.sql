-- Add SMS notification settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS contact_number text;

-- Create notification log table
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sms', 'email', 'push')),
  notification_type text NOT NULL,
  message text NOT NULL,
  phone_number text,
  email_address text,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notification_log
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_log
CREATE POLICY "Users can view their own notifications" 
ON public.notification_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" 
ON public.notification_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create trigger for notification_log timestamps
CREATE TRIGGER update_notification_log_updated_at
BEFORE UPDATE ON public.notification_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();