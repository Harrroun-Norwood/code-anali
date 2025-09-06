import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Video, CheckCircle } from 'lucide-react';

const BookConsultation = () => {
  const [formData, setFormData] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    preferred_date: '',
    preferred_time: '',
    program_interest: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert date string to timestamp
      const preferredDateTime = new Date(formData.preferred_date).toISOString();
      
      const consultationData = {
        ...formData,
        preferred_date: preferredDateTime,
      };

      const { error } = await supabase
        .from('consultations')
        .insert([consultationData]);

      if (error) throw error;

      toast({
        title: 'Consultation Booked Successfully',
        description: 'We will contact you within 24 hours to confirm your appointment.',
      });

      // Reset form
      setFormData({
        applicant_name: '',
        applicant_email: '',
        applicant_phone: '',
        preferred_date: '',
        preferred_time: '',
        program_interest: '',
        notes: '',
      });
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

  const programs = [
    'Abacus Math',
    'Singapore Math',
    'Robotics',
    'Creative Writing',
    'Public Speaking',
    'Science Olympiad',
    'General Inquiry'
  ];

  const timeSlots = [
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM'
  ];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Book a Consultation</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Schedule a free 1-on-1 consultation to learn more about our programs and find the perfect fit for your child.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Benefits Section */}
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
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Free Consultation</h4>
                    <p className="text-sm text-muted-foreground">30-minute online session at no cost</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Program Overview</h4>
                    <p className="text-sm text-muted-foreground">Learn about curriculum and teaching methods</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Personalized Assessment</h4>
                    <p className="text-sm text-muted-foreground">Get recommendations based on your child's needs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
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
                    <Calendar className="h-4 w-4" />
                    <span>Monday - Friday</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>9:00 AM - 5:00 PM</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    All consultations are conducted via secure video call
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Your Consultation</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll send you a meeting link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicant_name">Full Name *</Label>
                      <Input
                        id="applicant_name"
                        name="applicant_name"
                        value={formData.applicant_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicant_email">Email *</Label>
                      <Input
                        id="applicant_email"
                        name="applicant_email"
                        type="email"
                        value={formData.applicant_email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="applicant_phone">Phone Number</Label>
                    <Input
                      id="applicant_phone"
                      name="applicant_phone"
                      type="tel"
                      value={formData.applicant_phone}
                      onChange={handleInputChange}
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preferred_date">Preferred Date *</Label>
                      <Input
                        id="preferred_date"
                        name="preferred_date"
                        type="date"
                        value={formData.preferred_date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferred_time">Preferred Time *</Label>
                      <Select
                        value={formData.preferred_time}
                        onValueChange={(value) => handleSelectChange('preferred_time', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="program_interest">Program of Interest</Label>
                    <Select
                      value={formData.program_interest}
                      onValueChange={(value) => handleSelectChange('program_interest', value)}
                    >
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

                  <Button type="submit" className="w-full" disabled={loading}>
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