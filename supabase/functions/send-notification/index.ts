import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'sms' | 'email';
  phoneNumber?: string;
  email?: string;
  message: string;
  userId?: string;
  notificationType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: NotificationRequest = await req.json();
    const { type, phoneNumber, email, message, userId, notificationType } = body;

    console.log('Sending notification:', { type, phoneNumber, email, notificationType });

    if (type === 'sms' && phoneNumber) {
      // Send SMS using your SMS service (implement based on your provider)
      // For now, we'll log the notification to the database
      await supabaseAdmin
        .from('notification_log')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          type: 'sms',
          notification_type: notificationType,
          message: message,
          status: 'sent'
        });

      console.log('SMS notification logged:', phoneNumber);
    } else if (type === 'email' && email) {
      // Log email notification
      await supabaseAdmin
        .from('notification_log')
        .insert({
          user_id: userId,
          email_address: email,
          type: 'email',
          notification_type: notificationType,
          message: message,
          status: 'sent'
        });

      console.log('Email notification logged:', email);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});