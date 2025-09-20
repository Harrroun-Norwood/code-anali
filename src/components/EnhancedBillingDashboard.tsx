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
import { formatPesoAmount, isPaymentOverdue } from '@/utils/billingCalculations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

const EnhancedBillingDashboard = () => {
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
    if (user) {
      fetchBillingData();
      
      // Set up real-time subscription for billing updates
      const billingSubscription = supabase
        .channel('billing-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'billing',
            filter: `student_id=eq.${user.id}`
          },
          () => {
            fetchBillingData();
          }
        )
        .subscribe();

      return () => {
        billingSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchBillingData = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching billing data for user:', user.id);
      
      // Fetch billing records for the current student
      const { data: billingData, error: billingError } = await supabase
        .from('billing')
        .select('*')
        .eq('student_id', user.id)
        .order('due_date', { ascending: true });

      if (billingError) {
        console.error('Billing fetch error:', billingError);
        throw billingError;
      }

      console.log('Fetched billing records:', billingData);

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

      // Calculate totals
      const paid = (billingData || [])
        .filter(record => record.status === 'paid')
        .reduce((sum, record) => sum + Number(record.amount), 0);
      
      const owed = (billingData || [])
        .filter(record => record.status === 'pending')
        .reduce((sum, record) => sum + Number(record.amount), 0);

      console.log('Calculated totals - Paid:', paid, 'Owed:', owed);
      
      setTotalPaid(paid);
      setTotalOwed(owed);

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing information.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_approval':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string, dueDate: string) => {
    if (status === 'paid') return <CheckCircle className="h-4 w-4" />;
    if (status === 'pending_approval') return <Clock className="h-4 w-4" />;
    if (status === 'pending' && isPaymentOverdue(dueDate)) return <AlertCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const isOverdue = (record: BillingRecord) => {
    return record.status === 'pending' && isPaymentOverdue(record.due_date);
  };

  const handlePaymentClick = (bill: BillingRecord) => {
    setSelectedBill(bill);
    setPaymentAmount(bill.amount.toString());
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (!selectedBill || !paymentAmount || !user) return;

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
        description: `Payment amount must be at least ${formatPesoAmount(selectedBill.amount)}.`,
        variant: 'destructive',
      });
      return;
    }

    setProcessingPayment(true);

    try {
      console.log('Processing payment for bill:', selectedBill.id, 'Amount:', amount);
      
      // Update the current bill to pending approval
      const { data: updatedBill, error: updateError } = await supabase
        .from('billing')
        .update({
          status: 'pending_approval',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'Manual Payment',
          transaction_id: `TXN-${Date.now()}`,
        })
        .eq('id', selectedBill.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Bill updated successfully:', updatedBill);

      // Handle overpayment
      const overpayment = amount - selectedBill.amount;
      if (overpayment > 0) {
        console.log('Processing overpayment:', overpayment);
        
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
                  status: 'pending_approval',
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
                  notes: `Original amount: ${formatPesoAmount(nextBill.amount)}, Credit applied: ${formatPesoAmount(remainingOverpayment)}`,
                })
                .eq('id', nextBill.id)
            );
            remainingOverpayment = 0;
          }
        }

        // Execute all update promises
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }

        if (remainingOverpayment > 0) {
          toast({
            title: 'Payment Submitted',
            description: `Payment submitted for approval! Excess amount of ${formatPesoAmount(remainingOverpayment)} will be credited to your account upon approval.`,
          });
        } else {
          toast({
            title: 'Payment Submitted',
            description: `Payment submitted for approval! Overpayment of ${formatPesoAmount(overpayment)} was applied to future bills.`,
          });
        }
      } else {
        toast({
          title: 'Payment Submitted',
          description: 'Your payment has been submitted for approval by the accountant.',
        });
      }

      // Force refresh data immediately
      console.log('Refreshing billing data...');
      await fetchBillingData();
      
      // Close modal and reset state
      setPaymentModalOpen(false);
      setSelectedBill(null);
      setPaymentAmount('');

    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: 'Payment Failed',
        description: `Failed to process payment: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
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
                  <p className="text-2xl font-bold">{formatPesoAmount(enrollmentInfo?.tuition_fee || 0)}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">{formatPesoAmount(totalPaid)}</p>
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
                  <p className="text-2xl font-bold text-red-600">{formatPesoAmount(totalOwed)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="details">Enrollment Details</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Schedule</CardTitle>
                <CardDescription>
                  Your payment installments based on your selected plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No payment records found.</p>
                    </div>
                  ) : (
                    billingRecords.map((record) => (
                      <Card key={record.id} className={`transition-colors ${isOverdue(record) ? 'border-red-200 bg-red-50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{record.notes || 'Payment'}</p>
                                <Badge className={getStatusColor(isOverdue(record) ? 'overdue' : record.status)}>
                                  <div className="flex items-center gap-1">
                                    {getStatusIcon(record.status, record.due_date)}
                                    {isOverdue(record) ? 'OVERDUE' : record.status.toUpperCase()}
                                  </div>
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Due: {new Date(record.due_date).toLocaleDateString()}
                                {record.payment_date && (
                                  <span> • Paid: {new Date(record.payment_date).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">{formatPesoAmount(record.amount)}</p>
                              {record.status === 'pending' && (
                                <Button size="sm" className="mt-2" onClick={() => handlePaymentClick(record)}>
                                  Pay Now
                                </Button>
                              )}
                              {record.status === 'paid' && record.transaction_id && (
                                <Button variant="outline" size="sm" className="mt-2">
                                  <Receipt className="h-4 w-4 mr-1" />
                                  View Receipt
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-foreground">Program</p>
                      <p className="text-muted-foreground">{enrollmentInfo.programs?.name}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Category</p>
                      <p className="text-muted-foreground">{enrollmentInfo.programs?.category}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-foreground">Academic Year</p>
                      <p className="text-muted-foreground">{enrollmentInfo.academic_year}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Semester</p>
                      <p className="text-muted-foreground">{enrollmentInfo.semester}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Payment Plan</p>
                      <p className="text-muted-foreground capitalize">{enrollmentInfo.payment_plan}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
                  <span className="font-bold">{formatPesoAmount(selectedBill.amount)}</span>
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
                  Minimum: {formatPesoAmount(selectedBill.amount)}. 
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

export default EnhancedBillingDashboard;