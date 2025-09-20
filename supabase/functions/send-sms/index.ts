import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  to: string;
  message: string;
  type: 'enrollment_confirmed' | 'payment_reminder' | 'status_update' | 'general';
  user_id?: string;
}

// Format phone number to E.164 international format
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle Philippine numbers
  if (digits.startsWith('09') && digits.length === 11) {
    // Convert 09XXXXXXXXX to +63 9XXXXXXXXX
    return `+63${digits.substring(1)}`;
  }
  
  // Handle numbers that already start with 63
  if (digits.startsWith('63') && digits.length === 12) {
    return `+${digits}`;
  }
  
  // If already in international format, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Default: assume it needs +63 prefix for Philippine numbers
  if (digits.length === 10 && digits.startsWith('9')) {
    return `+63${digits}`;
  }
  
  // Return with + if it doesn't have it
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('SMS function called');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { to, message, type, user_id }: SMSRequest = await req.json();

    // Format phone number to international E.164 format for Twilio
    const formattedPhoneNumber = formatPhoneNumber(to);
    
    console.log('Original number:', to);
    console.log('Formatted number:', formattedPhoneNumber);
    console.log('Sending SMS to:', formattedPhoneNumber, 'Type:', type);

    // Check if user has SMS notifications enabled (if user_id provided)
    if (user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('sms_notifications_enabled')
        .eq('user_id', user_id)
        .single();

      if (profile && !profile.sms_notifications_enabled) {
        console.log('SMS notifications disabled for user:', user_id);
        return new Response(
          JSON.stringify({ success: true, message: 'SMS notifications disabled for user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send SMS using Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const body = new URLSearchParams({
      To: formattedPhoneNumber,
      From: fromNumber,
      Body: message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio API error:', result);
      throw new Error(`Twilio error: ${result.message}`);
    }

    console.log('SMS sent successfully:', result.sid);

    // Log SMS notification
    if (user_id) {
      await supabaseAdmin
        .from('notification_log')
        .insert({
          user_id,
          type: 'sms',
          message,
          phone_number: formattedPhoneNumber,
          status: 'sent',
          notification_type: type
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        sid: result.sid 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SMS function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});