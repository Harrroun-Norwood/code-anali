import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Banknote, QrCode, CheckCircle } from 'lucide-react';

interface PaymentProcessorProps {
  billingId: string;
  amount: number;
  studentName: string;
  onPaymentComplete?: () => void;
}

const PaymentProcessor = ({ billingId, amount, studentName, onPaymentComplete }: PaymentProcessorProps) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState({
    reference_number: '',
    notes: ''
  });

  const handlePayment = async () => {
    try {
      setProcessing(true);

      // Update billing record with payment information
      const { error } = await supabase
        .from('billing')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          transaction_id: paymentData.reference_number || `PAY-${Date.now()}`,
          notes: paymentData.notes
        })
        .eq('id', billingId);

      if (error) throw error;

      toast({
        title: 'Payment Processed',
        description: `Payment of ₱${amount.toLocaleString()} has been successfully recorded.`,
      });

      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Payment Failed',
        description: 'There was an error processing the payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Process Payment
        </CardTitle>
        <CardDescription>
          Record payment for {studentName} - ₱{amount.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div>
          <Label className="text-base font-medium">Payment Method</Label>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-3">
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                <Banknote className="w-4 h-4" />
                Cash Payment
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="w-4 h-4" />
                Bank Transfer
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="gcash" id="gcash" />
              <Label htmlFor="gcash" className="flex items-center gap-2 cursor-pointer">
                <QrCode className="w-4 h-4" />
                GCash
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="paypal" id="paypal" />
              <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="w-4 h-4" />
                PayPal
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Reference Number */}
        <div>
          <Label htmlFor="reference">Reference Number</Label>
          <Input
            id="reference"
            value={paymentData.reference_number}
            onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
            placeholder="Enter transaction/reference number"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Optional - will be auto-generated if not provided
          </p>
        </div>

        {/* Payment Notes */}
        <div>
          <Label htmlFor="notes">Payment Notes</Label>
          <Input
            id="notes"
            value={paymentData.notes}
            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
            placeholder="Add any additional notes about this payment"
          />
        </div>

        {/* Payment Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Student:</span>
              <span className="font-medium">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">₱{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="font-medium capitalize">{paymentMethod.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-medium">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Process Payment Button */}
        <Button 
          onClick={handlePayment} 
          disabled={processing}
          className="w-full"
          size="lg"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Process Payment of ₱{amount.toLocaleString()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentProcessor;