import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import StatusManager, { ApplicationStatus } from '@/utils/statusManager';
import { CheckCircle, Clock, AlertCircle, CreditCard, BookOpen, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatusTransitionProps {
  profile: any;
  onStatusChange?: () => void;
}

const StatusTransition = ({ profile, onStatusChange }: StatusTransitionProps) => {
  const { toast } = useToast();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const currentStatus = StatusManager.getCurrentStatus(profile);
  const statusInfo = StatusManager.getStatusDisplay(currentStatus);

  const handleStatusTransition = async (targetStatus: ApplicationStatus) => {
    setIsTransitioning(true);
    try {
      const result = await StatusManager.transitionStatus(profile.user_id, targetStatus);
      
      if (result.success) {
        toast({
          title: 'Status Updated',
          description: `Successfully transitioned to ${targetStatus}`,
        });
        onStatusChange?.();
      } else {
        toast({
          title: 'Transition Failed',
          description: result.error || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Status transition error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'applicant':
        return <Users className="h-5 w-5" />;
      case 'consultation_pending':
        return <Clock className="h-5 w-5" />;
      case 'consultation_completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'payment_pending':
        return <CreditCard className="h-5 w-5" />;
      case 'enrollment_submitted':
        return <AlertCircle className="h-5 w-5" />;
      case 'student':
        return <BookOpen className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getNextStepAction = () => {
    switch (currentStatus) {
      case 'applicant':
        return (
          <Link to="/book-consultation">
            <Button className="w-full">Book Consultation</Button>
          </Link>
        );
      case 'consultation_pending':
        return (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Waiting for consultation to be completed by staff
            </p>
            <Button variant="outline" disabled className="w-full">
              Consultation In Progress
            </Button>
          </div>
        );
      case 'payment_pending':
        return (
          <Button asChild variant="default">
            <Link to="/billing">Complete Payment</Link>
          </Button>
        );
      case 'enrollment_submitted':
        return (
          <Button asChild variant="default">
            <Link to="/enrollment">Complete Enrollment</Link>
          </Button>
        );
      case 'payment_pending':
        return (
          <Button asChild variant="default">
            <Link to="/billing">Complete Payment</Link>
          </Button>
        );
      case 'student':
        return (
          <Link to="/student-dashboard">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
        );
      default:
        return null;
    }
  };

  // Progress steps
  const steps = [
    { status: 'applicant', label: 'New Applicant', completed: true },
    { 
      status: 'consultation_pending', 
      label: 'Book Consultation', 
      completed: ['consultation_pending', 'consultation_completed', 'payment_pending', 'enrollment_submitted', 'student'].includes(currentStatus)
    },
    { 
      status: 'consultation_completed', 
      label: 'Complete Consultation', 
      completed: ['consultation_completed', 'payment_pending', 'enrollment_submitted', 'student'].includes(currentStatus)
    },
    { 
      status: 'payment_pending', 
      label: 'Complete Payment', 
      completed: ['payment_pending', 'enrollment_submitted', 'student'].includes(currentStatus)
    },
    { 
      status: 'enrollment_submitted', 
      label: 'Submit Enrollment', 
      completed: ['enrollment_submitted', 'student'].includes(currentStatus)
    },
    { 
      status: 'student', 
      label: 'Active Student', 
      completed: currentStatus === 'student'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {getStatusIcon(currentStatus)}
          <div>
            <CardTitle className="flex items-center gap-2">
              Application Status
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </CardTitle>
            <CardDescription>{statusInfo.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Progress
          </h4>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.status} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.completed 
                    ? 'bg-primary text-primary-foreground' 
                    : currentStatus === step.status
                      ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    step.completed ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </p>
                  {currentStatus === step.status && (
                    <p className="text-xs text-primary">Current Step</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Action */}
        {statusInfo.nextAction && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Next Step
            </h4>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-3">{statusInfo.nextAction}</p>
              {getNextStepAction()}
            </div>
          </div>
        )}

        {/* Status-specific information */}
        {currentStatus === 'enrollment_submitted' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">Enrollment Under Review</p>
            </div>
            <p className="text-xs text-blue-700">
              Your enrollment application has been submitted successfully and is currently being reviewed by our registrar. You will receive a notification once your application is processed.
            </p>
          </div>
        )}

        {currentStatus === 'payment_pending' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">Payment Required</p>
            </div>
            <p className="text-xs text-yellow-700">
              Your enrollment has been approved! Please complete your payment to become an active student and access all student features.
            </p>
          </div>
        )}

        {currentStatus === 'student' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">Welcome, Student!</p>
            </div>
            <p className="text-xs text-green-700">
              You are now an active student. Access your dashboard to view classes, grades, and billing information.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusTransition;