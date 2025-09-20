import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Calendar, Clock, Bell, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusTransition from '@/components/StatusTransition';
import StatusManager from '@/utils/statusManager';
import NotificationBell from '@/components/NotificationBell';

interface Consultation {
  id: string;
  status: string;
  preferred_date: string; // ISO "YYYY-MM-DD" (DATE column)
  preferred_time: string; // "HH:mm" or "HH:mm:ss"
  program_interest: string;
  meeting_link: string;
  notes: string;
}

/**
 * Build a LOCAL Date (no UTC shift) from "YYYY-MM-DD" + "HH:mm(:ss)?",
 * then format it with Intl.DateTimeFormat. Falls back gracefully.
 */
const formatConsultationDateTime = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return '—';

  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return dateStr;

  let hh = 0, mm = 0, ss = 0;

  if (timeStr && /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    const parts = timeStr.split(':').map((x) => parseInt(x, 10));
    hh = parts[0] ?? 0;
    mm = parts[1] ?? 0;
    ss = parts[2] ?? 0;
  }

  const dt = new Date(y, m - 1, d, hh, mm, ss);

  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(timeStr ? { hour: 'numeric', minute: '2-digit' } : {}),
  };

  try {
    return new Intl.DateTimeFormat(undefined, opts).format(dt);
  } catch {
    return `${dateStr}${timeStr ? ` ${timeStr}` : ''}`;
  }
};

const titleCaseStatus = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ApplicantDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get current status and determine payment step
  const status = (profile?.application_status || '').toLowerCase();
  const isPaymentStep = status === 'enrollment_submitted' || status === 'enrolled_pending_payment';

  useEffect(() => {
    if (user && profile?.application_status !== 'student') {
      fetchConsultations();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.application_status]);

  const fetchConsultations = async () => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('applicant_email', user?.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsultations(data || []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consultation data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome, {profile?.first_name || 'Applicant'}!
              </h1>
              <p className="text-muted-foreground">
                Track your application progress and next steps.
              </p>
            </div>
            <NotificationBell />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Progress Card */}
          <div>
            <StatusTransition
              profile={profile}
              onStatusChange={() => window.location.reload()}
            />
          </div>

          {/* Consultation History & Quick Actions */}
          <div className="space-y-6">
            {consultations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Consultations</CardTitle>
                  <CardDescription>Your scheduled consultations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {consultations.slice(0, 2).map((consultation) => (
                    <Card key={consultation.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">
                              {consultation.program_interest || 'General Consultation'}
                            </h3>

                            {/* Unified, timezone-safe date/time display */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {formatConsultationDateTime(
                                  consultation.preferred_date,
                                  consultation.preferred_time
                                )}
                              </span>
                            </div>
                          </div>

                          <Badge className={getStatusColor(consultation.status)}>
                            {titleCaseStatus(consultation.status || '—')}
                          </Badge>
                        </div>

                        {consultation.meeting_link &&
                          consultation.status?.toLowerCase() === 'confirmed' && (
                            <Button asChild size="sm" className="mt-2">
                              <a
                                href={consultation.meeting_link.startsWith('http') 
                                  ? consultation.meeting_link 
                                  : `https://${consultation.meeting_link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Join Meeting
                              </a>
                            </Button>
                          )}

                        {consultation.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {consultation.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/programs" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Programs
                  </Button>
                </Link>
                <Link to="/contact" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
                <Link to="/profile" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Update Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* 3) After consultation: let them start enrollment */}
            {status === 'consultation_completed' && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-800">Ready for Enrollment</CardTitle>
                  <CardDescription className="text-purple-700">
                    Your consultation is complete! You can now proceed with program enrollment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/enrollment">
                    <Button className="w-full">Start Enrollment</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            
            {/* 4) After enrollment form: payment first, before approval */}
            {isPaymentStep && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800">Payment Required</CardTitle>
                  <CardDescription className="text-orange-700">
                    Please complete your payment. An accountant will review your proof of payment.
                    After payment approval, the registrar/super admin will approve or reject your enrollment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/billing">
                    <Button className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Go to Billing
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            
            {/* 5) Enrollment submitted but payment step not opened yet (optional guard) */}
            {status === 'enrollment_submitted' && !isPaymentStep && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Enrollment Submitted</CardTitle>
                  <CardDescription className="text-blue-700">
                    Thanks for submitting your enrollment. You’ll receive a notification once the payment step is ready.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" disabled className="w-full">Awaiting Payment Step</Button>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDashboard;
