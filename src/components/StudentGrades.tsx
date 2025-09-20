import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, TrendingUp, Award, Calendar } from 'lucide-react';

interface Grade {
  id: string;
  assignment_name: string;
  grade_type: string;
  score: number;
  max_score: number;
  percentage: number;
  quarter: string;
  date_recorded: string;
  notes: string;
  class_enrollment: {
    classes: {
      name: string;
      programs: {
        name: string;
      };
    };
  };
}

const StudentGrades = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');

  useEffect(() => {
    if (user) {
      fetchGrades();
    }
  }, [user]);

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          class_enrollment:class_enrollments!inner(
            classes!inner(
              name,
              programs!inner(name)
            )
          )
        `)
        .eq('class_enrollment.student_id', user?.id)
        .order('date_recorded', { ascending: false });

      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grades.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradesByQuarter = (quarter: string) => {
    return grades.filter(grade => grade.quarter === quarter);
  };

  const calculateQuarterAverage = (quarter: string) => {
    const quarterGrades = getGradesByQuarter(quarter);
    if (quarterGrades.length === 0) return 0;
    
    const total = quarterGrades.reduce((sum, grade) => sum + (grade.percentage || 0), 0);
    return Math.round(total / quarterGrades.length);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

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
        {quarters.map((quarter) => {
          const average = calculateQuarterAverage(quarter);
          const gradeCount = getGradesByQuarter(quarter).length;
          
          return (
            <Card key={quarter} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{quarter} Average</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{average}%</p>
                      <Badge className={getGradeColor(average)}>
                        {getGradeLetter(average)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {gradeCount} assignment{gradeCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {average >= 90 && <Award className="h-8 w-8 text-yellow-500" />}
                    {average >= 80 && average < 90 && <TrendingUp className="h-8 w-8 text-blue-500" />}
                    {average < 80 && <BookOpen className="h-8 w-8 text-muted-foreground" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={selectedQuarter} onValueChange={setSelectedQuarter}>
        <TabsList className="grid w-full grid-cols-4">
          {quarters.map((quarter) => (
            <TabsTrigger key={quarter} value={quarter}>
              {quarter}
            </TabsTrigger>
          ))}
        </TabsList>

        {quarters.map((quarter) => (
          <TabsContent key={quarter} value={quarter} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Grades for {quarter}</h3>
              <Badge variant="outline">
                Average: {calculateQuarterAverage(quarter)}%
              </Badge>
            </div>

            {getGradesByQuarter(quarter).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Grades Yet</h3>
                  <p className="text-muted-foreground">
                    Grades for {quarter} will appear here when they become available.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {getGradesByQuarter(quarter).map((grade) => (
                  <Card key={grade.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{grade.assignment_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {grade.grade_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {grade.class_enrollment?.classes?.programs?.name} - {grade.class_enrollment?.classes?.name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(grade.date_recorded).toLocaleDateString()}</span>
                            </div>
                            <span>{grade.score}/{grade.max_score} points</span>
                          </div>
                          {grade.notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              Note: {grade.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold mb-1">
                            {Math.round(grade.percentage)}%
                          </div>
                          <Badge className={getGradeColor(grade.percentage)}>
                            {getGradeLetter(grade.percentage)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default StudentGrades;