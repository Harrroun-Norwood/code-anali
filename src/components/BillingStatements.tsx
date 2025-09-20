import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Send, DollarSign, Calendar, User, Mail, Phone } from 'lucide-react';

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
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
  };
}

const BillingStatements = () => {
  const { toast } = useToast();
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  useEffect(() => {
    fetchBillingRecords();
  }, []);

  const fetchBillingRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('billing')
        .select(`
          *,
          profiles!billing_student_id_fkey (
            first_name,
            last_name,
            email,
            contact_number
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

  const generateStatement = async () => {
    if (!selectedRecord) return;

    setIsGeneratingStatement(true);
    try {
      // Simulate statement generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Statement Generated',
        description: 'Billing statement has been generated and sent to the student.',
      });

      setSelectedRecord(null);
    } catch (error) {
      console.error('Error generating statement:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate billing statement.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  const sendPaymentReminder = async () => {
    if (!selectedRecord || !reminderMessage) return;

    try {
      // In a real implementation, this would integrate with SMS service
      toast({
        title: 'Reminder Sent',
        description: `Payment reminder sent to ${selectedRecord.profiles?.first_name} ${selectedRecord.profiles?.last_name}`,
      });

      setSelectedRecord(null);
      setReminderMessage('');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to send payment reminder.',
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

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'pending' && new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    billingRecords
                      .filter(record => record.status === 'pending')
                      .reduce((sum, record) => sum + (record.amount || 0), 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Payments</p>
                <p className="text-2xl font-bold text-red-600">
                  {billingRecords.filter(record => isOverdue(record.due_date, record.status)).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    billingRecords
                      .filter(record => {
                        if (!record.payment_date) return false;
                        const paymentMonth = new Date(record.payment_date).getMonth();
                        const currentMonth = new Date().getMonth();
                        return paymentMonth === currentMonth && record.status === 'paid';
                      })
                      .reduce((sum, record) => sum + (record.amount || 0), 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">
                  {new Set(billingRecords.map(record => record.student_id)).size}
                </p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Billing Records & Statements
          </CardTitle>
          <CardDescription>
            Generate billing statements and send payment reminders to students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingRecords.map((record) => (
              <div
                key={record.id}
                className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">
                      {record.profiles?.first_name} {record.profiles?.last_name}
                    </h4>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                    {isOverdue(record.due_date, record.status) && (
                      <Badge variant="destructive">Overdue</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{record.profiles?.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{record.profiles?.contact_number || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span>Amount: </span>
                        <span className="font-semibold">{formatCurrency(record.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(record.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {record.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      Notes: {record.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Statement
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Billing Statement</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Statement Details</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Student: </span>
                              <span>
                                {selectedRecord?.profiles?.first_name} {selectedRecord?.profiles?.last_name}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Amount: </span>
                              <span className="font-semibold">
                                {selectedRecord && formatCurrency(selectedRecord.amount)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Due Date: </span>
                              <span>
                                {selectedRecord && new Date(selectedRecord.due_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status: </span>
                              <Badge className={selectedRecord && getStatusColor(selectedRecord.status)}>
                                {selectedRecord?.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Statement Type</Label>
                          <Select defaultValue="standard">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard Statement</SelectItem>
                              <SelectItem value="detailed">Detailed Statement</SelectItem>
                              <SelectItem value="summary">Summary Statement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Additional Notes (Optional)</Label>
                          <Textarea
                            placeholder="Any additional notes for the statement..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                            Cancel
                          </Button>
                          <Button onClick={generateStatement} disabled={isGeneratingStatement}>
                            {isGeneratingStatement ? 'Generating...' : 'Generate & Send Statement'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {record.status === 'pending' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setSelectedRecord(record)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Reminder
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Send Payment Reminder</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Reminder Details</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Student: </span>
                                <span>
                                  {selectedRecord?.profiles?.first_name} {selectedRecord?.profiles?.last_name}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Phone: </span>
                                <span>{selectedRecord?.profiles?.contact_number || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Amount Due: </span>
                                <span className="font-semibold">
                                  {selectedRecord && formatCurrency(selectedRecord.amount)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Due Date: </span>
                                <span>
                                  {selectedRecord && new Date(selectedRecord.due_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>SMS Message</Label>
                            <Textarea
                              value={reminderMessage}
                              onChange={(e) => setReminderMessage(e.target.value)}
                              placeholder={`Dear ${selectedRecord?.profiles?.first_name}, this is a friendly reminder that your payment of ${selectedRecord && formatCurrency(selectedRecord.amount)} is due on ${selectedRecord && new Date(selectedRecord.due_date).toLocaleDateString()}. Please settle your account at your earliest convenience. Thank you! - ANALI`}
                              rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                              Maximum 160 characters for SMS delivery
                            </p>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => {
                              setSelectedRecord(null);
                              setReminderMessage('');
                            }}>
                              Cancel
                            </Button>
                            <Button onClick={sendPaymentReminder}>
                              <Send className="w-4 h-4 mr-2" />
                              Send SMS Reminder
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingStatements;