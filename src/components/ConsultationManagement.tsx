import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, Phone, Mail, MapPin, CheckCircle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Consultation {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  applicant_city?: string;
  preferred_date: string;
  preferred_time?: string;
  program_interest?: string;
  status: string;
  meeting_link?: string;
  notes?: string;
  confirmed_at?: string;
  completed_at?: string;
  created_at: string;
}

const ConsultationManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultations();
  }, []);

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

  const markAsCompleted = async (consultationId: string) => {
    setCompletingId(consultationId);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', consultationId);

      if (error) throw error;

      // Send notification to applicant that they can now enroll
      const consultation = consultations.find(c => c.id === consultationId);
      if (consultation) {
        await supabase
          .from('notification_log')
          .insert({
            email_address: consultation.applicant_email,
            type: 'email',
            notification_type: 'consultation_completion',
            message: `Dear ${consultation.applicant_name}, your consultation is now complete! You can proceed with program enrollment by logging into your account. Thank you for choosing ANALI.`,
            status: 'pending'
          });
      }

      toast({
        title: 'Consultation Completed',
        description: 'The applicant has been notified that they can now enroll.',
      });

      fetchConsultations();
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark consultation as completed.',
        variant: 'destructive',
      });
    } finally {
      setCompletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'confirmed':
        return <Calendar className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Consultation Management</h2>
          <p className="text-muted-foreground">Monitor and manage all consultation bookings</p>
        </div>
      </div>

      {consultations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No consultations booked yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {consultations.map((consultation) => (
            <Card key={consultation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">{consultation.applicant_name}</h3>
                          <p className="text-sm text-muted-foreground">{consultation.applicant_email}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(consultation.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(consultation.status)}
                          {consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1)}
                        </div>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(consultation.preferred_date).toLocaleDateString()}</span>
                      </div>
                      {consultation.preferred_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{consultation.preferred_time}</span>
                        </div>
                      )}
                      {consultation.applicant_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{consultation.applicant_phone}</span>
                        </div>
                      )}
                      {consultation.applicant_city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{consultation.applicant_city}</span>
                        </div>
                      )}
                    </div>

                    {consultation.program_interest && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm"><strong>Program Interest:</strong> {consultation.program_interest}</p>
                      </div>
                    )}

                    {consultation.meeting_link && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-900">Meeting Link Available</p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => window.open(consultation.meeting_link, '_blank')}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open Link
                          </Button>
                        </div>
                        <p className="text-xs text-blue-700 mt-1 break-all">{consultation.meeting_link}</p>
                      </div>
                    )}

                    {consultation.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm"><strong>Notes:</strong> {consultation.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedConsultation(consultation)}>
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Consultation Details</DialogTitle>
                          <DialogDescription>
                            Full details for {selectedConsultation?.applicant_name}'s consultation
                          </DialogDescription>
                        </DialogHeader>
                        {selectedConsultation && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Applicant Name</Label>
                                <p className="text-sm font-medium">{selectedConsultation.applicant_name}</p>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <p className="text-sm font-medium">{selectedConsultation.applicant_email}</p>
                              </div>
                              <div>
                                <Label>Phone</Label>
                                <p className="text-sm font-medium">{selectedConsultation.applicant_phone || 'N/A'}</p>
                              </div>
                              <div>
                                <Label>City</Label>
                                <p className="text-sm font-medium">{selectedConsultation.applicant_city || 'N/A'}</p>
                              </div>
                              <div>
                                <Label>Preferred Date</Label>
                                <p className="text-sm font-medium">{new Date(selectedConsultation.preferred_date).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <Label>Preferred Time</Label>
                                <p className="text-sm font-medium">{selectedConsultation.preferred_time || 'N/A'}</p>
                              </div>
                            </div>
                            
                            {selectedConsultation.program_interest && (
                              <div>
                                <Label>Program Interest</Label>
                                <p className="text-sm font-medium">{selectedConsultation.program_interest}</p>
                              </div>
                            )}

                            {selectedConsultation.meeting_link && (
                              <div>
                                <Label>Meeting Link</Label>
                                <div className="flex items-center gap-2">
                                  <Input value={selectedConsultation.meeting_link} readOnly className="text-sm" />
                                  <Button 
                                    size="sm" 
                                    onClick={() => window.open(selectedConsultation.meeting_link, '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {selectedConsultation.notes && (
                              <div>
                                <Label>Notes</Label>
                                <p className="text-sm font-medium">{selectedConsultation.notes}</p>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Label>Status:</Label>
                              <Badge className={getStatusColor(selectedConsultation.status)}>
                                {selectedConsultation.status.charAt(0).toUpperCase() + selectedConsultation.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {consultation.status === 'confirmed' && !consultation.completed_at && (
                      <Button 
                        size="sm" 
                        onClick={() => markAsCompleted(consultation.id)}
                        disabled={completingId === consultation.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {completingId === consultation.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-white mr-1" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Done
                          </>
                        )}
                      </Button>
                    )}
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

export default ConsultationManagement;