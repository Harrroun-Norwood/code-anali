import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Clock, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useSMSNotifications } from '@/hooks/useSMSNotifications';

type BookedRow = {
  preferred_date: string; // timestamptz from DB (ISO string)
  preferred_time: string;
};

const BookConsultation = () => {
  const { user, profile } = useAuth();
  const { sendConsultationConfirmation } = useSMSNotifications();
  const [formData, setFormData] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    applicant_city: '',
    preferred_date: undefined as Date | undefined,
    preferred_time: '',
    program_interest: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [hasExistingBooking, setHasExistingBooking] = useState(false);

  // Map of 'yyyy-MM-dd' -> string[]
  const [bookedTimeSlots, setBookedTimeSlots] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  // Auto-fill form with user data
  useEffect(() => {
    if (profile && user) {
      setFormData((prev) => ({
        ...prev,
        applicant_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        applicant_email: user.email || '',
        applicant_phone: profile.contact_number || '',
      }));
    }
  }, [profile, user]);

  // Re-sync on profile changes
  useEffect(() => {
    if (profile && user) {
      setFormData((prev) => ({
        ...prev,
        applicant_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        applicant_email: user.email || '',
        applicant_phone: profile.contact_number || '',
      }));
    }
  }, [profile?.first_name, profile?.last_name, profile?.contact_number, user?.email]);

  // Check for existing bookings + fetch slots
  useEffect(() => {
    if (user) {
      checkExistingBooking();
      fetchBookedTimeSlots();
    }
  }, [user]);

  const checkExistingBooking = async () => {
    try {
      // Already done / at later stage
      if (profile?.application_status === 'student' || profile?.application_status === 'consultation_completed') {
        setHasExistingBooking(true);
        return;
      }

      // Only allow 1 active booking (pending/confirmed)
      if (profile?.application_status === 'applicant' || profile?.application_status === 'consultation_pending') {
        const { data, error } = await supabase
          .from('consultations')
          .select('*')
          .eq('applicant_email', user?.email)
          .in('status', ['pending', 'confirmed'])
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) setHasExistingBooking(true);
      }
    } catch (error) {
      console.error('Error checking existing booking:', error);
    }
  };

  const fetchBookedTimeSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('preferred_date, preferred_time')
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;

      const booked: Record<string, string[]> = {};
      (data as BookedRow[] | null)?.forEach((row) => {
        // Normalize timestamptz -> 'yyyy-MM-dd'
        const dateKey = format(new Date(row.preferred_date), 'yyyy-MM-dd');
        if (!booked[dateKey]) booked[dateKey] = [];
        booked[dateKey].push(row.preferred_time);
      });

      setBookedTimeSlots(booked);
    } catch (error) {
      console.error('Error fetching booked time slots:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const programs = [
    'Abacus Math',
    'Singapore Math',
    'Robotics',
    'Creative Writing',
    'Public Speaking',
    'Science Olympiad',
    'General Inquiry',
  ];

  const timeSlots = [
    'Morning (9:00 AM - 12:00 PM)',
    'Early Afternoon (12:00 PM - 3:00 PM)',
    'Late Afternoon (3:00 PM - 6:00 PM)',
    'Evening (6:00 PM - 8:00 PM)',
  ];

  const getAvailableTimeSlots = () => {
    if (!formData.preferred_date) return timeSlots;
    const dateKey = format(formData.preferred_date, 'yyyy-MM-dd');
    const bookedSlots = bookedTimeSlots[dateKey] || [];
    return timeSlots.filter((slot) => !bookedSlots.includes(slot));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasExistingBooking) {
      toast({
        title: 'Existing Booking Found',
        description: 'You already have a pending consultation. Please wait for confirmation.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.preferred_date) {
      toast({
        title: 'Error',
        description: 'Please select a preferred date.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Reject duplicate active booking for same email
      const { data: existing, error: checkError } = await supabase
        .from('consultations')
        .select('id, status')
        .eq('applicant_email', formData.applicant_email.toLowerCase().trim())
        .neq('status', 'cancelled');

      if (checkError) throw checkError;

      if (existing?.some((b) => ['pending', 'confirmed'].includes(b.status))) {
        toast({
          title: 'Duplicate Booking Not Allowed',
          description: 'This email already has an active consultation booking.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const dateKey = format(formData.preferred_date, 'yyyy-MM-dd');
      if (bookedTimeSlots[dateKey]?.includes(formData.preferred_time)) {
        toast({
          title: 'Time Period Unavailable',
          description: 'This time period is already fully booked. Please select another.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!formData.applicant_name.trim() || !formData.applicant_email.trim() || !formData.applicant_city.trim()) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // ⬇️ Save preferred_date as a proper timestamptz (midnight local → ISO)
      const ymd = format(formData.preferred_date, 'yyyy-MM-dd');
      const preferredDateISO = new Date(`${ymd}T00:00:00`).toISOString();

      const consultationData = {
        applicant_name: formData.applicant_name.trim(),
        applicant_email: formData.applicant_email.toLowerCase().trim(),
        applicant_phone: formData.applicant_phone?.trim() || null,
        applicant_city: formData.applicant_city.trim(),
        preferred_date: preferredDateISO, // timestamptz
        preferred_time: formData.preferred_time,
        program_interest: formData.program_interest || 'General Inquiry',
        notes: formData.notes?.trim() || null,
        status: 'pending' as const,
      };

      const { error: insertErr } = await supabase.from('consultations').insert([consultationData]);
      if (insertErr) throw insertErr;

      // Move the applicant to 'consultation_pending' (not completed)
      if (user && profile && ['applicant'].includes(profile.application_status || '')) {
        await supabase
          .from('profiles')
          .update({ application_status: 'consultation_pending', updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }

      // Optional SMS
      if (formData.applicant_phone) {
        const consultationDateNice = format(formData.preferred_date, 'PPPP');
        await sendConsultationConfirmation(
          formData.applicant_phone,
          formData.applicant_name,
          consultationDateNice,
          formData.preferred_time
        );
      }

      toast({
        title: 'Consultation Booked Successfully',
        description: 'We will contact you within 24 hours to confirm your appointment.',
      });

      setHasExistingBooking(true);
      await fetchBookedTimeSlots();
    } catch (error) {
      console.error('Error booking consultation:', error);
      toast({
        title: 'Error',
        description: 'Failed to book consultation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasExistingBooking) {
    const getBlockingMessage = () => {
      if (profile?.application_status === 'student') {
        return {
          title: 'Consultation Not Available',
          description: 'You are already an enrolled student.',
          buttonText: 'Go to Student Dashboard',
          buttonLink: '/student-dashboard',
        };
      } else if (profile?.application_status === 'consultation_completed') {
        return {
          title: 'Consultation Already Completed',
          description: 'You can now proceed with enrollment.',
          buttonText: 'Go to Enrollment',
          buttonLink: '/enrollment',
        };
      } else {
        return {
          title: 'Consultation Already Booked',
          description: 'You already have a pending consultation request.',
          buttonText: 'Go to Dashboard',
          buttonLink: '/applicant-dashboard',
        };
      }
    };

    const message = getBlockingMessage();

    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle>{message.title}</CardTitle>
              <CardDescription>{message.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link to={message.buttonLink}>{message.buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Book a Consultation</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Schedule a free 1-on-1 consultation to learn more about our programs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Benefits */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  What to Expect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Free Consultation</h4>
                    <p className="text-sm text-muted-foreground">30-minute online session at no cost</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Program Overview</h4>
                    <p className="text-sm text-muted-foreground">Learn about curriculum and teaching methods</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Personalized Assessment</h4>
                    <p className="text-sm text-muted-foreground">Get recommendations based on your child's needs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Q&A Session</h4>
                    <p className="text-sm text-muted-foreground">Ask any questions about enrollment and fees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Monday - Friday</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>9:00 AM - 5:00 PM</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">All consultations are via secure video call</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Your Consultation</CardTitle>
                <CardDescription>Fill out the form below and we'll send you a meeting link</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Applicant info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="applicant_name">Full Name *</Label>
                      <Input id="applicant_name" name="applicant_name" value={formData.applicant_name} onChange={handleInputChange} required />
                    </div>
                    <div>
                      <Label htmlFor="applicant_email">Email *</Label>
                      <Input id="applicant_email" name="applicant_email" type="email" value={formData.applicant_email} onChange={handleInputChange} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="applicant_phone">Phone Number</Label>
                      <Input id="applicant_phone" name="applicant_phone" type="tel" value={formData.applicant_phone} onChange={handleInputChange} placeholder="+63 9XX XXX XXXX" />
                    </div>
                    <div>
                      <Label htmlFor="applicant_city">City/Municipality *</Label>
                      <Input id="applicant_city" name="applicant_city" value={formData.applicant_city} onChange={handleInputChange} placeholder="e.g., Quezon City, Manila" required />
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preferred Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !formData.preferred_date && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.preferred_date ? format(formData.preferred_date, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.preferred_date}
                            onSelect={(date) => setFormData((prev) => ({ ...prev, preferred_date: date ?? undefined, preferred_time: '' }))}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                            initialFocus
                            className={cn('p-3 pointer-events-auto')}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Preferred Time *</Label>
                      <Select
                        value={formData.preferred_time}
                        onValueChange={(value) => handleSelectChange('preferred_time', value)}
                        disabled={!formData.preferred_date}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.preferred_date ? 'Select time period' : 'Select date first'} />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableTimeSlots().map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.preferred_date && getAvailableTimeSlots().length === 0 && (
                        <p className="text-sm text-red-500">All time periods are fully booked for this date.</p>
                      )}
                    </div>
                  </div>

                  {/* Program */}
                  <div className="space-y-2">
                    <Label htmlFor="program_interest">Program of Interest</Label>
                    <Select value={formData.program_interest} onValueChange={(value) => handleSelectChange('program_interest', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a program or general inquiry" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program} value={program}>
                            {program}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Tell us about your child's learning goals, interests, or any specific questions you have..."
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !formData.preferred_date || !formData.preferred_time || getAvailableTimeSlots().length === 0}
                  >
                    {loading ? 'Booking...' : 'Book Consultation'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By booking a consultation, you agree to receive communication from ANALI regarding your inquiry.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookConsultation;
