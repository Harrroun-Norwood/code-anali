import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle, XCircle, Upload, Download, Mail, Calendar, User } from 'lucide-react';

interface DocumentRequest {
  id: string;
  student_id: string;
  document_type: string;
  status: string;
  request_date: string;
  completion_date: string | null;
  pickup_date: string | null;
  notes: string | null;
  grade_section: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
  };
}

const DocumentProcessing = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'decline' | 'complete'>('approve');
  const [actionNotes, setActionNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [completionDate, setCompletionDate] = useState('');

  useEffect(() => {
    fetchDocumentRequests();
  }, []);

  const fetchDocumentRequests = async () => {
    console.log('Fetching document requests...');
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          *,
          profiles!document_requests_student_id_fkey (
            first_name,
            last_name,
            email,
            contact_number
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Document requests fetch error:', error);
        throw error;
      }
      
      console.log('Fetched document requests:', data?.length || 0, data);
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

  const handleRequestAction = async () => {
    if (!selectedRequest) return;

    try {
      const updates: any = {
        status: actionType === 'approve' ? 'processing' : actionType === 'decline' ? 'cancelled' : 'completed',
        notes: actionNotes || null
      };

      if (actionType === 'complete') {
        updates.completion_date = completionDate || new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('document_requests')
        .update(updates)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Simulate file upload for soft copies
      if (actionType === 'complete' && uploadedFile) {
        // In a real implementation, this would upload to Supabase Storage
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({
        title: 'Success',
        description: `Document request ${updates.status} successfully.`,
      });

      setSelectedRequest(null);
      setActionNotes('');
      setUploadedFile(null);
      setCompletionDate('');
      fetchDocumentRequests();
    } catch (error) {
      console.error('Error updating document request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update document request.',
        variant: 'destructive',
      });
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

  const getPriorityColor = (status: string, requestDate: string) => {
    const daysSinceRequest = Math.floor((Date.now() - new Date(requestDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (status === 'pending' && daysSinceRequest > 7) return 'border-red-200 bg-red-50';
    if (status === 'pending' && daysSinceRequest > 3) return 'border-yellow-200 bg-yellow-50';
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">
                  {requests.filter(r => r.status === 'processing').length}
                </p>
              </div>
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => {
                    const requestMonth = new Date(r.request_date).getMonth();
                    const currentMonth = new Date().getMonth();
                    return requestMonth === currentMonth;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Request Management
          </CardTitle>
          <CardDescription>
            Process student document requests - approve, decline, or mark as completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className={`p-4 border rounded-lg hover:shadow-sm transition-shadow ${getPriorityColor(request.status, request.request_date)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-semibold text-lg">
                        {request.profiles?.first_name} {request.profiles?.last_name}
                      </h4>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      {Math.floor((Date.now() - new Date(request.request_date).getTime()) / (1000 * 60 * 60 * 24)) > 7 && request.status === 'pending' && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{request.document_type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{request.profiles?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Requested: {new Date(request.request_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {request.grade_section && (
                          <div>
                            <span className="text-muted-foreground">Grade/Section: </span>
                            <span>{request.grade_section}</span>
                          </div>
                        )}
                        {request.completion_date && (
                          <div>
                            <span className="text-muted-foreground">Completed: </span>
                            <span>{new Date(request.completion_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {request.pickup_date && (
                          <div>
                            <span className="text-muted-foreground">Picked up: </span>
                            <span>{new Date(request.pickup_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {request.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground italic">
                          Notes: {request.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {request.status === 'pending' && (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Document Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>
                                Approve document request for <strong>{request.document_type}</strong> by{' '}
                                <strong>{request.profiles?.first_name} {request.profiles?.last_name}</strong>?
                              </p>
                              <div className="space-y-2">
                                <Label>Processing Notes (Optional)</Label>
                                <Textarea
                                  value={actionNotes}
                                  onChange={(e) => setActionNotes(e.target.value)}
                                  placeholder="Any additional notes for processing..."
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleRequestAction}>
                                  Approve Request
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('decline');
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Decline Document Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>
                                Decline document request for <strong>{request.document_type}</strong> by{' '}
                                <strong>{request.profiles?.first_name} {request.profiles?.last_name}</strong>?
                              </p>
                              <div className="space-y-2">
                                <Label>Reason for Declining (Required)</Label>
                                <Textarea
                                  value={actionNotes}
                                  onChange={(e) => setActionNotes(e.target.value)}
                                  placeholder="Please provide a reason for declining this request..."
                                  required
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleRequestAction}>
                                  Decline Request
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}

                    {request.status === 'processing' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('complete');
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Mark Complete
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Complete Document Request</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p>
                              Mark document request for <strong>{request.document_type}</strong> as completed.
                            </p>
                            
                            <div className="space-y-2">
                              <Label>Completion Date</Label>
                              <Input
                                type="date"
                                value={completionDate}
                                onChange={(e) => setCompletionDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Upload Soft Copy Document (Optional)</Label>
                              <Input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Upload PDF or image file for digital delivery
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Completion Notes (Optional)</Label>
                              <Textarea
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                                placeholder="Any notes about the completed document..."
                              />
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => {
                                setSelectedRequest(null);
                                setUploadedFile(null);
                                setCompletionDate('');
                                setActionNotes('');
                              }}>
                                Cancel
                              </Button>
                              <Button onClick={handleRequestAction}>
                                Mark as Complete
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {request.status === 'completed' && (
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Document Requests</h3>
                <p className="text-muted-foreground">
                  Document requests from students will appear here.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentProcessing;