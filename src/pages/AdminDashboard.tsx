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
  DollarSign, 
  UserCheck, 
  GraduationCap,
  Calendar,
  FileText,
  Eye,
  Edit,
  UserX,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  Video
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import UserManagement from '@/components/UserManagement';
import BillingManagement from '@/components/BillingManagement';
import ReportCardManagement from '@/components/ReportCardManagement';
import ConsultationBookingManagement from '@/components/ConsultationBookingManagement';
import { UserArchiveManagement } from '@/components/UserArchiveManagement';

interface DashboardStats {
  totalStudents: number;
  pendingEnrollments: number;
  bookedPreEnrollees: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  contact_number?: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  program_id: string;
  enrollment_status: string;
  created_at: string;
  student_name: string;
  program_name: string;
  // Additional fields for detailed view
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  age?: number;
  gender?: string;
  place_of_birth?: string;
  telephone?: string;
  gmail_account?: string;
  home_address?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_address?: string;
  payment_plan?: string;
  tuition_fee?: number;
  academic_year?: string;
  semester?: string;
  medical_conditions?: string;
  // Nested relations
  profiles?: {
    first_name: string;
    last_name: string;
  };
  programs?: {
    name: string;
    price: number;
  };
}

const AdminDashboard = () => {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    pendingEnrollments: 0,
    bookedPreEnrollees: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    admins: 0
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const [enrollmentDetailsModal, setEnrollmentDetailsModal] = useState<{
    isOpen: boolean;
    enrollment: Enrollment | null;
  }>({
    isOpen: false,
    enrollment: null
  });

  useEffect(() => {
    if (user && isRole('super_admin')) {
      fetchDashboardData();
    }
  }, [user, isRole]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch enrollments with student and program info
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          *,
          profiles!enrollments_student_id_fkey(first_name, last_name),
          programs(name, price)
        `)
        .order('created_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;
      
      const enrichedEnrollments = (enrollmentsData || []).map(enrollment => ({
        ...enrollment,
        student_name: enrollment.profiles ? 
          `${enrollment.profiles.first_name} ${enrollment.profiles.last_name}` : 
          'Unknown Student',
        program_name: enrollment.programs?.name || 'Unknown Program'
      }));
      setEnrollments(enrichedEnrollments);

      // Fetch consultations
      const { data: consultationsData, error: consultationsError } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (consultationsError) throw consultationsError;

      // Calculate dashboard stats
      const totalStudents = usersData?.filter(u => u.role === 'student' && u.is_active).length || 0;
      const pendingEnrollments = enrichedEnrollments.filter(e => e.enrollment_status === 'pending').length;
      const bookedPreEnrollees = consultationsData?.filter(c => c.status === 'pending').length || 0;
      
      const totalUsers = usersData?.length || 0;
      const activeUsers = usersData?.filter(u => u.is_active).length || 0;
      const inactiveUsers = totalUsers - activeUsers;
      const admins = usersData?.filter(u => u.role === 'super_admin' || u.role === 'registrar').length || 0;

      setStats({
        totalStudents,
        pendingEnrollments,
        bookedPreEnrollees,
        monthlyRevenue: 0, // Will be calculated from billing data
        totalUsers,
        activeUsers,
        inactiveUsers,
        admins
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

  const updateEnrollmentStatus = async (enrollmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ enrollment_status: status })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Enrollment status updated to ${status}.`,
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error updating enrollment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update enrollment status.',
        variant: 'destructive',
      });
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
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage users, enrollments, consultations, and system overview.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Enrollments</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingEnrollments}</p>
                </div>
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Consultation Bookings</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.bookedPreEnrollees}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="archives">Archived Users</TabsTrigger>
            <TabsTrigger value="consultations">Consultations</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Users</span>
                      <Badge>{stats.activeUsers}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Inactive Users</span>
                      <Badge variant="secondary">{stats.inactiveUsers}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Administrators</span>
                      <Badge>{stats.admins}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="archives" className="space-y-4">
            <UserArchiveManagement />
          </TabsContent>

          <TabsContent value="consultations" className="space-y-4">
            <ConsultationBookingManagement />
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Management</CardTitle>
                <CardDescription>
                  Review and approve student enrollment applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollments.map((enrollment) => (
                    <Card key={enrollment.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{enrollment.student_name}</h3>
                              <Badge variant={
                                enrollment.enrollment_status === 'pending' ? 'secondary' : 
                                enrollment.enrollment_status === 'approved' ? 'default' :
                                enrollment.enrollment_status === 'rejected' ? 'destructive' : 'outline'
                              }>
                                {enrollment.enrollment_status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                <span>{enrollment.program_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(enrollment.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span>₱{enrollment.tuition_fee?.toLocaleString() || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEnrollmentDetailsModal({
                                    isOpen: true,
                                    enrollment
                                  })}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Enrollment Details</DialogTitle>
                                  <DialogDescription>
                                    Complete enrollment information for {enrollment.student_name}
                                  </DialogDescription>
                                </DialogHeader>
                                {enrollmentDetailsModal.enrollment && (
                                  <div className="space-y-6 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <h4 className="font-semibold text-lg">Student Information</h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">First Name:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.first_name || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Last Name:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.last_name || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Middle Name:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.middle_name || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Age:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.age || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Gender:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.gender || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Place of Birth:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.place_of_birth || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <h4 className="font-semibold text-lg">Contact Information</h4>
                                        <div className="space-y-3 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Home Address:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.home_address || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Phone:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.telephone || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Email:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.gmail_account || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <h4 className="font-semibold text-lg">Parent/Guardian Information</h4>
                                        <div className="space-y-3 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Parent Name:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.parent_name || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Parent Contact:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.parent_contact || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Parent Address:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.parent_address || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <h4 className="font-semibold text-lg">Program & Payment</h4>
                                        <div className="space-y-3 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Program:</span>
                                            <p className="font-medium">{enrollment.program_name}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Payment Plan:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.payment_plan || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Tuition Fee:</span>
                                            <p className="font-medium">₱{enrollmentDetailsModal.enrollment.tuition_fee?.toLocaleString() || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Academic Year:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.academic_year || 'N/A'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Semester:</span>
                                            <p className="font-medium">{enrollmentDetailsModal.enrollment.semester || 'N/A'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {enrollmentDetailsModal.enrollment.medical_conditions && (
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-lg">Medical Conditions</h4>
                                        <p className="text-sm bg-muted p-3 rounded-lg">
                                          {enrollmentDetailsModal.enrollment.medical_conditions}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            {enrollment.enrollment_status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateEnrollmentStatus(enrollment.id, 'approved')}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateEnrollmentStatus(enrollment.id, 'rejected')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {enrollments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No enrollment applications yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <BillingManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;