import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Calendar, Clock, User, GraduationCap, Bell, Lock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import StudentGrades from '@/components/StudentGrades';

interface Enrollment {
  id: string;
  enrollment_status: string;
  academic_year: string;
  semester: string;
  payment_plan: string;
  tuition_fee: number;
  program_id: string;
  programs?: {
    name: string;
    description: string;
    category: string;
    duration: string;
  };
}

interface Consultation {
  id: string;
  status: string;
  preferred_date: string;
  preferred_time: string;
  program_interest: string;
  meeting_link: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_featured: boolean;
}

interface ClassEnrollment {
  id: string;
  class_id: string;
  status: string;
  classes?: {
    name: string;
    schedule?: string;
    room?: string;
    academic_year: string;
    semester: string;
    programs?: {
      name: string;
    };
  };
}

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<ClassEnrollment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          *,
          programs (
            name,
            description,
            category,
            duration
          )
        `)
        .eq('student_id', user?.id);

      if (enrollmentError) throw enrollmentError;
      setEnrollments(enrollmentData || []);

      // Fetch class enrollments
      const { data: classEnrollmentData, error: classEnrollmentError } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          classes (
            *,
            programs (name)
          )
        `)
        .eq('student_id', user?.id)
        .eq('status', 'active');

      if (classEnrollmentError) throw classEnrollmentError;
      setClassEnrollments(classEnrollmentData || []);

      // Fetch consultations
      const { data: consultationData, error: consultationError } = await supabase
        .from('consultations')
        .select('*')
        .eq('applicant_email', user?.email);

      if (consultationError) throw consultationError;
      setConsultations(consultationData || []);

      // Fetch announcements
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (announcementError) throw announcementError;
      setAnnouncements(announcementData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
      case 'cancelled':
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
            Welcome back, {profile?.first_name || 'Student'}!
          </h1>
          <p className="text-muted-foreground">
            Manage your enrollments, track progress, and stay updated with announcements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                  <p className="text-2xl font-bold">{enrollments.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Programs</p>
                  <p className="text-2xl font-bold">
                    {enrollments.filter(e => e.enrollment_status === 'active').length}
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
                  <p className="text-sm font-medium text-muted-foreground">Consultations</p>
                  <p className="text-2xl font-bold">{consultations.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My Classes</p>
                  <p className="text-2xl font-bold">{classEnrollments.length}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/encrypted-billing">
              <CardContent className="p-6 text-center">
                <Lock className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Secure Billing</h3>
                <p className="text-sm text-muted-foreground">Access encrypted payment history</p>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/documents">
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Request Documents</h3>
                <p className="text-sm text-muted-foreground">Official forms and certificates</p>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/profile">
              <CardContent className="p-6 text-center">
                <User className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Manage Profile</h3>
                <p className="text-sm text-muted-foreground">Update personal information</p>
              </CardContent>
            </Link>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="grades">My Grades</TabsTrigger>
            <TabsTrigger value="enrollments">My Enrollments</TabsTrigger>
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            <TabsTrigger value="consultations">Consultations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      {announcement.is_featured && (
                        <Badge variant="secondary">Featured</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{announcement.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <StudentGrades />
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Enrollments</h2>
              <Link to="/programs">
                <Button>Browse Programs</Button>
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Enrollments Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your learning journey by enrolling in one of our programs.
                  </p>
                  <Link to="/programs">
                    <Button>Explore Programs</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {enrollment.programs?.name || 'Program'}
                        </CardTitle>
                        <Badge className={getStatusColor(enrollment.enrollment_status)}>
                          {enrollment.enrollment_status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {enrollment.programs?.category} • {enrollment.programs?.duration}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Academic Year:</span>
                          <span>{enrollment.academic_year}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Semester:</span>
                          <span>{enrollment.semester || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Plan:</span>
                          <span className="capitalize">{enrollment.payment_plan}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Tuition Fee:</span>
                          <span>₱{enrollment.tuition_fee?.toLocaleString() || 'TBD'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Classes</h2>
            </div>

            {classEnrollments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Classes Enrolled</h3>
                  <p className="text-muted-foreground mb-4">
                    You are not currently enrolled in any classes.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classEnrollments.map((classEnrollment) => (
                  <Card key={classEnrollment.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {classEnrollment.classes?.name || 'Unknown Class'}
                      </CardTitle>
                      <CardDescription>
                        {classEnrollment.classes?.programs?.name || 'Unknown Program'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Schedule:</span>
                          <span>{classEnrollment.classes?.schedule || 'TBA'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Room:</span>
                          <span>{classEnrollment.classes?.room || 'TBA'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Academic Year:</span>
                          <span>{classEnrollment.classes?.academic_year}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Semester:</span>
                          <span>{classEnrollment.classes?.semester}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="consultations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Consultations</h2>
              <Link to="/book-consultation">
                <Button>Book New Consultation</Button>
              </Link>
            </div>

            {consultations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Consultations Scheduled</h3>
                  <p className="text-muted-foreground mb-4">
                    Book a free consultation to learn more about our programs.
                  </p>
                  <Link to="/book-consultation">
                    <Button>Book Consultation</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <Card key={consultation.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {consultation.program_interest || 'General Consultation'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(consultation.preferred_date).toLocaleDateString()}</span>
                            <Clock className="h-4 w-4 ml-2" />
                            <span>{consultation.preferred_time}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(consultation.status)}>
                          {consultation.status}
                        </Badge>
                      </div>
                      {consultation.meeting_link && consultation.status === 'confirmed' && (
                        <div className="mt-4">
                          <Button asChild className="w-full">
                            <a href={consultation.meeting_link} target="_blank" rel="noopener noreferrer">
                              Join Meeting
                            </a>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;