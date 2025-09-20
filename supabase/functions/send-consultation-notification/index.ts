import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConsultationNotificationRequest {
  type: 'confirmed' | 'completed';
  applicant_name: string;
  applicant_email: string;
  consultation_date?: string;
  consultation_time?: string;
  meeting_link?: string;
  admin_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      applicant_name, 
      applicant_email, 
      consultation_date, 
      consultation_time, 
      meeting_link,
      admin_email 
    }: ConsultationNotificationRequest = await req.json();

    console.log('Processing consultation notification:', { type, applicant_name, applicant_email, consultation_date, consultation_time, meeting_link });

    if (!type) {
      throw new Error('Missing required parameter: type');
    }

    if (!applicant_name || !applicant_email) {
      throw new Error('Missing required parameters: applicant_name and applicant_email');
    }

    const notifications = [];

    if (type === 'confirmed') {
      // Send confirmation email to applicant
      const applicantResponse = await resend.emails.send({
        from: "ANALI <onboarding@resend.dev>",
        to: [applicant_email],
        subject: "Consultation Confirmed - ANALI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Consultation Confirmed</h1>
            <p>Dear ${applicant_name},</p>
            <p>Your consultation has been confirmed!</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3>Meeting Details:</h3>
              <p><strong>Date:</strong> ${consultation_date}</p>
              <p><strong>Time:</strong> ${consultation_time}</p>
              ${meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${meeting_link}" style="color: #2563eb;">${meeting_link}</a></p>` : ''}
            </div>
            
            <p>Please join the meeting at the scheduled time. We look forward to discussing our programs with you!</p>
            
            <p>Best regards,<br>The ANALI Team</p>
          </div>
        `,
      });
      notifications.push(applicantResponse);

      // Send notification to admin if provided
      if (admin_email && meeting_link) {
        const adminResponse = await resend.emails.send({
          from: "ANALI <onboarding@resend.dev>",
          to: [admin_email],
          subject: `Consultation Scheduled - ${applicant_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">Consultation Scheduled</h1>
              <p>A consultation has been confirmed for:</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>Applicant Details:</h3>
                <p><strong>Name:</strong> ${applicant_name}</p>
                <p><strong>Email:</strong> ${applicant_email}</p>
                <p><strong>Date:</strong> ${consultation_date}</p>
                <p><strong>Time:</strong> ${consultation_time}</p>
                <p><strong>Meeting Link:</strong> <a href="${meeting_link}" style="color: #2563eb;">${meeting_link}</a></p>
              </div>
              
              <p>Please ensure you're available at the scheduled time.</p>
            </div>
          `,
        });
        notifications.push(adminResponse);
      }
    } else if (type === 'completed') {
      // Send completion email to applicant
      const completionResponse = await resend.emails.send({
        from: "ANALI <onboarding@resend.dev>",
        to: [applicant_email],
        subject: "Ready to Enroll - ANALI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Consultation Completed!</h1>
            <p>Dear ${applicant_name},</p>
            <p>Thank you for attending your consultation with us!</p>
            
            <div style="background-color: #ecfdf5; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
              <h3>Next Steps:</h3>
              <p>✅ You can now proceed with your enrollment</p>
              <p>✅ Access the enrollment form in your dashboard</p>
              <p>✅ Submit required documents</p>
            </div>
            
            <p>Please log into your account and navigate to the enrollment section to complete your registration.</p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>The ANALI Team</p>
          </div>
        `,
      });
      notifications.push(completionResponse);
    }

    console.log('Notifications sent successfully:', notifications.length);

    return new Response(JSON.stringify({ 
      success: true, 
      notifications_sent: notifications.length 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending consultation notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);