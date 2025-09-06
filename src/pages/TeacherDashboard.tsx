import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Calendar,
  GraduationCap
} from 'lucide-react';
import ClassManagement from '@/components/ClassManagement';
import GradeManagement from '@/components/GradeManagement';
import GoogleClassroomImport from '@/components/GoogleClassroomImport';

interface TeacherClass {
  id: string;
  name: string;
  program_name: string;
  student_count: number;
  schedule: string;
  room: string;
  academic_year: string;
  semester: string;
}

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeacherData();
    }
  }, [user]);

  const fetchTeacherData = async () => {
    try {
      // Fetch teacher's classes
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          schedule,
          room,
          academic_year,
          semester,
          programs (name)
        `)
        .eq('teacher_id', user?.id)
        .eq('is_active', true);

      if (classError) throw classError;

      // Get enrollment counts for each class
      const classesWithCounts = await Promise.all(
        (classData || []).map(async (cls) => {
          const { count } = await supabase
            .from('class_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('status', 'active');

          return {
            id: cls.id,
            name: cls.name,
            program_name: cls.programs?.name || 'Unknown Program',
            student_count: count || 0,
            schedule: cls.schedule || 'TBA',
            room: cls.room || 'TBA',
            academic_year: cls.academic_year,
            semester: cls.semester
          };
        })
      );

      setClasses(classesWithCounts);

    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {profile?.first_name || 'Teacher'}!
          </h1>
          <p className="text-muted-foreground">
            Manage your classes, view students, and track progress.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My Classes</p>
                  <p className="text-2xl font-bold">{classes.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">
                    {classes.reduce((acc, cls) => acc + cls.student_count, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Programs</p>
                  <p className="text-2xl font-bold">
                    {new Set(classes.map(c => c.program_name)).size}
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Quarter</p>
                  <p className="text-2xl font-bold">Q1</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            <TabsTrigger value="grades">Grade Management</TabsTrigger>
            <TabsTrigger value="import">Google Classroom</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card key={cls.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <CardDescription>{cls.program_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Students:</span>
                        <Badge variant="secondary">{cls.student_count}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Schedule:</span>
                        <span>{cls.schedule}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Room:</span>
                        <span>{cls.room}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Semester:</span>
                        <span>{cls.semester}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <h2 className="text-xl font-semibold">Class Management</h2>
            <ClassManagement />
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <h2 className="text-xl font-semibold">Grade Management</h2>
            <GradeManagement />
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <h2 className="text-xl font-semibold">Google Classroom Import</h2>
            <GoogleClassroomImport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherDashboard;