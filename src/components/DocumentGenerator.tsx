import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Send } from 'lucide-react';

interface DocumentGeneratorProps {
  requestId: string;
  studentName: string;
  documentType: string;
  deliveryMethod: string;
  onDocumentGenerated: () => void;
}

const DocumentGenerator = ({ 
  requestId, 
  studentName, 
  documentType, 
  deliveryMethod,
  onDocumentGenerated 
}: DocumentGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const generateDocument = async () => {
    setLoading(true);
    try {
      // Call edge function to generate document
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: {
          requestId,
          studentName,
          documentType,
          notes: notes || `Generated ${documentType} for ${studentName}`
        }
      });

      if (error) throw error;

      // Update the document request with the generated file URL
      const { error: updateError } = await supabase
        .from('document_requests')
        .update({
          status: deliveryMethod === 'soft_copy' ? 'completed' : 'ready_for_pickup',
          document_url: data.documentUrl,
          completion_date: new Date().toISOString(),
          notes
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: 'Document Generated',
        description: `${documentType} has been successfully generated for ${studentName}`,
      });

      onDocumentGenerated();
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendDocument = async () => {
    if (deliveryMethod !== 'soft_copy') return;
    
    setLoading(true);
    try {
      // Get the document request details
      const { data: requestData, error: fetchError } = await supabase
        .from('document_requests')
        .select('*, profiles!inner(email, first_name, last_name)')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      if (!requestData.document_url) {
        throw new Error('Document not yet generated');
      }

      // Send document via email (this would typically be done via an edge function)
      const { error: emailError } = await supabase.functions.invoke('send-document-email', {
        body: {
          recipientEmail: requestData.profiles.email,
          recipientName: `${requestData.profiles.first_name} ${requestData.profiles.last_name}`,
          documentType,
          documentUrl: requestData.document_url,
          studentName
        }
      });

      if (emailError) throw emailError;

      toast({
        title: 'Document Sent',
        description: `${documentType} has been sent to the student's email`,
      });

    } catch (error) {
      console.error('Error sending document:', error);
      toast({
        title: 'Send Failed',
        description: 'Failed to send document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate {documentType}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="font-medium">Student:</Label>
            <p className="text-muted-foreground">{studentName}</p>
          </div>
          <div>
            <Label className="font-medium">Document Type:</Label>
            <p className="text-muted-foreground">{documentType}</p>
          </div>
          <div>
            <Label className="font-medium">Delivery Method:</Label>
            <p className="text-muted-foreground capitalize">{deliveryMethod.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any special instructions or notes..."
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={generateDocument} 
            disabled={loading}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Document'}
          </Button>
          
          {deliveryMethod === 'soft_copy' && (
            <Button 
              onClick={sendDocument} 
              disabled={loading}
              variant="outline"
            >
              <Send className="w-4 h-4 mr-2" />
              Send via Email
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentGenerator;