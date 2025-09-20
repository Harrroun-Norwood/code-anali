import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Send, 
  Eye, 
  Calendar, 
  Users,
  GraduationCap,
  CheckCircle,
  Clock
} from 'lucide-react';

interface StudentGrade {
  student_id: string;
  student_name: string;
  class_name: string;
  program_name: string;
  grades: {
    quarter: string;
    average: number;
    subjects: Array<{
      subject: string;
      grade: number;
      remarks: string;
    }>;
  }[];
  final_grade: number;
  general_average: number;
  remarks: string;
}

interface ReportCard {
  id: string;
  student_id: string;
  student_name: string;
  academic_year: string;
  semester: string;
  quarter: string;
  status: string;
  generated_date: string;
  released_date?: string;
  general_average: number;
}

const ReportCardManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024-2025');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchReportCards();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentGrades();
    }
  }, [selectedClass, selectedQuarter, selectedAcademicYear]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          academic_year,
          semester,
          programs(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const formattedClasses = (data || []).map(cls => ({
        ...cls,
        program_name: cls.programs?.name || 'Unknown Program'
      }));

      setClasses(formattedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes.',
        variant: 'destructive',
      });
    }
  };

  const fetchStudentGrades = async () => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      // Get class enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollmentsData || enrollmentsData.length === 0) {
        setStudentGrades([]);
        return;
      }

      // Get student profiles
      const studentIds = enrollmentsData.map(e => e.student_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      // Get grades for these students
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          class_enrollments(student_id, class_id)
        `)
        .eq('quarter', selectedQuarter);

      if (gradesError) throw gradesError;

      // Process and format the data
      const processedGrades = studentIds.map(studentId => {
        const profile = profilesData?.find(p => p.user_id === studentId);
        const studentGradesData = (gradesData || []).filter(grade => 
          grade.class_enrollments?.student_id === studentId &&
          grade.class_enrollments?.class_id === selectedClass
        );

        // Calculate averages
        const quarterAverage = studentGradesData.length > 0 
          ? studentGradesData.reduce((sum, grade) => sum + (grade.percentage || 0), 0) / studentGradesData.length
          : 0;

        // Group subjects (for demo purposes, we'll use grade types as subjects)
        const subjects = studentGradesData.map(grade => ({
          subject: grade.assignment_name || 'General',
          grade: grade.percentage || 0,
          remarks: grade.percentage >= 75 ? 'Passed' : 'Failed'
        }));

        return {
          student_id: studentId,
          student_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
          class_name: classes.find(c => c.id === selectedClass)?.name || 'Unknown Class',
          program_name: classes.find(c => c.id === selectedClass)?.program_name || 'Unknown Program',
          grades: [{
            quarter: selectedQuarter,
            average: Math.round(quarterAverage),
            subjects: subjects
          }],
          final_grade: Math.round(quarterAverage),
          general_average: Math.round(quarterAverage),
          remarks: quarterAverage >= 75 ? 'Passed' : 'Failed'
        };
      });

      setStudentGrades(processedGrades);
    } catch (error) {
      console.error('Error fetching student grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student grades.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReportCards = async () => {
    try {
      // Get report cards with student names by joining profiles
      const { data, error } = await supabase
        .from('report_cards')
        .select(`
          id,
          student_id,
          class_id,
          academic_year,
          semester,
          quarter,
          general_average,
          status,
          generated_date,
          released_date
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get student names separately
      if (data && data.length > 0) {
        const studentIds = [...new Set(data.map(card => card.student_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', studentIds);

        if (profilesError) throw profilesError;

        const formattedReportCards = data.map(card => {
          const profile = profiles?.find(p => p.user_id === card.student_id);
          return {
            id: card.id,
            student_id: card.student_id,
            student_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
            academic_year: card.academic_year,
            semester: card.semester,
            quarter: card.quarter,
            status: card.status,
            generated_date: card.generated_date ? new Date(card.generated_date).toISOString().split('T')[0] : '',
            released_date: card.released_date ? new Date(card.released_date).toISOString().split('T')[0] : undefined,
            general_average: parseFloat(card.general_average.toString())
          };
        });

        setReportCards(formattedReportCards);
      } else {
        setReportCards([]);
      }
    } catch (error) {
      console.error('Error fetching report cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report cards.',
        variant: 'destructive',
      });
    }
  };

  const generateReportCard = async (studentId: string) => {
    try {
      const student = studentGrades.find(s => s.student_id === studentId);
      if (!student) {
        toast({
          title: 'Error',
          description: 'Student not found.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('report_cards')
        .insert({
          student_id: studentId,
          class_id: selectedClass,
          academic_year: selectedAcademicYear,
          semester: classes.find(c => c.id === selectedClass)?.semester || 'First Semester',
          quarter: selectedQuarter,
          general_average: student.general_average,
          status: 'generated',
          generated_date: new Date().toISOString(),
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report card generated successfully.',
      });
      
      fetchReportCards();
    } catch (error) {
      console.error('Error generating report card:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report card.',
        variant: 'destructive',
      });
    }
  };

  const releaseReportCard = async (reportCardId: string) => {
    try {
      const { error } = await supabase
        .from('report_cards')
        .update({
          status: 'released',
          released_date: new Date().toISOString()
        })
        .eq('id', reportCardId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report card released to student.',
      });
      
      fetchReportCards();
    } catch (error) {
      console.error('Error releasing report card:', error);
      toast({
        title: 'Error',
        description: 'Failed to release report card.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Report Card Management</h2>
          <p className="text-muted-foreground">Generate and release student report cards</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Report Cards</TabsTrigger>
          <TabsTrigger value="manage">Manage Report Cards</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Select Parameters</CardTitle>
              <CardDescription>Choose class and grading period to generate report cards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} - {cls.program_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Academic Year</label>
                  <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-2025">2024-2025</SelectItem>
                      <SelectItem value="2023-2024">2023-2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quarter</label>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Quarter 1</SelectItem>
                      <SelectItem value="Q2">Quarter 2</SelectItem>
                      <SelectItem value="Q3">Quarter 3</SelectItem>
                      <SelectItem value="Q4">Quarter 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Button 
                    onClick={fetchStudentGrades} 
                    disabled={!selectedClass || loading}
                    className="w-full"
                  >
                    {loading ? 'Loading...' : 'Load Students'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Grades List */}
          {selectedClass && (
            <Card>
              <CardHeader>
                <CardTitle>Student Grades - {selectedQuarter}</CardTitle>
                <CardDescription>
                  Review grades and generate report cards for selected class
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading student grades...</p>
                    </div>
                  ) : studentGrades.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No students found for this class.</p>
                    </div>
                  ) : (
                    studentGrades.map((student) => (
                      <Card key={student.student_id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{student.student_name}</h3>
                              <p className="text-sm text-muted-foreground">{student.class_name} - {student.program_name}</p>
                              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">General Average:</span>
                                  <span className="ml-2 font-semibold">{student.general_average}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Remarks:</span>
                                  <Badge 
                                    className={`ml-2 ${student.general_average >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                  >
                                    {student.remarks}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Subjects:</span>
                                  <span className="ml-2">{student.grades[0]?.subjects.length || 0}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {/* Preview functionality */}}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => generateReportCard(student.student_id)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Generate
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Report Cards</CardTitle>
              <CardDescription>Manage and release generated report cards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportCards.map((reportCard) => (
                  <Card key={reportCard.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{reportCard.student_name}</h3>
                          <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                            <div>Academic Year: {reportCard.academic_year}</div>
                            <div>Semester: {reportCard.semester}</div>
                            <div>Quarter: {reportCard.quarter}</div>
                            <div>General Average: {reportCard.general_average}%</div>
                            <div>Generated: {new Date(reportCard.generated_date).toLocaleDateString()}</div>
                            {reportCard.released_date && (
                              <div>Released: {new Date(reportCard.released_date).toLocaleDateString()}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(reportCard.status)}>
                            {reportCard.status}
                          </Badge>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            {reportCard.status === 'generated' && (
                              <Button
                                size="sm"
                                onClick={() => releaseReportCard(reportCard.id)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Release
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Report Cards</p>
                    <p className="text-2xl font-bold">{reportCards.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Generated</p>
                    <p className="text-2xl font-bold">
                      {reportCards.filter(rc => rc.status === 'generated').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Released</p>
                    <p className="text-2xl font-bold">
                      {reportCards.filter(rc => rc.status === 'released').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Grade</p>
                    <p className="text-2xl font-bold">
                      {reportCards.length > 0 
                        ? Math.round(reportCards.reduce((sum, rc) => sum + rc.general_average, 0) / reportCards.length)
                        : 0}%
                    </p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Card Analytics</CardTitle>
              <CardDescription>Performance overview and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and performance trends will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportCardManagement;