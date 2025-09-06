import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Users,
  Calendar,
  Receipt,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Download,
  FileText,
  Filter,
  Mail,
  Trash2,
  Search
} from 'lucide-react';
import BillingStatements from '@/components/BillingStatements';
import { Textarea } from '@/components/ui/textarea';

interface BillingStats {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  totalStudents: number;
  paymentRate: number;
}

interface BillingRecord {
  id: string;
  student_id: string;
  student_name: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: string;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

interface PaymentSummary {
  student_id: string;
  student_name: string;
  total_due: number;
  total_paid: number;
  balance: number;
  last_payment: string;
  status: string;
}

interface Student {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number?: string;
}

const AccountantDashboard = () => {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    overduePayments: 0,
    totalStudents: 0,
    paymentRate: 0
  });
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [paymentSummaries, setPaymentSummaries] = useState<PaymentSummary[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillingRecord | null>(null);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState('');

  const [newBill, setNewBill] = useState({
    student_id: '',
    amount: 0,
    due_date: '',
    notes: ''
  });

  const [editBill, setEditBill] = useState({
    id: '',
    student_id: '',
    amount: 0,
    due_date: '',
    notes: '',
    status: ''
  });

  useEffect(() => {
    if (user && isRole('accountant')) {
      fetchAccountingData();
    }
  }, [user, isRole]);

  const fetchAccountingData = async () => {
    try {
      // Fetch all students first
      const { data: allStudentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, contact_number')
        .eq('role', 'student')
        .eq('is_active', true);

      if (studentsError) throw studentsError;
      setAllStudents(allStudentsData || []);

      // Fetch billing records with student names
      const { data: billingData, error: billingError } = await supabase
        .from('billing')
        .select('*')
        .order('created_at', { ascending: false });

      if (billingError) throw billingError;

      // Get student profiles for names (only for existing billing records)
      const studentIds = [...new Set((billingData || []).map(b => b.student_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', studentIds);

      // Enrich billing data with student names
      const enrichedBilling = (billingData || []).map(bill => {
        const profile = profilesData?.find(p => p.user_id === bill.student_id);
        return {
          ...bill,
          student_name: profile ? 
            `${profile.first_name} ${profile.last_name}` : 
            'Unknown Student'
        };
      });

      setBillingRecords(enrichedBilling);

      // Calculate statistics
      const totalRevenue = enrichedBilling
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + Number(bill.amount), 0);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = enrichedBilling
        .filter(bill => {
          const paymentDate = bill.payment_date ? new Date(bill.payment_date) : null;
          return paymentDate && 
                 paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear &&
                 bill.status === 'paid';
        })
        .reduce((sum, bill) => sum + Number(bill.amount), 0);

      const pendingPayments = enrichedBilling.filter(bill => bill.status === 'pending').length;
      
      const today = new Date();
      const overduePayments = enrichedBilling.filter(bill => 
        bill.status === 'pending' && new Date(bill.due_date) < today
      ).length;

      const totalStudents = studentIds.length;
      const paymentRate = totalStudents > 0 ? 
        ((totalStudents - pendingPayments) / totalStudents) * 100 : 0;

      setStats({
        totalRevenue,
        monthlyRevenue,
        pendingPayments,
        overduePayments,
        totalStudents,
        paymentRate
      });

      // Generate payment summaries
      const summaries = studentIds.map(studentId => {
        const studentBills = enrichedBilling.filter(bill => bill.student_id === studentId);
        const profile = profilesData?.find(p => p.user_id === studentId);
        
        const totalDue = studentBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
        const totalPaid = studentBills
          .filter(bill => bill.status === 'paid')
          .reduce((sum, bill) => sum + Number(bill.amount), 0);
        const balance = totalDue - totalPaid;
        
        const lastPayment = studentBills
          .filter(bill => bill.status === 'paid' && bill.payment_date)
          .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime())[0];

        const hasPending = studentBills.some(bill => bill.status === 'pending');
        const hasOverdue = studentBills.some(bill => 
          bill.status === 'pending' && new Date(bill.due_date) < today
        );

        return {
          student_id: studentId,
          student_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          total_due: totalDue,
          total_paid: totalPaid,
          balance: balance,
          last_payment: lastPayment?.payment_date || 'Never',
          status: hasOverdue ? 'overdue' : hasPending ? 'pending' : 'current'
        };
      });

      setPaymentSummaries(summaries);

    } catch (error) {
      console.error('Error fetching accounting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBill = async () => {
    if (!newBill.student_id || !newBill.amount || !newBill.due_date) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('billing')
        .insert({
          student_id: newBill.student_id,
          amount: newBill.amount,
          due_date: newBill.due_date,
          notes: newBill.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bill added successfully.',
      });

      setIsAddBillOpen(false);
      setNewBill({
        student_id: '',
        amount: 0,
        due_date: '',
        notes: ''
      });
      fetchAccountingData();
    } catch (error) {
      console.error('Error adding bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to add bill.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (billId: string, paymentMethod: string = 'manual') => {
    try {
      const { error } = await supabase
        .from('billing')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          transaction_id: `TXN-${Date.now()}`
        })
        .eq('id', billId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully.',
      });

      fetchAccountingData();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment.',
        variant: 'destructive',
      });
    }
  };

  const handleEditBill = (bill: BillingRecord) => {
    setEditingBill(bill);
    setEditBill({
      id: bill.id,
      student_id: bill.student_id,
      amount: Number(bill.amount),
      due_date: bill.due_date,
      notes: bill.notes || '',
      status: bill.status
    });
    setIsEditBillOpen(true);
  };

  const handleUpdateBill = async () => {
    if (!editBill.amount || !editBill.due_date) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('billing')
        .update({
          amount: editBill.amount,
          due_date: editBill.due_date,
          notes: editBill.notes || null,
          status: editBill.status
        })
        .eq('id', editBill.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bill updated successfully.',
      });

      setIsEditBillOpen(false);
      setEditingBill(null);
      fetchAccountingData();
    } catch (error) {
      console.error('Error updating bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bill.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;

    try {
      const { error } = await supabase
        .from('billing')
        .delete()
        .eq('id', billId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bill deleted successfully.',
      });

      fetchAccountingData();
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete bill.',
        variant: 'destructive',
      });
    }
  };

  const generateReport = async (type: string) => {
    try {
      let reportData: any[] = [];
      let filename = '';

      switch (type) {
        case 'payment':
          reportData = billingRecords.filter(bill => bill.status === 'paid');
          filename = `payment-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'revenue':
          reportData = billingRecords.filter(bill => bill.status === 'paid');
          filename = `revenue-analysis-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'overdue':
          const today = new Date();
          reportData = billingRecords.filter(bill => 
            bill.status === 'pending' && new Date(bill.due_date) < today
          );
          filename = `overdue-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'collections':
          reportData = billingRecords;
          filename = `collections-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          reportData = billingRecords;
          filename = `general-report-${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Generate CSV content
      const headers = ['Student Name', 'Amount', 'Due Date', 'Payment Date', 'Status', 'Payment Method', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...reportData.map(bill => [
          `"${bill.student_name}"`,
          bill.amount,
          bill.due_date,
          bill.payment_date || '',
          bill.status,
          bill.payment_method || '',
          `"${bill.notes || ''}"`
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded successfully.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report.',
        variant: 'destructive',
      });
    }
  };

  const sendPaymentReminder = async (studentId: string, billId: string) => {
    try {
      // In a real app, you'd send an email here
      toast({
        title: 'Reminder Sent',
        description: 'Payment reminder has been sent to the student.',
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to send payment reminder.',
        variant: 'destructive',
      });
    }
  };

  const bulkMarkAsPaid = async () => {
    if (selectedBills.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select bills to mark as paid.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('billing')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bulk_update',
          transaction_id: `BULK-${Date.now()}`
        })
        .in('id', selectedBills);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedBills.length} bills marked as paid.`,
      });

      setSelectedBills([]);
      fetchAccountingData();
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast({
        title: 'Error',
        description: 'Failed to update selected bills.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'current':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBillingRecords = billingRecords.filter(bill => {
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    const matchesSearch = bill.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.amount.toString().includes(searchTerm) ||
                         bill.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isRole('accountant')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Accountant Dashboard</h1>
          <p className="text-muted-foreground">
            Manage billing, payments, and financial records for all students
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₱{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold">₱{stats.monthlyRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold">{stats.pendingPayments}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue Payments</p>
                  <p className="text-2xl font-bold">{stats.overduePayments}</p>
                </div>
                <Receipt className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Rate</p>
                  <p className="text-2xl font-bold">{stats.paymentRate.toFixed(1)}%</p>
                </div>
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bills" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bills">Billing Records</TabsTrigger>
            <TabsTrigger value="summaries">Payment Summaries</TabsTrigger>
            <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="bills" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Billing Records</h2>
              <div className="flex gap-2">
                {selectedBills.length > 0 && (
                  <Button onClick={bulkMarkAsPaid} variant="outline">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Selected as Paid
                  </Button>
                )}
                <Dialog open={isAddBillOpen} onOpenChange={setIsAddBillOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Bill
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Bill</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Student</Label>
                      <Select 
                        value={newBill.student_id} 
                        onValueChange={(value) => setNewBill({...newBill, student_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {allStudents.map(student => (
                            <SelectItem key={student.user_id} value={student.user_id}>
                              {student.first_name} {student.last_name} ({student.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input 
                        type="number"
                        value={newBill.amount}
                        onChange={(e) => setNewBill({...newBill, amount: Number(e.target.value)})}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input 
                        type="date"
                        value={newBill.due_date}
                        onChange={(e) => setNewBill({...newBill, due_date: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Input 
                        value={newBill.notes}
                        onChange={(e) => setNewBill({...newBill, notes: e.target.value})}
                        placeholder="Additional notes"
                      />
                    </div>

                    <Button onClick={handleAddBill} disabled={loading} className="w-full">
                      {loading ? 'Adding...' : 'Add Bill'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Edit Bill Dialog */}
              <Dialog open={isEditBillOpen} onOpenChange={setIsEditBillOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Bill</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input 
                        type="number"
                        value={editBill.amount}
                        onChange={(e) => setEditBill({...editBill, amount: Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input 
                        type="date"
                        value={editBill.due_date}
                        onChange={(e) => setEditBill({...editBill, due_date: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select 
                        value={editBill.status} 
                        onValueChange={(value) => setEditBill({...editBill, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea 
                        value={editBill.notes}
                        onChange={(e) => setEditBill({...editBill, notes: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleUpdateBill} disabled={loading} className="w-full">
                      {loading ? 'Updating...' : 'Update Bill'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search bills..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredBillingRecords.map((bill) => (
                <Card key={bill.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox"
                          checked={selectedBills.includes(bill.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBills([...selectedBills, bill.id]);
                            } else {
                              setSelectedBills(selectedBills.filter(id => id !== bill.id));
                            }
                          }}
                          className="mt-1"
                        />
                        <div>
                          <h3 className="font-semibold text-lg">{bill.student_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Amount: ₱{Number(bill.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due Date: {new Date(bill.due_date).toLocaleDateString()}
                          </p>
                          {bill.payment_date && (
                            <p className="text-xs text-muted-foreground">
                              Paid: {new Date(bill.payment_date).toLocaleDateString()}
                            </p>
                          )}
                          {bill.notes && (
                            <p className="text-xs text-gray-600 mt-1">Notes: {bill.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(bill.status)}>
                          {bill.status}
                        </Badge>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditBill(bill)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {bill.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => markAsPaid(bill.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => sendPaymentReminder(bill.student_id, bill.id)}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteBill(bill.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="summaries" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Student Payment Summaries</h2>
            </div>

            <div className="space-y-4">
              {paymentSummaries.map((summary) => (
                <Card key={summary.student_id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{summary.student_name}</h3>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Due: ₱{summary.total_due.toLocaleString()}</p>
                            <p className="text-muted-foreground">Total Paid: ₱{summary.total_paid.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Balance: ₱{summary.balance.toLocaleString()}</p>
                            <p className="text-muted-foreground">
                              Last Payment: {summary.last_payment === 'Never' ? 'Never' : new Date(summary.last_payment).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(summary.status)}>
                        {summary.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>Generate and view financial reports and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col"
                    onClick={() => generateReport('payment')}
                  >
                    <Receipt className="w-6 h-6 mb-2" />
                    <span>Payment Report</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col"
                    onClick={() => generateReport('revenue')}
                  >
                    <TrendingUp className="w-6 h-6 mb-2" />
                    <span>Revenue Analysis</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col"
                    onClick={() => generateReport('student')}
                  >
                    <Users className="w-6 h-6 mb-2" />
                    <span>Student Accounts</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col"
                    onClick={() => generateReport('overdue')}
                  >
                    <Calendar className="w-6 h-6 mb-2" />
                    <span>Overdue Report</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col"
                    onClick={() => generateReport('collections')}
                  >
                    <DollarSign className="w-6 h-6 mb-2" />
                    <span>Collections Report</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col"
                    onClick={() => generateReport('payment-methods')}
                  >
                    <CreditCard className="w-6 h-6 mb-2" />
                    <span>Payment Methods</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* BillingStatements Component */}
            <Card>
              <CardHeader>
                <CardTitle>Student Billing Statements</CardTitle>
                <CardDescription>Generate detailed billing statements for students</CardDescription>
              </CardHeader>
              <CardContent>
                <BillingStatements />
              </CardContent>
            </Card>

            {/* Quick Stats for Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">This Month</h3>
                    <p className="text-2xl font-bold text-green-600">₱{stats.monthlyRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Revenue Collected</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Outstanding</h3>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
                    <p className="text-sm text-muted-foreground">Pending Bills</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Overdue</h3>
                    <p className="text-2xl font-bold text-red-600">{stats.overduePayments}</p>
                    <p className="text-sm text-muted-foreground">Past Due Bills</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Collection Rate</h3>
                    <p className="text-2xl font-bold text-blue-600">{stats.paymentRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
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

export default AccountantDashboard;