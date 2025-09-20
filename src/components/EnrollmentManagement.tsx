import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, User, GraduationCap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Enrollment {
  id: string;
  student_id: string;
  enrollment_status: string;
  academic_year: string;
  semester: string;
  payment_plan: string;
  tuition_fee: number;
  created_at: string;
  middle_name?: string;
  age?: number;
  gender?: string;
  place_of_birth?: string;
  home_address?: string;
  parent_name?: string;
  parent_contact?: string;
  medical_conditions?: string; // Added for rejection reason
  programs?: {
    name: string;
    description: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
  };
}

const EnrollmentManagement = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      let query = supabase
        .from('enrollments')
        .select(`
          *,
          programs:program_id (name, description),
          profiles:student_id (first_name, last_name, email, contact_number)
        `)
        .order('created_at', { ascending: false });

      // Filter based on user role
      if (profile?.role === 'registrar') {
        query = query.in('enrollment_status', ['pending']);
      } else if (profile?.role === 'super_admin') {
        query = query.in('enrollment_status', ['pending', 'approved', 'rejected']);
      } else {
        // Non-admin users shouldn't see enrollment management
        setEnrollments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enrollments.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (enrollmentId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to perform this action.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.role || !['registrar', 'super_admin'].includes(profile.role)) {
      toast({
        title: 'Insufficient Permissions',
        description: 'You do not have permission to approve enrollments.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(enrollmentId);
    try {
      const enrollment = enrollments.find(e => e.id === enrollmentId);
      if (!enrollment) throw new Error('Enrollment not found');

      // Step 1: Update enrollment status to approved
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .update({ 
          enrollment_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (enrollmentError) throw enrollmentError;

      // Step 2: Update student's profile status to 'student' (since payment was already completed)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          application_status: 'student',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', enrollment.student_id);

      if (profileError) throw profileError;

      // Step 3: Create billing records based on payment plan
      if (enrollment.tuition_fee && enrollment.payment_plan) {
        await createBillingRecords(enrollment);
      }

      // Step 4: Send approval notification
      if (enrollment.profiles?.email) {
        await supabase
          .from('notification_log')
          .insert({
            user_id: enrollment.student_id,
            email_address: enrollment.profiles.email,
            type: 'email',
            notification_type: 'enrollment_approval',
            message: `Congratulations! Your enrollment for ${enrollment.programs?.name} has been approved. You can now proceed with payment to complete your registration. Please access your billing dashboard to make payment.`,
            status: 'pending'
          });

        // Send SMS notification if contact number is available
        if (enrollment.profiles?.contact_number) {
          await supabase
            .from('notification_log')
            .insert({
              user_id: enrollment.student_id,
              phone_number: enrollment.profiles.contact_number,
              type: 'sms',
              notification_type: 'enrollment_approval',
              message: `Congratulations ${enrollment.profiles.first_name}! Your enrollment at ANALI has been approved. Please complete your payment to finalize your registration. Access your billing dashboard to make payment.`,
              status: 'pending'
            });
        }
      }

      toast({
        title: 'Enrollment Approved',
        description: 'The student has been approved and notified. Billing records have been created and the student can now proceed with payment.',
      });

      fetchEnrollments();
    } catch (error) {
      console.error('Error approving enrollment:', error);
      toast({
        title: 'Error',
        description: `Failed to approve enrollment: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const createBillingRecords = async (enrollment: Enrollment) => {
    try {
      const tuitionFee = enrollment.tuition_fee || 0;
      const paymentPlan = enrollment.payment_plan || 'monthly';
      
      // Calculate installments based on payment plan
      let installments = 1;
      let installmentAmount = tuitionFee;
      
      if (paymentPlan === 'monthly') {
        installments = 10; // 10 months
        installmentAmount = Math.ceil(tuitionFee / 10);
      } else if (paymentPlan === 'quarterly') {
        installments = 4; // 4 quarters
        installmentAmount = Math.ceil(tuitionFee / 4);
      }

      // Create billing records
      const billingRecords = [];
      const startDate = new Date();
      
      for (let i = 0; i < installments; i++) {
        const dueDate = new Date(startDate);
        
        if (paymentPlan === 'monthly') {
          dueDate.setMonth(startDate.getMonth() + i + 1);
        } else if (paymentPlan === 'quarterly') {
          dueDate.setMonth(startDate.getMonth() + (i * 3) + 1);
        } else {
          dueDate.setMonth(startDate.getMonth() + 1); // Full payment next month
        }
        
        // Set to first day of the month
        dueDate.setDate(1);

        billingRecords.push({
          student_id: enrollment.student_id,
          enrollment_id: enrollment.id,
          amount: i === installments - 1 ? tuitionFee - (installmentAmount * (installments - 1)) : installmentAmount, // Adjust last payment for rounding
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
          notes: `${paymentPlan} payment ${i + 1} of ${installments}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      const { error: billingError } = await supabase
        .from('billing')
        .insert(billingRecords);

      if (billingError) throw billingError;

    } catch (error) {
      console.error('Error creating billing records:', error);
      throw error;
    }
  };

  const handleRejection = async (enrollmentId: string, reason: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to perform this action.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.role || !['registrar', 'super_admin'].includes(profile.role)) {
      toast({
        title: 'Insufficient Permissions',
        description: 'You do not have permission to reject enrollments.',
        variant: 'destructive',
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Rejection Reason Required',
        description: 'Please provide a reason for rejecting this enrollment.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(enrollmentId);
    try {
      const enrollment = enrollments.find(e => e.id === enrollmentId);
      
      // Update enrollment status to rejected
      const { error: updateError } = await supabase
        .from('enrollments')
        .update({ 
          enrollment_status: 'rejected',
          updated_at: new Date().toISOString(),
          medical_conditions: reason // Store rejection reason in this field for now
        })
        .eq('id', enrollmentId);

      if (updateError) throw updateError;

      // Send rejection notification to student
      if (enrollment?.profiles?.email) {
        await supabase
          .from('notification_log')
          .insert({
            user_id: enrollment.student_id,
            email_address: enrollment.profiles.email,
            type: 'email',
            notification_type: 'enrollment_rejection',
            message: `Your enrollment application has been rejected. Reason: ${reason}`,
            status: 'pending'
          });
      }

      toast({
        title: 'Enrollment Rejected',
        description: 'The student has been notified of the rejection.',
      });

      setSelectedEnrollment(null);
      setRejectionReason('');
      fetchEnrollments();
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject enrollment.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enrollment Management</h2>
          <p className="text-muted-foreground">
            Review and process student enrollment applications
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Enrollments Found</h3>
              <p className="text-muted-foreground">
                There are no enrollment applications to review at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          enrollments.map((enrollment) => (
            <Card key={enrollment.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {enrollment.profiles?.first_name} {enrollment.profiles?.last_name}
                    </CardTitle>
                    <CardDescription>
                      {enrollment.programs?.name} • Applied on {new Date(enrollment.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(enrollment.enrollment_status)}>
                    {getStatusIcon(enrollment.enrollment_status)}
                    <span className="ml-2">{enrollment.enrollment_status.toUpperCase()}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Info</p>
                    <p className="text-sm">{enrollment.profiles?.email}</p>
                    <p className="text-sm">{enrollment.profiles?.contact_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Academic Year</p>
                    <p className="text-sm">{enrollment.academic_year}</p>
                    <p className="text-sm">{enrollment.semester}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Plan</p>
                    <p className="text-sm capitalize">{enrollment.payment_plan}</p>
                    <p className="text-sm font-semibold">₱{enrollment.tuition_fee?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Personal Details</p>
                    <p className="text-sm">Age: {enrollment.age || 'N/A'}</p>
                    <p className="text-sm">Gender: {enrollment.gender || 'N/A'}</p>
                  </div>
                </div>

                {enrollment.home_address && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-sm">{enrollment.home_address}</p>
                  </div>
                )}

                {enrollment.parent_name && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                    <p className="text-sm">{enrollment.parent_name} - {enrollment.parent_contact}</p>
                  </div>
                )}

                {enrollment.enrollment_status === 'pending' && (profile?.role === 'registrar' || profile?.role === 'super_admin') && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproval(enrollment.id)}
                      disabled={processingId === enrollment.id}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Enrollment
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          onClick={() => setSelectedEnrollment(enrollment)}
                          disabled={processingId === enrollment.id}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Enrollment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Enrollment</DialogTitle>
                          <DialogDescription>
                            Please provide a reason for rejecting this enrollment application.
                            The student will be notified with this reason.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Label htmlFor="reason">Rejection Reason</Label>
                          <Textarea
                            id="reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter the reason for rejection..."
                            rows={4}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedEnrollment(null);
                              setRejectionReason('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => selectedEnrollment && handleRejection(selectedEnrollment.id, rejectionReason)}
                            disabled={!rejectionReason.trim() || processingId === selectedEnrollment?.id}
                          >
                            Reject Enrollment
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {enrollment.enrollment_status === 'rejected' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {enrollment.medical_conditions || 'No reason provided'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EnrollmentManagement;