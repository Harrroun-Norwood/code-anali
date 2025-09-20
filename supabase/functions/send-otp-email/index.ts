import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPEmailRequest {
  email: string;
  firstName?: string;
  lastName?: string;
}

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: OTPEmailRequest = await req.json();

    console.log('Sending OTP email to:', email);

    // Create Supabase client with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate 6-digit OTP
    const otpCode = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    // Store OTP in database
    const { error: dbError } = await supabaseService
      .from('email_verification_otps')
      .insert({
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        verified: false
      });

    if (dbError) {
      console.error('Error storing OTP:', dbError);
      throw new Error('Failed to generate verification code');
    }

    // Send email with OTP
    const emailResponse = await resend.emails.send({
      from: "ANALI <onboarding@resend.dev>", // You'll need to update this with your domain
      to: [email],
      subject: "Your ANALI Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e40af; font-size: 28px; margin: 0;">ANALI</h1>
              <p style="color: #6b7280; margin: 5px 0;">Assist N Achieve Leaders International</p>
            </div>
            
            <h2 style="color: #1f2937; margin-bottom: 20px;">Email Verification</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              Hello ${firstName ? `${firstName}` : ''}! Welcome to ANALI.
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              Please enter the following 6-digit verification code to complete your registration:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #f3f4f6; padding: 20px 30px; border-radius: 8px; border: 2px dashed #1e40af;">
                <span style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; font-family: monospace;">
                  ${otpCode}
                </span>
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © 2025 ANALI - Assist N Achieve Leaders International<br>
              395 Brgy, Aguinaldo Hwy, Bacoor, Cavite, Philippines
            </p>
          </div>
        </div>
      `,
    });

    console.log("OTP email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send verification code' 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});