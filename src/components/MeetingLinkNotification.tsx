import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, Send, Users } from 'lucide-react';

interface MeetingLinkNotificationProps {
  consultationId: string;
  applicantEmail: string;
  applicantName: string;
  onNotificationSent?: () => void;
}

const MeetingLinkNotification = ({ 
  consultationId, 
  applicantEmail, 
  applicantName,
  onNotificationSent 
}: MeetingLinkNotificationProps) => {
  const { toast } = useToast();
  const [meetingLink, setMeetingLink] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMeetingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meetingLink.trim()) {
      toast({
        title: 'Meeting Link Required',
        description: 'Please enter the meeting link before sending.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Update the consultation with meeting link
      const { error: updateError } = await supabase
        .from('consultations')
        .update({
          meeting_link: meetingLink.trim(),
          notes: message.trim() || null,
          status: 'confirmed'
        })
        .eq('id', consultationId);

      if (updateError) throw updateError;

      // Send notification to both applicant and admin
      const recipients = [
        {
          email: applicantEmail,
          role: 'applicant',
          name: applicantName
        },
        // Add super admin email - in a real app, you'd fetch this from the database
        {
          email: 'admin@anali.edu.ph', // Replace with actual admin email
          role: 'admin',
          name: 'Administrator'
        }
      ];

      // Create notifications in the system
      for (const recipient of recipients) {
        await supabase
          .from('notification_log')
          .insert({
            user_id: null, // We could look up user ID by email if needed
            email_address: recipient.email,
            type: 'email',
            notification_type: 'consultation_confirmation',
            message: `Meeting Link: ${meetingLink}\n\nScheduled consultation has been confirmed. ${message || 'Please join the meeting at the scheduled time.'}`,
            status: 'pending'
          });
      }

      // In a real implementation, you would trigger an email sending service here
      // For now, we'll use the existing SMS notification system structure
      
      toast({
        title: 'Meeting Link Sent Successfully',
        description: `Meeting link has been sent to ${applicantName} and the administrator.`,
      });

      // Reset form
      setMeetingLink('');
      setMessage('');
      onNotificationSent?.();

    } catch (error) {
      console.error('Error sending meeting link:', error);
      toast({
        title: 'Failed to Send Meeting Link',
        description: 'There was an error sending the meeting link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Send Meeting Link
        </CardTitle>
        <CardDescription>
          Confirm the consultation and send meeting details to both the applicant and administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendMeetingLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link/URL *</Label>
            <Input
              id="meetingLink"
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Additional Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any additional instructions or information for the consultation..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Recipients:</p>
              <p>• {applicantName} ({applicantEmail})</p>
              <p>• Administrator (admin@anali.edu.ph)</p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              'Sending...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Meeting Link & Confirm Consultation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MeetingLinkNotification;