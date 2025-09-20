import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, GraduationCap } from 'lucide-react';

interface ReportCard {
  id: string;
  student_id: string;
  class_id: string;
  quarter: string;
  semester: string;
  academic_year: string;
  general_average: number;
  status: string;
  generated_date?: string;
  released_date?: string;
  notes?: string;
  classes?: {
    name: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface Grade {
  id: string;
  assignment_name: string;
  grade_type: string;
  quarter: string;
  score: number;
  max_score: number;
  percentage: number;
  date_recorded: string;
  class_name?: string; // Added for processed grades
}

const ReportCardSystem = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState('First Quarter');
  const [selectedSemester, setSelectedSemester] = useState('First Semester');
  const [selectedYear, setSelectedYear] = useState('2024-2025');

  useEffect(() => {
    if (user) {
      fetchReportCards();
      fetchGrades();
    }
  }, [user, selectedQuarter, selectedSemester, selectedYear]);

  const fetchReportCards = async () => {
    try {
      let query = supabase
        .from('report_cards')
        .select(`
          *,
          classes!class_id(name),
          student:profiles!student_id(first_name, last_name)
        `)
        .order('generated_date', { ascending: false });

      // Filter based on user role
      if (profile?.role === 'student') {
        query = query.eq('student_id', user.id).eq('status', 'released');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map(card => ({
        ...card,
        profiles: card.student?.[0] || null
      })) || [];

      setReportCards(transformedData as unknown as ReportCard[]);
    } catch (error) {
      console.error('Error fetching report cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report cards.',
        variant: 'destructive',
      });
    }
  };

  const fetchGrades = async () => {
    try {
      // Fetch grades for the current user (if student) or all grades (if admin/teacher)
      let query = supabase
        .from('grades')
        .select(`
          *,
          class_enrollments!inner (
            student_id,
            classes!inner (name)
          )
        `)
        .eq('quarter', selectedQuarter)
        .order('date_recorded', { ascending: false });

      if (profile?.role === 'student') {
        query = query.eq('class_enrollments.student_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Process the data to flatten the nested structure
      const processedGrades = data?.map(grade => ({
        ...grade,
        class_name: grade.class_enrollments?.classes?.name
      })) || [];
      
      setGrades(processedGrades as any);
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

  const calculateGradeAverage = (studentGrades: Grade[]) => {
    if (studentGrades.length === 0) return 0;
    const total = studentGrades.reduce((sum, grade) => sum + (grade.percentage || 0), 0);
    return Math.round(total / studentGrades.length);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'released':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Academic Reports</h2>
          <p className="text-muted-foreground">
            View grades and report cards for academic progress
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="space-y-2">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="First Quarter">First Quarter</SelectItem>
              <SelectItem value="Second Quarter">Second Quarter</SelectItem>
              <SelectItem value="Third Quarter">Third Quarter</SelectItem>
              <SelectItem value="Fourth Quarter">Fourth Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="First Semester">First Semester</SelectItem>
              <SelectItem value="Second Semester">Second Semester</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-2025">2024-2025</SelectItem>
              <SelectItem value="2023-2024">2023-2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current Grades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Current Grades - {selectedQuarter}
          </CardTitle>
          <CardDescription>
            Your academic performance for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No grades available for this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {grades.map((grade) => (
                  <div key={grade.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{grade.assignment_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {grade.grade_type} • {grade.class_name || 'Class'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(grade.date_recorded).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getGradeColor(grade.percentage)}`}>
                        {grade.percentage}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {grade.score}/{grade.max_score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Average */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Quarter Average</span>
                  <span className={`text-xl font-bold ${getGradeColor(calculateGradeAverage(grades))}`}>
                    {calculateGradeAverage(grades)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Cards
          </CardTitle>
          <CardDescription>
            Official academic reports and transcripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportCards.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No report cards available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportCards.map((reportCard) => (
                <div key={reportCard.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">
                      {reportCard.quarter} - {reportCard.semester}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {reportCard.academic_year} • {reportCard.classes?.name}
                    </p>
                    {reportCard.profiles && (
                      <p className="text-sm text-muted-foreground">
                        {reportCard.profiles.first_name} {reportCard.profiles.last_name}
                      </p>
                    )}
                    {reportCard.released_date && (
                      <p className="text-xs text-muted-foreground">
                        Released: {new Date(reportCard.released_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getGradeColor(reportCard.general_average)}`}>
                        {reportCard.general_average}%
                      </p>
                      <Badge className={getStatusColor(reportCard.status)}>
                        {reportCard.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {reportCard.status === 'released' && (
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportCardSystem;