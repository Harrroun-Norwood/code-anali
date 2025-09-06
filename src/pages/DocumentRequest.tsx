import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Mail, Truck, Clock } from 'lucide-react';

interface DocumentType {
  id: string;
  name: string;
  description: string;
  processing_time: string;
  fee: number;
}

interface DocumentRequest {
  id: string;
  document_type: string;
  delivery_method: string;
  status: string;
  request_date: string;
  estimated_completion: string;
}

const DocumentRequest = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);

  const documentTypes: DocumentType[] = [
    {
      id: 'form138',
      name: 'Form 138 (Report Card)',
      description: 'Official academic record and grades',
      processing_time: '3-5 business days',
      fee: 50
    },
    {
      id: 'form137',
      name: 'Form 137 (Permanent Record)',
      description: 'Comprehensive academic history',
      processing_time: '5-7 business days',
      fee: 100
    },
    {
      id: 'good_moral',
      name: 'Certificate of Good Moral',
      description: 'Character certification',
      processing_time: '2-3 business days',
      fee: 30
    },
    {
      id: 'enrollment_cert',
      name: 'Certificate of Enrollment',
      description: 'Proof of current enrollment',
      processing_time: '1-2 business days',
      fee: 25
    },
    {
      id: 'diploma',
      name: 'Diploma',
      description: 'Official graduation certificate',
      processing_time: '7-10 business days',
      fee: 200
    }
  ];

  useEffect(() => {
    if (user) {
      fetchDocumentRequests();
    }
  }, [user]);

  const fetchDocumentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRequests: DocumentRequest[] = (data || []).map(req => ({
        ...req,
        delivery_method: getDeliveryMethodLabel(req.document_type),
        estimated_completion: calculateEstimatedCompletion(req.request_date, req.document_type)
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching document requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document requests.',
        variant: 'destructive',
      });
    }
  };

  const getDeliveryMethodLabel = (docType: string) => {
    // This is a placeholder - in real implementation, you'd store this in the database
    return 'Email (Soft Copy)';
  };

  const calculateEstimatedCompletion = (requestDate: string, docType: string) => {
    const docTypeObj = documentTypes.find(dt => dt.name.includes(docType.split(' ')[0]));
    if (!docTypeObj) return requestDate;

    const days = parseInt(docTypeObj.processing_time.split('-')[1]) || 5;
    const date = new Date(requestDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument || !deliveryMethod) {
      toast({
        title: 'Missing Information',
        description: 'Please select a document type and delivery method.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const selectedDoc = documentTypes.find(doc => doc.id === selectedDocument);
      if (!selectedDoc) throw new Error('Document type not found');

      const { error } = await supabase
        .from('document_requests')
        .insert({
          student_id: user?.id,
          student_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Student',
          document_type: selectedDoc.name,
          notes: notes || null
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your document request has been submitted successfully.',
      });
      
      // Reset form and refresh data
      setSelectedDocument('');
      setDeliveryMethod('');
      setNotes('');
      fetchDocumentRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedDocType = documentTypes.find(doc => doc.id === selectedDocument);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Document Request</h1>
          <p className="text-muted-foreground">
            Request official documents and certificates from ANALI.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  New Document Request
                </CardTitle>
                <CardDescription>
                  Fill out the form below to request official documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="document">Document Type</Label>
                    <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name} - ₱{doc.fee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery">Delivery Method</Label>
                    <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email (Soft Copy) - Free
                          </div>
                        </SelectItem>
                        <SelectItem value="pickup">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            School Pickup (Hard Copy) - Free
                          </div>
                        </SelectItem>
                        <SelectItem value="delivery">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            Home Delivery (Hard Copy) - ₱100
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special instructions or notes..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Request History */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Request History</CardTitle>
                <CardDescription>
                  Track the status of your document requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No document requests found. Submit your first request above.
                    </p>
                  ) : (
                    requests.map((request) => (
                    <div key={request.id} className="flex justify-between items-start p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{request.document_type}</h3>
                        <p className="text-sm text-muted-foreground">{request.delivery_method}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested: {new Date(request.request_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        {request.status === 'completed' && (
                          <Button variant="outline" size="sm" className="mt-2">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Details */}
          <div className="space-y-6">
            {selectedDocType && (
              <Card>
                <CardHeader>
                  <CardTitle>Document Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{selectedDocType.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedDocType.description}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Processing Time:</span>
                      <span>{selectedDocType.processing_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Document Fee:</span>
                      <span>₱{selectedDocType.fee}</span>
                    </div>
                    {deliveryMethod === 'delivery' && (
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span>₱100</span>
                      </div>
                    )}
                    <hr />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>₱{selectedDocType.fee + (deliveryMethod === 'delivery' ? 100 : 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Processing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold">Processing Times</h4>
                    <p className="text-muted-foreground">Business days exclude weekends and holidays</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Delivery Options</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Email: Instant delivery upon completion</li>
                      <li>• Pickup: Available during office hours</li>
                      <li>• Delivery: 1-2 business days after completion</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Payment</h4>
                    <p className="text-muted-foreground">Fees will be added to your billing account</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentRequest;