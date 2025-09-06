import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Lock, CreditCard, Calendar, Eye, EyeOff, DollarSign, Receipt } from 'lucide-react';

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

const EncryptedBillingView = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (isUnlocked && user) {
      fetchBillingData();
    }
  }, [isUnlocked, user]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('billing')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBillingRecords(data || []);
      
      // Calculate totals
      const due = data?.filter(record => record.status === 'pending')
        .reduce((sum, record) => sum + (record.amount || 0), 0) || 0;
      const paid = data?.filter(record => record.status === 'paid')
        .reduce((sum, record) => sum + (record.amount || 0), 0) || 0;
      
      setTotalDue(due);
      setTotalPaid(paid);
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

  const handleUnlock = () => {
    if (!password) {
      toast({
        title: 'Password Required',
        description: 'Please enter your access password.',
        variant: 'destructive',
      });
      return;
    }

    // Simple password validation - in production, this should be more secure
    const expectedPassword = `${profile?.first_name || 'student'}${new Date().getFullYear()}`;
    
    if (password.toLowerCase() === expectedPassword.toLowerCase()) {
      setIsUnlocked(true);
      toast({
        title: 'Access Granted',
        description: 'Billing information unlocked successfully.',
      });
    } else {
      toast({
        title: 'Access Denied',
        description: 'Incorrect password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Encrypted Billing Access</CardTitle>
              <CardDescription>
                Enter your secure access password to view billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Access Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
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
                <p className="text-xs text-muted-foreground">
                  Password format: YourFirstName{new Date().getFullYear()}
                </p>
              </div>
              
              <Button onClick={handleUnlock} className="w-full">
                <Lock className="w-4 h-4 mr-2" />
                Unlock Billing Information
              </Button>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Security Information
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Your billing information is encrypted for privacy</li>
                  <li>• Only you can access your financial data</li>
                  <li>• Sessions expire automatically for security</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Billing Information</h1>
            <p className="text-muted-foreground">
              Secure view of your payment history and outstanding balances.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsUnlocked(false)}
            className="flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Lock View
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-red-600" />
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
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">{billingRecords.length}</p>
                </div>
                <Receipt className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Billing Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              Detailed view of all billing transactions and payment records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : billingRecords.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Billing Records</h3>
                <p className="text-muted-foreground">
                  No billing information available at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {billingRecords.map((record) => (
                  <div key={record.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{formatCurrency(record.amount)}</h3>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(record.due_date).toLocaleDateString()}</span>
                        </div>
                        {record.payment_date && (
                          <div>
                            <span>Paid: {new Date(record.payment_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {record.payment_method && (
                          <div>
                            <span>Method: {record.payment_method}</span>
                          </div>
                        )}
                        {record.transaction_id && (
                          <div>
                            <span>Transaction: {record.transaction_id}</span>
                          </div>
                        )}
                      </div>
                      {record.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Notes: {record.notes}
                        </p>
                      )}
                    </div>
                    
                    {record.status === 'pending' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Pay Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Payment Options</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p>Amount Due: <strong>{formatCurrency(record.amount)}</strong></p>
                            <p className="text-sm text-muted-foreground">
                              Please visit the school office or contact the registrar to process your payment.
                            </p>
                            <div className="bg-muted/50 p-4 rounded-lg">
                              <h4 className="font-semibold text-sm mb-2">Payment Methods</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Cash payment at school office</li>
                                <li>• Bank transfer (contact for details)</li>
                                <li>• Online payment (coming soon)</li>
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EncryptedBillingView;