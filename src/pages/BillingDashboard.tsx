import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Eye, EyeOff, Receipt, Calendar, DollarSign } from 'lucide-react';

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  reference_number: string;
}

interface TuitionSummary {
  total_tuition: number;
  paid_amount: number;
  balance: number;
  payment_plan: string;
  due_date: string;
}

const BillingDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [tuitionSummary, setTuitionSummary] = useState<TuitionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [billingPassword, setBillingPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (user && isAuthenticated) {
      fetchBillingData();
    }
  }, [user, isAuthenticated]);

  const fetchBillingData = async () => {
    try {
      // Fetch billing records for the current user
      const { data: billingData, error: billingError } = await supabase
        .from('billing')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (billingError) throw billingError;

      // Fetch enrollment data to get tuition info
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('tuition_fee, payment_plan')
        .eq('student_id', user.id)
        .eq('enrollment_status', 'approved')
        .single();

      if (enrollmentError && enrollmentError.code !== 'PGRST116') throw enrollmentError;

      // Calculate summary from billing data
      const totalTuition = enrollmentData?.tuition_fee || 50000;
      const paidAmount = (billingData || [])
        .filter(bill => bill.status === 'paid')
        .reduce((total, bill) => total + (Number(bill.amount) || 0), 0);
      
      const balance = totalTuition - paidAmount;
      
      // Get next due date from pending bills
      const nextDue = (billingData || [])
        .filter(bill => bill.status === 'pending')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

      const tuitionSummary: TuitionSummary = {
        total_tuition: totalTuition,
        paid_amount: paidAmount,
        balance: balance,
        payment_plan: enrollmentData?.payment_plan || 'monthly',
        due_date: nextDue?.due_date || '2024-12-31'
      };

      // Format payment history from billing data
      const paymentHistory: PaymentRecord[] = (billingData || [])
        .filter(bill => bill.status === 'paid' && bill.payment_date)
        .map(bill => ({
          id: bill.id,
          amount: Number(bill.amount),
          payment_date: bill.payment_date,
          payment_method: bill.payment_method || 'Unknown',
          status: 'completed',
          reference_number: bill.transaction_id || `PAY-${bill.id.substring(0, 8)}`
        }));

      setTuitionSummary(tuitionSummary);
      setPaymentHistory(paymentHistory);
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, verify password against database
    if (billingPassword === 'billing123') {
      setIsAuthenticated(true);
      toast({
        title: 'Access Granted',
        description: 'You now have access to your billing information.',
      });
    } else {
      toast({
        title: 'Access Denied',
        description: 'Incorrect billing password.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Secure Billing Access
              </CardTitle>
              <CardDescription>
                Enter your billing password to access your payment information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billing-password">Billing Password</Label>
                  <div className="relative">
                    <Input
                      id="billing-password"
                      type={showPassword ? 'text' : 'password'}
                      value={billingPassword}
                      onChange={(e) => setBillingPassword(e.target.value)}
                      placeholder="Enter your billing password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Access Billing
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4">
                Demo password: billing123
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Billing Dashboard</h1>
          <p className="text-muted-foreground">
            View your tuition fees, payment history, and manage your billing information.
          </p>
        </div>

        {/* Billing Summary Cards */}
        {tuitionSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Tuition</p>
                    <p className="text-2xl font-bold">₱{tuitionSummary.total_tuition.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                    <p className="text-2xl font-bold text-green-600">₱{tuitionSummary.paid_amount.toLocaleString()}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold text-red-600">₱{tuitionSummary.balance.toLocaleString()}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Next Due Date</p>
                    <p className="text-lg font-bold">{new Date(tuitionSummary.due_date).toLocaleDateString()}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="plans">Payment Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Payment History</h2>
              <Button>Make Payment</Button>
            </div>

            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">₱{payment.amount.toLocaleString()}</h3>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Payment Date: {new Date(payment.payment_date).toLocaleDateString()}</p>
                          <p>Method: {payment.payment_method}</p>
                          <p>Reference: {payment.reference_number}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Receipt className="w-4 h-4 mr-2" />
                        View Receipt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <h2 className="text-xl font-semibold">Payment Plans</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className={tuitionSummary?.payment_plan === 'monthly' ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle>Monthly Plan</CardTitle>
                  <CardDescription>Pay monthly installments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">₱5,000</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={tuitionSummary?.payment_plan === 'quarterly' ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle>Quarterly Plan</CardTitle>
                  <CardDescription>Pay every 3 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">₱14,000</p>
                    <p className="text-sm text-muted-foreground">per quarter</p>
                    <p className="text-xs text-green-600">Save ₱1,000</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={tuitionSummary?.payment_plan === 'full' ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle>Full Payment</CardTitle>
                  <CardDescription>Pay full amount upfront</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">₱45,000</p>
                    <p className="text-sm text-muted-foreground">one-time</p>
                    <p className="text-xs text-green-600">Save ₱5,000</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BillingDashboard;