import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentRequest {
  requestId: string;
  studentName: string;
  documentType: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, studentName, documentType, notes }: DocumentRequest = await req.json();

    // Generate a simple document (in a real scenario, you'd use a proper document generation library)
    const documentContent = generateDocumentContent(studentName, documentType, notes);
    
    // In a real implementation, you would:
    // 1. Generate a proper PDF using a library like jsPDF or puppeteer
    // 2. Upload it to Supabase Storage
    // 3. Return the public URL
    
    // For now, we'll create a simple text-based document
    const fileName = `${documentType.toLowerCase().replace(' ', '_')}_${studentName.replace(' ', '_')}_${Date.now()}.txt`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('enrollment-documents')
      .upload(fileName, documentContent, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('enrollment-documents')
      .getPublicUrl(fileName);

    console.log(`Document generated successfully for ${studentName}: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentUrl: urlData.publicUrl,
        fileName 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in generate-document function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while generating the document' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function generateDocumentContent(studentName: string, documentType: string, notes?: string): string {
  const currentDate = new Date().toLocaleDateString();
  
  let content = '';
  
  switch (documentType.toLowerCase()) {
    case 'certificate of enrollment':
      content = `
CERTIFICATE OF ENROLLMENT

This is to certify that ${studentName} is currently enrolled as a student at 
ANALI - Assist N Achieve Leaders International for the current academic year.

This certificate is issued upon request for whatever legal purpose it may serve.

Date Issued: ${currentDate}

_____________________
Registrar

${notes ? `\nNotes: ${notes}` : ''}
      `;
      break;
      
    case 'transcript of records':
      content = `
TRANSCRIPT OF RECORDS

Student Name: ${studentName}
Date of Issue: ${currentDate}

This document contains the academic records of the above-named student.

[Academic records would be populated here from the database]

_____________________
Registrar

${notes ? `\nNotes: ${notes}` : ''}
      `;
      break;
      
    case 'certificate of good moral':
      content = `
CERTIFICATE OF GOOD MORAL CHARACTER

This is to certify that ${studentName} has maintained good moral character 
during their enrollment at ANALI - Assist N Achieve Leaders International.

The student has not been involved in any disciplinary actions and has 
conducted themselves in accordance with the school's code of conduct.

Date Issued: ${currentDate}

_____________________
Student Affairs Office

${notes ? `\nNotes: ${notes}` : ''}
      `;
      break;
      
    default:
      content = `
${documentType.toUpperCase()}

Student Name: ${studentName}
Date of Issue: ${currentDate}

This document is issued by ANALI - Assist N Achieve Leaders International.

_____________________
Administration

${notes ? `\nNotes: ${notes}` : ''}
      `;
  }
  
  return content.trim();
}

serve(handler);