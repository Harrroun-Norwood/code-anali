import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Send, Download, Clock, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DocumentRequest {
  id: string;
  student_id: string;
  student_name: string;
  document_type: string;
  status: string;
  request_date: string;
  completion_date?: string;
  notes?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const DocumentManagementForRegistrar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);

  useEffect(() => {
    fetchDocumentRequests();
  }, []);

  const fetchDocumentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          *,
          profiles:student_id (first_name, last_name, email)
        `)
        .order('request_date', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
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

  const handleFileUpload = async (requestId: string, file: File) => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(requestId);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${requestId}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('enrollment-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update document request status
      const { error: updateError } = await supabase
        .from('document_requests')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString(),
          notes: `Document uploaded: ${fileName}`
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Find the request to get student info
      const request = requests.find(r => r.id === requestId);
      
      // Send notification to student
      if (request?.profiles?.email) {
        await supabase
          .from('notification_log')
          .insert({
            user_id: request.student_id,
            email_address: request.profiles.email,
            type: 'email',
            notification_type: 'document_ready',
            message: `Your requested document "${request.document_type}" is ready for download. Please check your student dashboard.`,
            status: 'pending'
          });
      }

      toast({
        title: 'Document Uploaded Successfully',
        description: 'The student has been notified that their document is ready.',
      });

      setSelectedFile(null);
      setSelectedRequest(null);
      fetchDocumentRequests();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload the document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleGenerateDocument = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Call the document generation function
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: {
          requestId: requestId,
          documentType: request.document_type,
          studentName: request.student_name
        }
      });

      if (error) throw error;

      toast({
        title: 'Document Generated Successfully',
        description: 'The document has been generated and the student has been notified.',
      });

      fetchDocumentRequests();
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate the document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Upload className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-muted-foreground">
            Process student document requests and upload documents
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Document Requests</h3>
              <p className="text-muted-foreground">
                Student document requests will appear here when submitted.
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {request.document_type}
                    </CardTitle>
                    <CardDescription>
                      Requested by {request.profiles?.first_name} {request.profiles?.last_name} on{' '}
                      {new Date(request.request_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {getStatusIcon(request.status)}
                    <span className="ml-2">{request.status.toUpperCase()}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Student</p>
                    <p className="text-sm">{request.student_name}</p>
                    <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Request Date</p>
                    <p className="text-sm">{new Date(request.request_date).toLocaleDateString()}</p>
                  </div>
                  {request.completion_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completion Date</p>
                      <p className="text-sm">{new Date(request.completion_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {request.notes && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{request.notes}</p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleGenerateDocument(request.id)}
                      disabled={processingId === request.id}
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Document
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Document</DialogTitle>
                          <DialogDescription>
                            Upload a document file for {request.student_name}'s request for {request.document_type}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="document-file">Select Document File</Label>
                            <Input
                              id="document-file"
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max: 10MB)
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(null);
                              setSelectedFile(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => selectedRequest && selectedFile && handleFileUpload(selectedRequest.id, selectedFile)}
                            disabled={!selectedFile || processingId === selectedRequest?.id}
                          >
                            {processingId === selectedRequest?.id ? 'Uploading...' : 'Upload Document'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {request.status === 'completed' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Document has been sent to student</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentManagementForRegistrar;