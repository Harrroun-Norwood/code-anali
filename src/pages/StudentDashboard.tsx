import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, User, GraduationCap, CreditCard, FolderOpen, BarChart3, Award, Users, Wallet } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import StudentGrades from '@/components/StudentGrades';
import NotificationBell from '@/components/NotificationBell';

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
    price: number;
  };
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
  grade: string | null;
  classes?: {
    name: string;
    teacher_id: string;
    room: string;
    schedule: string;
    semester: string;
    academic_year: string;
    max_students: number;
  };
}

interface BillingInfo {
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
}

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<ClassEnrollment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    totalAmount: 0,
    paidAmount: 0,
    outstandingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
    // keep deps stable to avoid unnecessary refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      // Enrollments + program details
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          *,
          programs:program_id (
            name,
            description,
            category,
            duration,
            price
          )
        `)
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });
      if (enrollmentError) throw enrollmentError;

      // Class enrollments + class details
      const { data: classData, error: classError } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          classes:class_id (
            name,
            teacher_id,
            room,
            schedule,
            semester,
            academic_year,
            max_students
          )
        `)
        .eq('student_id', user!.id)
        .order('enrollment_date', { ascending: false });
      if (classError) throw classError;

      // Announcements
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      if (announcementError) throw announcementError;

      // Billing
      const { data: billingData, error: billingError } = await supabase
        .from('billing')
        .select('amount, status')
        .eq('student_id', user!.id);
      if (billingError) throw billingError;

      // Totals:
      //   - paid = only rows with status === 'paid' (i.e., accountant approved)
      //   - outstanding = sum of pending, pending_approval, overdue
      const allBills = billingData ?? [];
      const paidAmount = allBills
        .filter((b) => b.status === 'paid')
        .reduce((sum, b) => sum + Number(b.amount), 0);

      const outstandingBalance = allBills
        .filter((b) => ['pending', 'pending_approval', 'overdue'].includes((b.status || '').toLowerCase()))
        .reduce((sum, b) => sum + Number(b.amount), 0);

      const totalAmount = allBills.reduce((sum, b) => sum + Number(b.amount), 0);

      setEnrollments(enrollmentData || []);
      setClassEnrollments(classData || []);
      setAnnouncements(announcementData || []);
      setBillingInfo({
        totalAmount,
        paidAmount,
        outstandingBalance,
      });
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
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Hard gate: Only full students can access this dashboard
  if (!loading && profile && !['enrolled', 'student'].includes((profile.application_status || '').toLowerCase())) {
    return <Navigate to="/applicant-dashboard" replace />;
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header + Notifications */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.first_name || 'Student'}!
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your academic progress and activities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              My Grades
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              My Enrollments
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{enrollments.length}</p>
                      <p className="text-muted-foreground text-sm">Active Enrollments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <GraduationCap className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{classEnrollments.length}</p>
                      <p className="text-muted-foreground text-sm">Classes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Wallet className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fmt(billingInfo.paidAmount)}</p>
                      <p className="text-muted-foreground text-sm">Amount Paid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <CreditCard className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fmt(billingInfo.outstandingBalance)}</p>
                      <p className="text-muted-foreground text-sm">Outstanding Balance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Grades</CardTitle>
                  <CardDescription>Your latest grade entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {classEnrollments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No classes enrolled yet
                      </p>
                    ) : (
                      classEnrollments.slice(0, 3).map((enrollment) => (
                        <div key={enrollment.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <p className="font-medium">{enrollment.classes?.name || 'Class'}</p>
                            <p className="text-sm text-muted-foreground">
                              {enrollment.classes?.semester} {enrollment.classes?.academic_year}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {enrollment.grade || 'No Grade'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/billing">
                        <CreditCard className="h-4 w-4 mr-2" />
                        View Billing
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/documents">
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Request Documents
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/profile">
                        <User className="h-4 w-4 mr-2" />
                        Update Profile
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Announcements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {announcements.slice(0, 3).map((announcement) => (
                      <div key={announcement.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{announcement.title}</h3>
                          {announcement.is_featured && (
                            <Badge variant="secondary">Featured</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="grades">
            <StudentGrades />
          </TabsContent>

          <TabsContent value="enrollments">
            <Card>
              <CardHeader>
                <CardTitle>My Enrollments</CardTitle>
                <CardDescription>View your program enrollment details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No enrollments found.</p>
                      <Button className="mt-4" asChild>
                        <Link to="/enrollment">Enroll in a Program</Link>
                      </Button>
                    </div>
                  ) : (
                    enrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-semibold">
                                {enrollment.programs?.name || 'Program'}
                              </h3>
                              <p className="text-muted-foreground">
                                {enrollment.programs?.description}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Category: {enrollment.programs?.category} • Duration: {enrollment.programs?.duration}
                              </p>
                            </div>
                            <Badge className={getStatusColor(enrollment.enrollment_status)}>
                              {enrollment.enrollment_status?.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-foreground">Academic Year</p>
                              <p className="text-muted-foreground">{enrollment.academic_year}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Semester</p>
                              <p className="text-muted-foreground">{enrollment.semester}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Payment Plan</p>
                              <p className="text-muted-foreground capitalize">{enrollment.payment_plan}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Tuition Fee</p>
                              <p className="text-muted-foreground font-semibold">₱{enrollment.tuition_fee?.toLocaleString()}</p>
                            </div>
                          </div>

                          {enrollment.enrollment_status === 'pending' && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                Your enrollment is pending review. You will be notified once it's processed.
                              </p>
                            </div>
                          )}

                          {enrollment.enrollment_status === 'approved' && (
                            <div className="mt-4 flex gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link to="/billing">View Billing</Link>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <Link to="/documents">Request Documents</Link>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>My Classes</CardTitle>
                <CardDescription>View your enrolled classes and schedules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classEnrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No classes enrolled yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Classes will appear here once your enrollment is approved and you're assigned to classes.
                      </p>
                    </div>
                  ) : (
                    classEnrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="border-l-4 border-l-secondary">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-semibold">
                                {enrollment.classes?.name || 'Class'}
                              </h3>
                              <p className="text-muted-foreground">
                                Room: {enrollment.classes?.room || 'TBA'} •
                                Max Students: {enrollment.classes?.max_students || 'N/A'}
                              </p>
                            </div>
                            <Badge
                              className={
                                enrollment.status === 'active'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }
                            >
                              {enrollment.status?.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-foreground">Schedule</p>
                              <p className="text-muted-foreground">{enrollment.classes?.schedule || 'TBA'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Academic Period</p>
                              <p className="text-muted-foreground">
                                {enrollment.classes?.semester} {enrollment.classes?.academic_year}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Current Grade</p>
                              <Badge variant={enrollment.grade ? 'default' : 'outline'}>
                                {enrollment.grade || 'No Grade Yet'}
                              </Badge>
                            </div>
                          </div>

                          {enrollment.status === 'active' && (
                            <div className="mt-4">
                              <Button size="sm" variant="outline">
                                View Details
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
