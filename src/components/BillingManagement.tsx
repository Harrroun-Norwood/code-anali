import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Filter, Receipt, Calendar, DollarSign, Users } from 'lucide-react';

interface BillingRecord {
  id: string;
  student_id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  enrollment_id: string | null;
  created_at: string;
  student?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const BillingManagement = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRecord, setNewRecord] = useState({
    student_id: '',
    amount: '',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (user && (profile?.role === 'super_admin' || profile?.role === 'registrar' || profile?.role === 'accountant')) {
      fetchBillingRecords();
    }
  }, [user, profile]);

  const fetchBillingRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('billing')
        .select(`
          *,
          profiles!billing_student_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBillingRecords(data || []);
    } catch (error) {
      console.error('Error fetching billing records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing records.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBilling = async () => {
    try {
      const { error } = await supabase
        .from('billing')
        .insert({
          student_id: newRecord.student_id,
          amount: parseFloat(newRecord.amount),
          due_date: newRecord.due_date,
          notes: newRecord.notes,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Billing record created successfully.',
      });

      setShowAddDialog(false);
      setNewRecord({ student_id: '', amount: '', due_date: '', notes: '' });
      fetchBillingRecords();
    } catch (error) {
      console.error('Error creating billing record:', error);
      toast({
        title: 'Error',
        description: 'Failed to create billing record.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (id: string, status: string, paymentMethod?: string) => {
    try {
      const updateData: any = { status };
      if (status === 'paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
        if (paymentMethod) updateData.payment_method = paymentMethod;
      }

      const { error } = await supabase
        .from('billing')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Billing status updated successfully.',
      });

      fetchBillingRecords();
    } catch (error) {
      console.error('Error updating billing status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update billing status.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'overdue':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const filteredRecords = billingRecords.filter(record => {
    const matchesSearch = record.student?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.student?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.student?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0);
  const paidAmount = filteredRecords.filter(r => r.status === 'paid').reduce((sum, record) => sum + Number(record.amount), 0);
  const pendingAmount = filteredRecords.filter(r => r.status === 'pending').reduce((sum, record) => sum + Number(record.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Billing Management</h2>
          <p className="text-muted-foreground">Manage student billing and payments</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Billing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Billing Record</DialogTitle>
              <DialogDescription>Add a new billing record for a student</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="student-id">Student ID</Label>
                <Input
                  id="student-id"
                  value={newRecord.student_id}
                  onChange={(e) => setNewRecord({ ...newRecord, student_id: e.target.value })}
                  placeholder="Enter student UUID"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newRecord.amount}
                  onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newRecord.due_date}
                  onChange={(e) => setNewRecord({ ...newRecord, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <Button onClick={handleAddBilling} className="w-full">
                Create Billing Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">₱{totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-success">₱{paidAmount.toLocaleString()}</p>
              </div>
              <Receipt className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">₱{pendingAmount.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{new Set(filteredRecords.map(r => r.student_id)).size}</p>
              </div>
              <Users className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
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

      {/* Billing Records */}
      <div className="space-y-4">
        {filteredRecords.map((record) => (
          <Card key={record.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">
                      {record.student?.first_name} {record.student?.last_name}
                    </h3>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium">Amount</p>
                      <p className="font-semibold text-foreground">₱{Number(record.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Due Date</p>
                      <p>{new Date(record.due_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Payment Date</p>
                      <p>{record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'Not paid'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Method</p>
                      <p>{record.payment_method || 'N/A'}</p>
                    </div>
                  </div>
                  {record.notes && (
                    <p className="text-sm text-muted-foreground">Notes: {record.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {record.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(record.id, 'paid', 'cash')}
                    >
                      Mark as Paid
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Receipt className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No billing records found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first billing record to get started.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillingManagement;