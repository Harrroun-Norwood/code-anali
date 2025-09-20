import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Book, Users, Award } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  price: number;
  category: string;
  duration: string;
}

interface TuitionBreakdown {
  basePrice: number;
  discounts: { name: string; amount: number }[];
  miscellaneousFees: { name: string; amount: number }[];
  totalTuition: number;
}

interface TuitionCalculatorProps {
  programId: string;
  studentId?: string;
  gradeLevel?: string;
  onCalculationComplete?: (breakdown: TuitionBreakdown) => void;
}

const TuitionCalculator = ({ 
  programId, 
  studentId, 
  gradeLevel,
  onCalculationComplete 
}: TuitionCalculatorProps) => {
  const [program, setProgram] = useState<Program | null>(null);
  const [breakdown, setBreakdown] = useState<TuitionBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (programId) {
      calculateTuition();
    }
  }, [programId, studentId, gradeLevel]);

  const calculateTuition = async () => {
    try {
      setLoading(true);

      // Fetch program details
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (programError || !programData) {
        console.error('Error fetching program:', programError);
        return;
      }

      setProgram(programData);

      // Calculate base price
      const basePrice = programData.price || 0;

      // Calculate discounts (example logic - can be expanded)
      const discounts: { name: string; amount: number }[] = [];
      
      // Early enrollment discount
      const currentDate = new Date();
      const isEarlyEnrollment = currentDate.getMonth() < 6; // Before July
      if (isEarlyEnrollment) {
        discounts.push({
          name: 'Early Enrollment Discount',
          amount: basePrice * 0.05 // 5% discount
        });
      }

      // Sibling discount (if student has siblings enrolled)
      if (studentId) {
        const { data: siblingEnrollments } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('enrollment_status', 'approved')
          .neq('student_id', studentId);

        if (siblingEnrollments && siblingEnrollments.length > 0) {
          // Check if any siblings (same parent/guardian)
          // This is a simplified check - in real implementation, you'd check family relationships
          discounts.push({
            name: 'Sibling Discount',
            amount: basePrice * 0.10 // 10% discount
          });
        }
      }

      // Grade level based pricing adjustments
      const miscellaneousFees: { name: string; amount: number }[] = [];
      
      // Add standard fees
      miscellaneousFees.push(
        { name: 'Registration Fee', amount: 500 },
        { name: 'Learning Materials', amount: 1500 },
        { name: 'Activity Fee', amount: 800 }
      );

      // Grade-specific fees
      if (gradeLevel && ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(gradeLevel)) {
        miscellaneousFees.push({ name: 'Laboratory Fee', amount: 1200 });
      }

      if (gradeLevel && ['Grade 11', 'Grade 12'].includes(gradeLevel)) {
        miscellaneousFees.push(
          { name: 'Senior High Materials', amount: 2000 },
          { name: 'Practicum Fee', amount: 1500 }
        );
      }

      // Calculate totals
      const totalDiscounts = discounts.reduce((sum, discount) => sum + discount.amount, 0);
      const totalMiscFees = miscellaneousFees.reduce((sum, fee) => sum + fee.amount, 0);
      const totalTuition = basePrice - totalDiscounts + totalMiscFees;

      const calculationBreakdown: TuitionBreakdown = {
        basePrice,
        discounts,
        miscellaneousFees,
        totalTuition
      };

      setBreakdown(calculationBreakdown);
      
      if (onCalculationComplete) {
        onCalculationComplete(calculationBreakdown);
      }

    } catch (error) {
      console.error('Error calculating tuition:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 animate-pulse" />
            <span>Calculating tuition fees...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!breakdown || !program) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Unable to calculate tuition fees. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Tuition Fee Breakdown
        </CardTitle>
        <CardDescription>
          Detailed calculation for {program.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base Price */}
        <div className="flex justify-between items-center py-2 border-b">
          <div className="flex items-center gap-2">
            <Book className="h-4 w-4 text-primary" />
            <span className="font-medium">Base Tuition ({program.name})</span>
          </div>
          <span className="font-semibold">₱{breakdown.basePrice.toLocaleString()}</span>
        </div>

        {/* Discounts */}
        {breakdown.discounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-600 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Discounts Applied
            </h4>
            {breakdown.discounts.map((discount, index) => (
              <div key={index} className="flex justify-between items-center py-1 pl-6">
                <span className="text-sm text-green-600">{discount.name}</span>
                <Badge variant="secondary" className="text-green-600">
                  -₱{discount.amount.toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Miscellaneous Fees */}
        {breakdown.miscellaneousFees.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Additional Fees
            </h4>
            {breakdown.miscellaneousFees.map((fee, index) => (
              <div key={index} className="flex justify-between items-center py-1 pl-6">
                <span className="text-sm">{fee.name}</span>
                <span className="text-sm">₱{fee.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total Tuition Fee</span>
            <span className="text-2xl font-bold text-primary">
              ₱{breakdown.totalTuition.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            * Final amount may vary based on payment plan selected
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TuitionCalculator;