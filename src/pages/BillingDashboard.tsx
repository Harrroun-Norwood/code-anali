import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Calendar, Receipt, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BillingRecord {
  id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

interface EnrollmentInfo {
  id: string;
  tuition_fee: number;
  payment_plan: string;
  academic_year: string;
  semester: string;
  programs: {
    name: string;
    category: string;
  } | null;
}

const BillingDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [enrollmentInfo, setEnrollmentInfo] = useState<EnrollmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered, user:', user);
    if (user?.id) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      console.log('Fetching billing data for user:', user?.id);
      
      // Fetch billing records for the current student
      const { data: billingData, error: billingError } = await supabase
        .from('billing')
        .select('*')
        .eq('student_id', user?.id)
        .order('due_date', { ascending: true });

      console.log('Billing data:', billingData);
      console.log('Billing error:', billingError);

      if (billingError) throw billingError;

      // Fetch enrollment information
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          id,
          tuition_fee,
          payment_plan,
          academic_year,
          semester,
          programs:program_id (
            name,
            category
          )
        `)
        .eq('student_id', user.id)
        .eq('enrollment_status', 'approved')
        .single();

      if (enrollmentError && enrollmentError.code !== 'PGRST116') {
        console.error('Enrollment fetch error:', enrollmentError);
      }

      setBillingRecords(billingData || []);
      setEnrollmentInfo(enrollmentData);

      console.log('Set billing records:', billingData || []);
      console.log('Pending records:', (billingData || []).filter(record => record.status === 'pending'));

      // Calculate totals
      const paid = (billingData || [])
        .filter(record => record.status === 'paid')
        .reduce((sum, record) => sum + record.amount, 0);
      
      const owed = (billingData || [])
        .filter(record => record.status === 'pending')
        .reduce((sum, record) => sum + record.amount, 0);

      setTotalPaid(paid);
      setTotalOwed(owed);

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = (bill: BillingRecord) => {
    console.log('Pay Now button clicked', bill);
    setSelectedBill(bill);
    setPaymentAmount(bill.amount.toString());
    setPaymentModalOpen(true);
    console.log('Payment modal should open now');
  };

  const processPayment = async () => {
    if (!selectedBill || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      });
      return;
    }

    if (amount < selectedBill.amount) {
      toast({
        title: 'Insufficient Amount',
        description: `Payment amount must be at least ₱${selectedBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
        variant: 'destructive',
      });
      return;
    }

    setProcessingPayment(true);

    try {
      // Update the current bill to paid
      const { error: updateError } = await supabase
        .from('billing')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'Manual Payment',
          transaction_id: `TXN-${Date.now()}`,
        })
        .eq('id', selectedBill.id);

      if (updateError) throw updateError;

      // Handle overpayment
      const overpayment = amount - selectedBill.amount;
      if (overpayment > 0) {
        // Get next pending bills
        const { data: nextBills, error: nextBillsError } = await supabase
          .from('billing')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'pending')
          .gt('due_date', selectedBill.due_date)
          .order('due_date', { ascending: true });

        if (nextBillsError) throw nextBillsError;

        let remainingOverpayment = overpayment;
        const updatePromises = [];

        // Apply overpayment to next bills
        for (const nextBill of nextBills || []) {
          if (remainingOverpayment <= 0) break;

          if (remainingOverpayment >= nextBill.amount) {
            // Pay the entire next bill
            updatePromises.push(
              supabase
                .from('billing')
                .update({
                  status: 'paid',
                  payment_date: new Date().toISOString().split('T')[0],
                  payment_method: 'Overpayment Credit',
                  transaction_id: `OVP-${Date.now()}-${nextBill.id}`,
                })
                .eq('id', nextBill.id)
            );
            remainingOverpayment -= nextBill.amount;
          } else {
            // Partially pay the next bill
            const newAmount = nextBill.amount - remainingOverpayment;
            updatePromises.push(
              supabase
                .from('billing')
                .update({
                  amount: newAmount,
                  notes: `Original amount: ₱${nextBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}, Credit applied: ₱${remainingOverpayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                })
                .eq('id', nextBill.id)
            );
            remainingOverpayment = 0;
          }
        }

        // Execute all update promises
        await Promise.all(updatePromises);

        if (remainingOverpayment > 0) {
          toast({
            title: 'Payment Processed',
            description: `Payment successful! Excess amount of ₱${remainingOverpayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })} will be credited to your account.`,
          });
        } else {
          toast({
            title: 'Payment Processed',
            description: `Payment successful! Overpayment of ₱${overpayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })} was applied to future bills.`,
          });
        }
      } else {
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been processed successfully.',
        });
      }

      // Refresh data
      await fetchBillingData();
      setPaymentModalOpen(false);
      setSelectedBill(null);
      setPaymentAmount('');

    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: 'Payment Failed',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'paid') return false;
    return new Date(dueDate) < new Date();
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!enrollmentInfo) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>No Enrollment Found</CardTitle>
              <CardDescription>
                You don't have an active enrollment. Please complete your enrollment process first.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link to="/enrollment">Complete Enrollment</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Billing & Payments</h1>
          <p className="text-muted-foreground">
            Manage your tuition payments and view billing history
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tuition</p>
                  <p className="text-2xl font-bold">{formatCurrency(enrollmentInfo.tuition_fee)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOwed)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Program Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enrollment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Program</p>
                <p className="font-semibold">{enrollmentInfo.programs?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Plan</p>
                <p className="font-semibold capitalize">{enrollmentInfo.payment_plan}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Academic Year</p>
                <p className="font-semibold">{enrollmentInfo.academic_year}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Semester</p>
                <p className="font-semibold">{enrollmentInfo.semester}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Records */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History & Schedule</CardTitle>
            <CardDescription>
              View all your payments and upcoming dues
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingRecords.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Billing Records</h3>
                <p className="text-muted-foreground">
                  Your billing schedule will appear here once generated.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {billingRecords.map((record) => {
                  const overdue = isOverdue(record.due_date, record.status);
                  const actualStatus = overdue && record.status === 'pending' ? 'overdue' : record.status;
                  
                  return (
                    <Card key={record.id} className={overdue ? 'border-red-200' : ''}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(actualStatus)}
                                <h3 className="font-semibold text-lg">
                                  {formatCurrency(record.amount)}
                                </h3>
                              </div>
                              <Badge className={getStatusColor(actualStatus)}>
                                {actualStatus.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Due: {new Date(record.due_date).toLocaleDateString('en-PH')}</span>
                              </div>
                              {record.payment_date && (
                                <p>Paid: {new Date(record.payment_date).toLocaleDateString('en-PH')}</p>
                              )}
                              {record.payment_method && (
                                <p>Method: {record.payment_method}</p>
                              )}
                              {record.transaction_id && (
                                <p>Reference: {record.transaction_id}</p>
                              )}
                              {record.notes && (
                                <p>Notes: {record.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {record.status === 'pending' && (
                              <Button size="sm" onClick={() => handlePaymentClick(record)}>
                                Pay Now
                              </Button>
                            )}
                            {record.status === 'paid' && (
                              <Button variant="outline" size="sm">
                                <Receipt className="w-4 h-4 mr-2" />
                                View Receipt
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              Enter the amount you want to pay for this bill.
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Bill Amount:</span>
                  <span className="font-bold">₱{selectedBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Due Date:</span>
                  <span>{new Date(selectedBill.due_date).toLocaleDateString('en-PH')}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Payment Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min={selectedBill.amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: ₱{selectedBill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. 
                  Excess amount will be applied to future bills.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={processPayment}
                  disabled={processingPayment || !paymentAmount}
                >
                  {processingPayment ? 'Processing...' : 'Process Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingDashboard;