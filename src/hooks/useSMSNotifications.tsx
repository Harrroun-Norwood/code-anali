import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSMSNotifications = () => {
  const { toast } = useToast();

  const sendSMS = async (phoneNumber: string, message: string, type: string = 'general') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: message,
          type: type
        }
      });

      if (error) {
        console.error('SMS Error:', error);
        throw error;
      }

      console.log('SMS sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      toast({
        title: 'SMS Failed',
        description: 'Failed to send SMS notification. Please check the phone number.',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const sendConsultationConfirmation = async (
    phoneNumber: string, 
    applicantName: string, 
    consultationDate: string, 
    consultationTime: string,
    meetingLink?: string
  ) => {
    const message = `Hi ${applicantName}! Your consultation at ANALI is confirmed for ${consultationDate} at ${consultationTime}. ${meetingLink ? `Meeting link: ${meetingLink}` : 'Please wait for the meeting link.'} Thank you!`;
    
    return await sendSMS(phoneNumber, message, 'consultation_confirmation');
  };

  const sendPaymentReminder = async (
    phoneNumber: string,
    studentName: string,
    amount: number,
    dueDate: string
  ) => {
    const message = `Dear ${studentName}, this is a reminder that your payment of ₱${amount.toLocaleString()} is due on ${dueDate}. Please settle your account at ANALI. Thank you!`;
    
    return await sendSMS(phoneNumber, message, 'payment_reminder');
  };

  const sendEnrollmentApproval = async (
    phoneNumber: string,
    studentName: string
  ) => {
    const message = `Congratulations ${studentName}! Your enrollment at ANALI has been approved. Please proceed with payment to complete your registration. Welcome to ANALI!`;
    
    return await sendSMS(phoneNumber, message, 'enrollment_approval');
  };

  const sendDocumentReady = async (
    phoneNumber: string,
    studentName: string,
    documentType: string
  ) => {
    const message = `Hi ${studentName}! Your requested ${documentType} is now ready for pickup at ANALI. Please bring a valid ID. Office hours: Mon-Fri 8AM-5PM. Thank you!`;
    
    return await sendSMS(phoneNumber, message, 'document_ready');
  };

  const sendGeneralNotification = async (
    phoneNumber: string,
    message: string
  ) => {
    return await sendSMS(phoneNumber, message, 'general');
  };

  return {
    sendSMS,
    sendConsultationConfirmation,
    sendPaymentReminder,
    sendEnrollmentApproval,
    sendDocumentReady,
    sendGeneralNotification
  };
};