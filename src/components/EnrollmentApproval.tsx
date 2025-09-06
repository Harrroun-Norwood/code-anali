import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, FileText, Calendar, User, Mail, Phone } from 'lucide-react';

interface Enrollment {
  id: string;
  student_id: string;
  enrollment_status: string;
  academic_year: string;
  semester: string;
  grade_level: string;
  payment_plan: string;
  tuition_fee: number;
  created_at: string;
  lrn: string;
  home_address: string;
  parent_name: string;
  parent_contact: string;
  gmail_account: string;
  programs?: {
    name: string;
    category: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
  };
}

interface Consultation {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  preferred_date: string;
  preferred_time: string;
  program_interest: string;
  status: string;
  notes: string;
  meeting_link: string;
  created_at: string;
}

const EnrollmentApproval = () => {
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'reschedule'>('approve');
  const [actionNotes, setActionNotes] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log('Fetching enrollment approval data...');
    try {
      // Fetch enrollments with detailed logging
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          *,
          programs (name, category),
          profiles!enrollments_student_id_fkey (first_name, last_name, email, contact_number)
        `)
        .order('created_at', { ascending: false });

      if (enrollmentError) {
        console.error('Enrollment fetch error:', enrollmentError);
        throw enrollmentError;
      }
      
      console.log('Fetched enrollments:', enrollmentData?.length || 0, enrollmentData);
      setEnrollments(enrollmentData || []);

      // Fetch consultations
      const { data: consultationData, error: consultationError } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (consultationError) {
        console.error('Consultation fetch error:', consultationError);
        throw consultationError;
      }
      
      console.log('Fetched consultations:', consultationData?.length || 0);
      setConsultations(consultationData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enrollment data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentAction = async () => {
    if (!selectedItem) return;

    try {
      const updates: any = {
        enrollment_status: actionType === 'approve' ? 'approved' : 'rejected'
      };

      const { error } = await supabase
        .from('enrollments')
        .update(updates)
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Enrollment ${actionType === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });

      setSelectedItem(null);
      setActionNotes('');
      fetchData();
    } catch (error) {
      console.error('Error updating enrollment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update enrollment status.',
        variant: 'destructive',
      });
    }
  };

  const handleConsultationAction = async () => {
    if (!selectedItem) return;

    try {
      const updates: any = {
        status: actionType === 'approve' ? 'confirmed' : actionType === 'reject' ? 'cancelled' : 'rescheduled',
        notes: actionNotes || null
      };

      if (actionType === 'approve' && meetingLink) {
        updates.meeting_link = meetingLink;
      }

      const { error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Consultation ${updates.status} successfully.`,
      });

      setSelectedItem(null);
      setActionNotes('');
      setMeetingLink('');
      fetchData();
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update consultation status.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <Tabs defaultValue="enrollments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enrollments">Enrollment Applications</TabsTrigger>
          <TabsTrigger value="consultations">Consultation Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Enrollment Applications</h3>
            <Badge variant="outline">
              {enrollments.filter(e => e.enrollment_status === 'pending').length} Pending
            </Badge>
          </div>

          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-semibold text-lg">
                          {enrollment.profiles?.first_name} {enrollment.profiles?.last_name}
                        </h4>
                        <Badge className={getStatusColor(enrollment.enrollment_status)}>
                          {enrollment.enrollment_status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{enrollment.profiles?.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{enrollment.profiles?.contact_number || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span>LRN: {enrollment.lrn || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-muted-foreground">Program: </span>
                            <span>{enrollment.programs?.name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Grade Level: </span>
                            <span>{enrollment.grade_level || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Academic Year: </span>
                            <span>{enrollment.academic_year}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Parent: </span>
                            <span>{enrollment.parent_name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Payment Plan: </span>
                            <span className="capitalize">{enrollment.payment_plan}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tuition Fee: </span>
                            <span>₱{enrollment.tuition_fee?.toLocaleString() || 'TBD'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Applied: </span>
                            <span>{new Date(enrollment.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {enrollment.enrollment_status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedItem(enrollment);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Enrollment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>
                                Are you sure you want to approve the enrollment for{' '}
                                <strong>
                                  {enrollment.profiles?.first_name} {enrollment.profiles?.last_name}
                                </strong>
                                ?
                              </p>
                              <div className="space-y-2">
                                <Label>Additional Notes (Optional)</Label>
                                <Textarea
                                  value={actionNotes}
                                  onChange={(e) => setActionNotes(e.target.value)}
                                  placeholder="Any additional notes for the student..."
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleEnrollmentAction}>
                                  Approve Enrollment
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
                                setSelectedItem(enrollment);
                                setActionType('reject');
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Enrollment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>
                                Are you sure you want to reject the enrollment for{' '}
                                <strong>
                                  {enrollment.profiles?.first_name} {enrollment.profiles?.last_name}
                                </strong>
                                ?
                              </p>
                              <div className="space-y-2">
                                <Label>Reason for Rejection</Label>
                                <Textarea
                                  value={actionNotes}
                                  onChange={(e) => setActionNotes(e.target.value)}
                                  placeholder="Please provide a reason for rejection..."
                                  required
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleEnrollmentAction}>
                                  Reject Enrollment
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Consultation Bookings</h3>
            <Badge variant="outline">
              {consultations.filter(c => c.status === 'pending').length} Pending
            </Badge>
          </div>

          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card key={consultation.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-semibold text-lg">{consultation.applicant_name}</h4>
                        <Badge className={getStatusColor(consultation.status)}>
                          {consultation.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{consultation.applicant_email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{consultation.applicant_phone || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{new Date(consultation.preferred_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{consultation.preferred_time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div>
                          <span className="text-muted-foreground">Program Interest: </span>
                          <span>{consultation.program_interest || 'General'}</span>
                        </div>
                        {consultation.notes && (
                          <div className="mt-2">
                            <span className="text-muted-foreground">Notes: </span>
                            <span className="italic">{consultation.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {consultation.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedItem(consultation);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Confirm
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Consultation</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>
                                Confirm consultation for <strong>{consultation.applicant_name}</strong>
                              </p>
                              <div className="space-y-2">
                                <Label>Meeting Link (Required)</Label>
                                <Textarea
                                  value={meetingLink}
                                  onChange={(e) => setMeetingLink(e.target.value)}
                                  placeholder="Enter Google Meet, Zoom, or other video call link..."
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Additional Notes (Optional)</Label>
                                <Textarea
                                  value={actionNotes}
                                  onChange={(e) => setActionNotes(e.target.value)}
                                  placeholder="Any additional instructions for the consultation..."
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleConsultationAction}>
                                  Confirm Consultation
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedItem(consultation);
                                setActionType('reschedule');
                              }}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Reschedule
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reschedule Consultation</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>
                                Request reschedule for <strong>{consultation.applicant_name}</strong>
                              </p>
                              <div className="space-y-2">
                                <Label>Reschedule Reason</Label>
                                <Textarea
                                  value={actionNotes}
                                  onChange={(e) => setActionNotes(e.target.value)}
                                  placeholder="Please provide a reason and suggest alternative dates..."
                                  required
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleConsultationAction}>
                                  Request Reschedule
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnrollmentApproval;