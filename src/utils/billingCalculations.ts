// Utility functions for accurate billing calculations

export interface BillingRecord {
  id: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: string;
  created_at: string;
}

export interface PaymentPlan {
  type: 'monthly' | 'quarterly' | 'full';
  totalAmount: number;
  installments: number;
}

/**
 * Calculate accurate due dates based on enrollment date and payment plan
 */
export const calculateDueDates = (
  enrollmentDate: Date, 
  paymentPlan: PaymentPlan
): Date[] => {
  const dueDates: Date[] = [];
  const startDate = new Date(enrollmentDate);
  
  // Start billing from the first day of the next month after enrollment
  const firstBillingDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

  for (let i = 0; i < paymentPlan.installments; i++) {
    const dueDate = new Date(firstBillingDate);
    
    if (paymentPlan.type === 'monthly') {
      dueDate.setMonth(firstBillingDate.getMonth() + i);
    } else if (paymentPlan.type === 'quarterly') {
      dueDate.setMonth(firstBillingDate.getMonth() + (i * 3));
    } else {
      // Full payment due immediately
      dueDate.setTime(firstBillingDate.getTime());
    }
    
    dueDates.push(dueDate);
  }

  return dueDates;
};

/**
 * Calculate installment amount based on payment plan
 */
export const calculateInstallmentAmount = (
  totalAmount: number,
  paymentPlan: 'monthly' | 'quarterly' | 'full'
): number => {
  switch (paymentPlan) {
    case 'monthly':
      return Math.ceil(totalAmount / 10); // 10 months
    case 'quarterly':
      return Math.ceil(totalAmount / 4); // 4 quarters
    case 'full':
      return totalAmount;
    default:
      return totalAmount;
  }
};

/**
 * Check if a payment is overdue
 */
export const isPaymentOverdue = (dueDate: string): boolean => {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

/**
 * Calculate late fees if applicable
 */
export const calculateLateFee = (
  originalAmount: number,
  daysOverdue: number,
  lateFeeRate: number = 0.02 // 2% per month
): number => {
  if (daysOverdue <= 0) return 0;
  
  const monthsOverdue = Math.ceil(daysOverdue / 30);
  return Math.round(originalAmount * lateFeeRate * monthsOverdue);
};

/**
 * Format currency in PHP format
 */
export const formatPesoAmount = (amount: number): string => {
  return `₱${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Generate billing records for an enrollment
 */
export const generateBillingRecords = (
  studentId: string,
  enrollmentId: string,
  tuitionFee: number,
  paymentPlan: 'monthly' | 'quarterly' | 'full',
  enrollmentDate: Date
): Omit<BillingRecord, 'id' | 'created_at'>[] => {
  const plan: PaymentPlan = {
    type: paymentPlan,
    totalAmount: tuitionFee,
    installments: paymentPlan === 'monthly' ? 10 : paymentPlan === 'quarterly' ? 4 : 1
  };

  const dueDates = calculateDueDates(enrollmentDate, plan);
  const installmentAmount = calculateInstallmentAmount(tuitionFee, paymentPlan);

  return dueDates.map((dueDate, index) => ({
    student_id: studentId,
    enrollment_id: enrollmentId,
    amount: installmentAmount,
    due_date: dueDate.toISOString().split('T')[0],
    status: 'pending',
    notes: `${paymentPlan} payment ${index + 1} of ${plan.installments}`
  }));
};