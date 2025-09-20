import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Mail, 
  Package, 
  Calendar, 
  User, 
  Eye, 
  Send,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface DocumentRequest {
  id: string;
  student_id: string;
  student_name: string;
  document_type: string;
  status: string;
  delivery_method?: string; // Make optional since it might not exist in old records
  request_date: string;
  completion_date?: string;
  pickup_date?: string;
  document_url?: string;
  notes?: string;
  grade_section?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const EnhancedDocumentGenerator = () => {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [processingNotes, setProcessingNotes] = useState('');

  useEffect(() => {
    if (user && (isRole('registrar') || isRole('super_admin'))) {
      fetchDocumentRequests();
    }
  }, [user, isRole]);

  const fetchDocumentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          *,
          profiles:student_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const enrichedRequests = (data || []).map(request => ({
        ...request,
        student_name: request.profiles ? 
          `${request.profiles.first_name} ${request.profiles.last_name}` : 
          request.student_name || 'Unknown Student',
        delivery_method: (request as any).delivery_method || 'soft_copy' // Provide default value
      }));
      
      setDocumentRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching document requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, requestId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${requestId}-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('enrollment-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('enrollment-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const processDocumentRequest = async (requestId: string, action: 'generate' | 'complete') => {
    try {
      const request = documentRequests.find(r => r.id === requestId);
      if (!request) return;

      let documentUrl = request.document_url;

      // If generating document and file is provided
      if (action === 'generate' && documentFile) {
        documentUrl = await handleFileUpload(documentFile, requestId);
      }

      // Update document request
      const updateData: any = {
        status: action === 'generate' ? 'ready' : 'completed',
        completion_date: new Date().toISOString(),
      };

      if (documentUrl) {
        updateData.document_url = documentUrl;
      }

      if (processingNotes) {
        updateData.notes = processingNotes;
      }

      const { error: updateError } = await supabase
        .from('document_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Send document via email if soft copy delivery
      if (request.delivery_method === 'soft_copy' && documentUrl && request.profiles?.email) {
        await sendDocumentEmail(request, documentUrl);
      }

      toast({
        title: 'Success',
        description: `Document ${action === 'generate' ? 'generated' : 'completed'} successfully.`,
      });

      fetchDocumentRequests();
      setSelectedRequest(null);
      setDocumentFile(null);
      setProcessingNotes('');
    } catch (error) {
      console.error('Error processing document request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process document request.',
        variant: 'destructive',
      });
    }
  };

  const sendDocumentEmail = async (request: DocumentRequest, documentUrl: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-document-email', {
        body: {
          to: request.profiles?.email,
          studentName: request.student_name,
          documentType: request.document_type,
          documentUrl,
          notes: processingNotes
        }
      });

      if (error) throw error;

      // Log the document delivery
      await supabase
        .from('notification_log')
        .insert({
          user_id: request.student_id,
          email_address: request.profiles?.email,
          type: 'email',
          notification_type: 'document_delivery',
          message: `${request.document_type} document has been sent via email`,
          status: 'sent'
        });

      toast({
        title: 'Email Sent',
        description: 'Document has been sent to the student via email.',
      });
    } catch (error) {
      console.error('Error sending document email:', error);
      toast({
        title: 'Warning',
        description: 'Document processed but email delivery failed.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4" />;
      case 'ready':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Document Request Management</h2>
          <p className="text-muted-foreground">
            Process document requests and send documents to students
          </p>
        </div>
      </div>

      {documentRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No document requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documentRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {request.student_name}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status.toUpperCase()}
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{request.document_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.delivery_method === 'soft_copy' ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                        <span className="capitalize">{request.delivery_method.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(request.request_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {request.grade_section && (
                      <div className="text-sm">
                        <span className="font-medium">Grade/Section:</span> {request.grade_section}
                      </div>
                    )}

                    {request.document_url && (
                      <div className="text-sm">
                        <span className="font-medium">Document:</span>{' '}
                        <a 
                          href={request.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setProcessingNotes(request.notes || '');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Process
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Process Document Request</DialogTitle>
                          <DialogDescription>
                            Generate and send document for {request.student_name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedRequest && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="font-medium">Document Type</Label>
                                <p>{selectedRequest.document_type}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Delivery Method</Label>
                                <p className="capitalize">{selectedRequest.delivery_method.replace('_', ' ')}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Student Email</Label>
                                <p>{selectedRequest.profiles?.email}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Request Date</Label>
                                <p>{new Date(selectedRequest.request_date).toLocaleDateString()}</p>
                              </div>
                            </div>

                            {selectedRequest.grade_section && (
                              <div>
                                <Label className="font-medium">Grade/Section</Label>
                                <p>{selectedRequest.grade_section}</p>
                              </div>
                            )}

                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="document_file">Upload Document (PDF)</Label>
                                <Input
                                  id="document_file"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                                />
                              </div>

                              <div>
                                <Label htmlFor="notes">Processing Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={processingNotes}
                                  onChange={(e) => setProcessingNotes(e.target.value)}
                                  placeholder="Additional notes for the student..."
                                />
                              </div>

                              <div className="flex gap-2">
                                {selectedRequest.status === 'pending' && (
                                  <>
                                    <Button
                                      onClick={() => processDocumentRequest(selectedRequest.id, 'generate')}
                                      disabled={!documentFile}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Generate & Send Document
                                    </Button>
                                  </>
                                )}
                                
                                {selectedRequest.status === 'ready' && (
                                  <Button
                                    onClick={() => processDocumentRequest(selectedRequest.id, 'complete')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Completed
                                  </Button>
                                )}
                              </div>
                            </div>

                            {selectedRequest.delivery_method === 'hard_copy' && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-yellow-800">
                                  <Package className="h-5 w-5" />
                                  <span className="font-medium">Hard Copy Delivery</span>
                                </div>
                                <p className="text-sm text-yellow-700 mt-1">
                                  This request requires physical document preparation. Please prepare the hard copy for pickup or delivery.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedDocumentGenerator;