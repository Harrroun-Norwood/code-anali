import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Save, X, FileText, BarChart, Send } from 'lucide-react';

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
  student_name: string;
  student_id: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  program_name: string;
}

const GradeManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeacherClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
      fetchClassGrades();
    }
  }, [selectedClass]);

  const fetchTeacherClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          programs(name)
        `)
        .eq('teacher_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      const formattedClasses = (data || []).map(cls => ({
        id: cls.id,
        name: cls.name,
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

  const fetchClassStudents = async () => {
    if (!selectedClass) return;

    try {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active');

      if (error) throw error;

      // Get student profiles separately
      const studentIds = (data || []).map(enrollment => enrollment.student_id);
      
      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      const formattedStudents = studentIds.map(studentId => {
        const profile = profilesData?.find(p => p.user_id === studentId);
        return {
          id: studentId,
          first_name: profile?.first_name || 'Unknown',
          last_name: profile?.last_name || 'Student',
          email: profile?.email || 'No email'
        };
      });

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students.',
        variant: 'destructive',
      });
    }
  };

  const fetchClassGrades = async () => {
    if (!selectedClass) return;

    try {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          class_enrollments(student_id, class_id)
        `)
        .order('date_recorded', { ascending: false });

      if (error) throw error;

      // Filter grades for the selected class and get student profiles
      const classGrades = (data || []).filter(grade => 
        grade.class_enrollments && grade.class_enrollments.class_id === selectedClass
      );

      if (classGrades.length === 0) {
        setGrades([]);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(classGrades.map(grade => 
        grade.class_enrollments?.student_id
      ))].filter(Boolean);

      // Get student profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      const formattedGrades = classGrades.map(grade => {
        const profile = profilesData?.find(p => p.user_id === grade.class_enrollments?.student_id);
        return {
          ...grade,
          student_name: profile
            ? `${profile.first_name} ${profile.last_name}`
            : 'Unknown Student',
          student_id: grade.class_enrollments?.student_id || ''
        };
      });

      setGrades(formattedGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grades.',
        variant: 'destructive',
      });
    }
  };

  const sendGradesToStudents = async () => {
    if (!selectedClass) {
      toast({
        title: 'No Class Selected',
        description: 'Please select a class first.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get current quarter grades for all students in the class
      const currentQuarter = getCurrentQuarter();
      const quarterGrades: { [studentId: string]: number } = {};
      
      // Calculate average grades per student for current quarter
      students.forEach(student => {
        const studentAverage = calculateStudentAverage(student.id, currentQuarter);
        quarterGrades[student.id] = studentAverage;
      });

      // Get student profiles with email addresses
      const studentIds = students.map(s => s.id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      // Send grade notifications to each student
      const notifications = profilesData?.map(profile => ({
        user_id: profile.user_id,
        email_address: profile.email,
        type: 'email',
        notification_type: 'grade_notification',
        message: `Your ${currentQuarter} grades are now available! Your current average is ${quarterGrades[profile.user_id]}%. Check your student dashboard to view detailed grades.`,
        status: 'pending'
      })) || [];

      const { error: notificationError } = await supabase
        .from('notification_log')
        .insert(notifications);

      if (notificationError) throw notificationError;

      toast({
        title: 'Grades Sent Successfully',
        description: `Sent grade notifications to ${notifications.length} students.`,
      });

    } catch (error) {
      console.error('Error sending grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to send grades to students.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentQuarter = () => {
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 6 && currentMonth <= 8) return 'Q1';
    if (currentMonth >= 9 && currentMonth <= 11) return 'Q2';
    if (currentMonth >= 12 || currentMonth <= 2) return 'Q3';
    return 'Q4';
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800';
    if (percentage >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const calculateStudentAverage = (studentId: string, quarter: string) => {
    const studentGrades = grades.filter(g => g.student_id === studentId && g.quarter === quarter);
    if (studentGrades.length === 0) return 0;
    
    const total = studentGrades.reduce((sum, grade) => sum + grade.percentage, 0);
    return Math.round(total / studentGrades.length);
  };

  return (
    <div className="space-y-6">
      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose a class to manage grades</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} - {cls.program_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClass && (
        <>
          {/* Grade Overview */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Grade Management</h2>
            <Button onClick={sendGradesToStudents} disabled={loading}>
              <FileText className="w-4 h-4 mr-2" />
              Send Grades to Students
            </Button>
          </div>
          {/* Student Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Student Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map(student => (
                  <div key={student.id} className="p-4 border rounded-lg">
                    <h3 className="font-semibold">{student.first_name} {student.last_name}</h3>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
                        const average = calculateStudentAverage(student.id, quarter);
                        return (
                          <div key={quarter} className="text-center">
                            <div className="text-xs text-muted-foreground">{quarter}</div>
                            <Badge className={getGradeColor(average)}>
                              {average}%
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Grades List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Grades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {grades.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No grades recorded yet. Add your first grade above.
                  </p>
                ) : (
                  grades.map(grade => (
                    <div key={grade.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{grade.assignment_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {grade.student_name} • {grade.grade_type} • {grade.quarter}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Recorded: {new Date(grade.date_recorded).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getGradeColor(grade.percentage)}>
                          {grade.score}/{grade.max_score} ({grade.percentage.toFixed(1)}%)
                        </Badge>
                        {grade.notes && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-32 truncate">
                            {grade.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default GradeManagement;