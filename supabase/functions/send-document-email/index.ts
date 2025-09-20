import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentEmailRequest {
  recipientEmail: string;
  recipientName: string;
  documentType: string;
  documentUrl: string;
  studentName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      recipientEmail, 
      recipientName, 
      documentType, 
      documentUrl,
      studentName 
    }: DocumentEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "ANALI Documents <documents@anali.edu.ph>",
      to: [recipientEmail],
      subject: `Your ${documentType} is Ready - ANALI`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">ANALI</h1>
            <p style="color: #666; margin: 5px 0;">Assist N Achieve Leaders International</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">Your Document is Ready!</h2>
            
            <p>Dear ${recipientName},</p>
            
            <p>Your requested <strong>${documentType}</strong> for <strong>${studentName}</strong> has been processed and is now available for download.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Document Details:</h3>
              <p><strong>Document Type:</strong> ${documentType}</p>
              <p><strong>Student Name:</strong> ${studentName}</p>
              <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${documentUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Download Document
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Note: This document is digitally generated and does not require a physical signature for most purposes. 
              If you need an official sealed copy, please contact our registrar's office.
            </p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            ANALI Registrar's Office</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>ANALI - Assist N Achieve Leaders International</p>
            <p>395 Brgy, Aguinaldo Hwy, Bacoor, Cavite</p>
            <p>Phone: 09190671960, 09673008378 | Email: analilearningigloo@gmail.com</p>
          </div>
        </div>
      `,
    });

    console.log("Document email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-document-email function:", error);
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