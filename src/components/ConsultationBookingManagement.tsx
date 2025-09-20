import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Mail, 
  Phone,
  MapPin,
  User,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

interface BookedConsultation {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  applicant_city?: string;
  preferred_date: string;
  preferred_time: string;
  program_interest?: string;
  notes?: string;
  status: string;
  meeting_link?: string;
  created_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
  completed_at?: string;
}

const ConsultationBookingManagement = () => {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<BookedConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<BookedConsultation | null>(null);
  const [meetingLinkInput, setMeetingLinkInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    if (user && isRole('super_admin')) {
      fetchConsultations();
    }
  }, [user, isRole]);

  const fetchConsultations = async () => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsultations(data || []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consultations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConsultationStatus = async (consultationId: string, status: string, meetingLink?: string, notes?: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'confirmed' && meetingLink) {
        updateData.meeting_link = meetingLink;
        updateData.confirmed_by = user?.id;
        updateData.confirmed_at = new Date().toISOString();
      }
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('consultations')
        .update(updateData)
        .eq('id', consultationId);

      if (error) throw error;

      // Send notification to applicant when consultation is confirmed
      if (status === 'confirmed' && meetingLink) {
        const consultation = consultations.find(c => c.id === consultationId);
        if (consultation) {
          try {
            await supabase.functions.invoke('send-consultation-notification', {
              body: {
                type: 'confirmed',
                applicant_name: consultation.applicant_name,
                applicant_email: consultation.applicant_email,
                meeting_link: meetingLink,
                consultation_date: consultation.preferred_date,
                consultation_time: consultation.preferred_time,
                admin_email: user?.email
              }
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
            // Don't fail the main operation if notification fails
          }
        }
      }

      // Send completion notification when consultation is completed
      if (status === 'completed') {
        const consultation = consultations.find(c => c.id === consultationId);
        if (consultation) {
          try {
            await supabase.functions.invoke('send-consultation-notification', {
              body: {
                type: 'completed',
                applicant_name: consultation.applicant_name,
                applicant_email: consultation.applicant_email
              }
            });
          } catch (notifError) {
            console.error('Error sending completion notification:', notifError);
            // Don't fail the main operation if notification fails
          }
        }
      }

      toast({
        title: 'Success',
        description: `Consultation ${status} successfully.${status === 'confirmed' ? ' Notification sent to applicant.' : ''}`,
      });

      fetchConsultations();
      setSelectedConsultation(null);
      setMeetingLinkInput('');
      setNotesInput('');
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <Video className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
          <h2 className="text-2xl font-bold">Booked Consultations</h2>
          <p className="text-muted-foreground">
            Manage consultation bookings and meeting links
          </p>
        </div>
      </div>

      {consultations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No consultation bookings found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <Card key={consultation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {consultation.applicant_name}
                      </h3>
                      <Badge className={getStatusColor(consultation.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(consultation.status)}
                          {consultation.status.toUpperCase()}
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{consultation.applicant_email}</span>
                      </div>
                      {consultation.applicant_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{consultation.applicant_phone}</span>
                        </div>
                      )}
                      {consultation.applicant_city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{consultation.applicant_city}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          {format(new Date(consultation.preferred_date), 'PPP')} - {consultation.preferred_time}
                        </span>
                      </div>
                    </div>

                    {consultation.program_interest && (
                      <div className="text-sm">
                        <span className="font-medium">Program Interest:</span> {consultation.program_interest}
                      </div>
                    )}

                    {consultation.meeting_link && (
                      <div className="text-sm">
                        <span className="font-medium">Meeting Link:</span>{' '}
                        <a 
                          href={consultation.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {consultation.meeting_link}
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
                            setSelectedConsultation(consultation);
                            setMeetingLinkInput(consultation.meeting_link || '');
                            setNotesInput(consultation.notes || '');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Consultation Details</DialogTitle>
                          <DialogDescription>
                            Manage consultation for {consultation.applicant_name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedConsultation && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="font-medium">Status</Label>
                                <p>{selectedConsultation.status}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Date Requested</Label>
                                <p>{format(new Date(selectedConsultation.created_at), 'PPp')}</p>
                              </div>
                              {selectedConsultation.confirmed_at && (
                                <div>
                                  <Label className="font-medium">Confirmed At</Label>
                                  <p>{format(new Date(selectedConsultation.confirmed_at), 'PPp')}</p>
                                </div>
                              )}
                              {selectedConsultation.completed_at && (
                                <div>
                                  <Label className="font-medium">Completed At</Label>
                                  <p>{format(new Date(selectedConsultation.completed_at), 'PPp')}</p>
                                </div>
                              )}
                            </div>

                            {selectedConsultation.notes && (
                              <div>
                                <Label className="font-medium">Notes</Label>
                                <p className="text-sm text-muted-foreground">{selectedConsultation.notes}</p>
                              </div>
                            )}

                            {selectedConsultation.status === 'pending' && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="meeting_link">Meeting Link *</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="meeting_link"
                                      value={meetingLinkInput}
                                      onChange={(e) => setMeetingLinkInput(e.target.value)}
                                      placeholder="https://meet.google.com/... or https://zoom.us/j/..."
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const googleMeetLink = `https://meet.google.com/new`;
                                        setMeetingLinkInput(googleMeetLink);
                                        window.open(googleMeetLink, '_blank');
                                      }}
                                    >
                                      Generate Google Meet
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Click "Generate Google Meet" to create a new meeting room, then copy the actual meeting link here.
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="notes">Additional Notes</Label>
                                  <Textarea
                                    id="notes"
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                    placeholder="Any additional information for the applicant..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => updateConsultationStatus(
                                      selectedConsultation.id, 
                                      'confirmed', 
                                      meetingLinkInput,
                                      notesInput
                                    )}
                                    disabled={!meetingLinkInput.trim()}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Consultation
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => updateConsultationStatus(selectedConsultation.id, 'cancelled')}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {selectedConsultation.status === 'confirmed' && (
                              <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                  <p className="text-green-800 text-sm">
                                    ✅ Meeting link has been sent to the applicant. The consultation is confirmed.
                                  </p>
                                  {selectedConsultation.meeting_link && (
                                    <p className="text-green-700 text-sm mt-2">
                                      <strong>Meeting Link:</strong> 
                                      <a 
                                        href={selectedConsultation.meeting_link.startsWith('http') 
                                          ? selectedConsultation.meeting_link 
                                          : `https://${selectedConsultation.meeting_link}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline ml-2"
                                      >
                                        {selectedConsultation.meeting_link}
                                      </a>
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor="notes">Consultation Notes (Optional)</Label>
                                  <Textarea
                                    id="notes"
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                    placeholder="Notes from the consultation meeting..."
                                  />
                                </div>
                                <Button
                                  onClick={() => updateConsultationStatus(
                                    selectedConsultation.id, 
                                    'completed',
                                    undefined,
                                    notesInput
                                  )}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Completed
                                </Button>
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

export default ConsultationBookingManagement;