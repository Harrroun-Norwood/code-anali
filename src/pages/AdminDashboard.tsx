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
  AlertCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import UserManagement from '@/components/UserManagement';
import ReportCardManagement from '@/components/ReportCardManagement';

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

interface Consultation {
  id: string;
  applicant_name: string;
  applicant_email: string;
  preferred_date: string;
  status: string;
  program_interest: string;
  created_at: string;
}

interface BillingRecord {
  id: string;
  student_id: string;
  enrollment_id: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: string;
  payment_method?: string;
  created_at: string;
  student_name: string;
  grade_section?: string;
}

interface DocumentRequest {
  id: string;
  student_id: string;
  student_name: string;
  grade_section?: string;
  document_type: string;
  request_date: string;
  status: string;
  notes?: string;
  completion_date?: string;
  pickup_date?: string;
}

interface Class {
  id: string;
  name: string;
  program_id: string;
  teacher_id: string;
  room?: string;
  schedule?: string;
  semester: string;
  academic_year: string;
  max_students?: number;
  is_active: boolean;
  created_at: string;
  program_name?: string;
  teacher_name?: string;
  student_count?: number;
}

interface Program {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface Teacher {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Student {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
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
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    enrollmentId: string;
    action: 'approve' | 'reject';
    studentName: string;
  }>({
    isOpen: false,
    enrollmentId: '',
    action: 'approve',
    studentName: ''
  });

  const [enrollmentDetailsModal, setEnrollmentDetailsModal] = useState<{
    isOpen: boolean;
    enrollment: Enrollment | null;
  }>({
    isOpen: false,
    enrollment: null
  });

  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '',
    program_id: '',
    teacher_id: '',
    room: '',
    schedule: '',
    semester: '',
    academic_year: '2024-2025',
    max_students: 30
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
      setConsultations(consultationsData || []);

      // Fetch billing data with student names
      const { data: billingData, error: billingError } = await supabase
        .from('billing')
        .select(`
          *,
          profiles:student_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (billingError) throw billingError;
      
      const enrichedBilling = (billingData || []).map((billing: any) => ({
        ...billing,
        student_name: billing.profiles ? 
          `${billing.profiles.first_name} ${billing.profiles.last_name}` : 
          'Unknown Student',
        grade_section: 'N/A' // Will be populated when we have enrollment data
      }));
      setBillingRecords(enrichedBilling);

      // Fetch document requests
      const { data: documentRequestsData, error: documentRequestsError } = await supabase
        .from('document_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (documentRequestsError) throw documentRequestsError;
      setDocumentRequests(documentRequestsData || []);

      // Fetch classes with program and teacher info
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          programs(name)
        `)
        .order('created_at', { ascending: false });

      if (classesError) throw classesError;

      // Get teacher info and student counts for each class
      const classesWithCounts = await Promise.all((classesData || []).map(async (classItem) => {
        // Get teacher info
        const { data: teacherData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', classItem.teacher_id)
          .single();

        // Get student count
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact' })
          .eq('class_id', classItem.id)
          .eq('status', 'active');

        return {
          ...classItem,
          program_name: classItem.programs?.name || 'Unknown Program',
          teacher_name: teacherData ? 
            `${teacherData.first_name} ${teacherData.last_name}` : 
            'Unassigned',
          student_count: count || 0
        };
      }));
      setClasses(classesWithCounts);

      // Fetch programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name');

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('first_name');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Fetch students for class enrollment
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('first_name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Calculate dashboard stats
      const totalStudents = usersData?.filter(u => u.role === 'student' && u.is_active).length || 0;
      const pendingEnrollments = enrichedEnrollments.filter(e => e.enrollment_status === 'pending').length;
      const bookedPreEnrollees = consultationsData?.filter(c => c.status === 'pending').length || 0;
      
      // Calculate real monthly revenue from billing data
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = (billingData || [])
        .filter(bill => {
          const paymentDate = bill.payment_date ? new Date(bill.payment_date) : null;
          return paymentDate && 
                 paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear &&
                 bill.status === 'paid';
        })
        .reduce((total, bill) => total + (Number(bill.amount) || 0), 0);
      
      const totalUsers = usersData?.length || 0;
      const activeUsers = usersData?.filter(u => u.is_active).length || 0;
      const inactiveUsers = totalUsers - activeUsers;
      const admins = usersData?.filter(u => u.role === 'super_admin' || u.role === 'registrar').length || 0;

      setStats({
        totalStudents,
        pendingEnrollments,
        bookedPreEnrollees,
        monthlyRevenue,
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

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `User ${!isActive ? 'activated' : 'deactivated'} successfully.`,
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status.',
        variant: 'destructive',
      });
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

  const handleConfirmAction = () => {
    updateEnrollmentStatus(confirmationDialog.enrollmentId, confirmationDialog.action === 'approve' ? 'approved' : 'rejected');
    setConfirmationDialog({ isOpen: false, enrollmentId: '', action: 'approve', studentName: '' });
  };

  const openConfirmationDialog = (enrollmentId: string, action: 'approve' | 'reject', studentName: string) => {
    setConfirmationDialog({
      isOpen: true,
      enrollmentId,
      action,
      studentName
    });
  };

  const fetchEnrollmentDetails = async (enrollmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          profiles!enrollments_student_id_fkey(first_name, last_name),
          programs(name, price)
        `)
        .eq('id', enrollmentId)
        .single();

      if (error) throw error;

      const enrichedEnrollment = {
        ...data,
        student_name: data.profiles ? 
          `${data.profiles.first_name} ${data.profiles.last_name}` : 
          'Unknown Student',
        program_name: data.programs?.name || 'Unknown Program'
      };

      setEnrollmentDetailsModal({
        isOpen: true,
        enrollment: enrichedEnrollment
      });
    } catch (error) {
      console.error('Error fetching enrollment details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enrollment details.',
        variant: 'destructive',
      });
    }
  };

  const updateConsultationStatus = async (consultationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status })
        .eq('id', consultationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Consultation status updated to ${status}.`,
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update consultation status.',
        variant: 'destructive',
      });
    }
  };

  const createClass = async () => {
    try {
      const { error } = await supabase
        .from('classes')
        .insert([newClass]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class created successfully.',
      });

      setIsCreateClassOpen(false);
      setNewClass({
        name: '',
        program_id: '',
        teacher_id: '',
        room: '',
        schedule: '',
        semester: '',
        academic_year: '2024-2025',
        max_students: 30
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Error',
        description: 'Failed to create class.',
        variant: 'destructive',
      });
    }
  };

  const toggleClassStatus = async (classId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: !isActive })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Class ${!isActive ? 'activated' : 'deactivated'} successfully.`,
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error updating class status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update class status.',
        variant: 'destructive',
      });
    }
  };

  const enrollStudentInClass = async (classId: string, studentId: string) => {
    try {
      // Check if student has approved enrollment status
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('student_id, enrollment_status')
        .eq('student_id', studentId)
        .eq('enrollment_status', 'approved')
        .single();

      if (enrollmentError || !enrollmentData) {
        toast({
          title: 'Enrollment Not Approved',
          description: 'Student does not have approved enrollment status. Only approved students can be enrolled in classes.',
          variant: 'destructive',
        });
        return;
      }

      // Check if student is already enrolled
      const { data: existing } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .single();

      if (existing) {
        toast({
          title: 'Info',
          description: 'Student is already enrolled in this class.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('class_enrollments')
        .insert([{
          class_id: classId,
          student_id: studentId,
          status: 'active'
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student enrolled in class successfully.',
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll student in class.',
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

  if (!isRole('super_admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive management system for ANALI School Portal
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
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
                  <p className="text-2xl font-bold">{stats.pendingEnrollments}</p>
                  <p className="text-xs text-yellow-600">Requires attention</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Booked Pre-Enrollees</p>
                  <p className="text-2xl font-bold">{stats.bookedPreEnrollees}</p>
                  <p className="text-xs text-green-600">Requires attention</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue (Monthly)</p>
                  <p className="text-2xl font-bold">₱{stats.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+8% from last month</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Overview</TabsTrigger>
            <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Report Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Recent Activity Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Enrollments</CardTitle>
                  <CardDescription>Latest student enrollment applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enrollments.slice(0, 5).map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{enrollment.student_name}</p>
                            <p className="text-xs text-muted-foreground">{enrollment.program_name}</p>
                          </div>
                        </div>
                        <Badge variant={
                          enrollment.enrollment_status === 'pending' ? 'outline' :
                          enrollment.enrollment_status === 'approved' ? 'default' : 'destructive'
                        }>
                          {enrollment.enrollment_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Module Overview</CardTitle>
                  <CardDescription>System performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Classes</h4>
                        <span className="text-sm text-green-600">
                          {classes.length > 0 ? 
                            Math.round((classes.filter(c => c.is_active).length / classes.length) * 100) : 0}% active
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{classes.length}</p>
                      <p className="text-xs text-muted-foreground">Total classes created</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${classes.length > 0 ? 
                              Math.round((classes.filter(c => c.is_active).length / classes.length) * 100) : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Billing & Payments</h4>
                        <span className="text-sm text-green-600">
                          {billingRecords.length > 0 ? 
                            Math.round((billingRecords.filter(b => b.status === 'paid').length / billingRecords.length) * 100) : 0}% success
                        </span>
                      </div>
                      <p className="text-2xl font-bold">₱{billingRecords.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total revenue collected</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${billingRecords.length > 0 ? 
                              Math.round((billingRecords.filter(b => b.status === 'paid').length / billingRecords.length) * 100) : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="enrollment" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Enrollment Overview</h2>
              
              {/* Enrollment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Enrolled Students</p>
                        <p className="text-2xl font-bold">{enrollments.filter(e => e.enrollment_status === 'approved').length}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending Enrollments</p>
                        <p className="text-2xl font-bold">{stats.pendingEnrollments}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Enrollment Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Enrolled Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {enrollments.filter(e => e.enrollment_status === 'approved').slice(0, 5).map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{enrollment.student_name}</p>
                          <p className="text-sm text-muted-foreground">{enrollment.program_name}</p>
                        </div>
                        <Badge variant="default">Enrolled</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Enrollments</CardTitle>
                </CardHeader>
                <CardContent>
                      <div className="space-y-3">
                        {enrollments.filter(e => e.enrollment_status === 'pending').map((enrollment) => (
                          <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">{enrollment.student_name}</p>
                              <p className="text-sm text-muted-foreground">{enrollment.program_name}</p>
                            </div>
                             <div className="flex space-x-2">
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => fetchEnrollmentDetails(enrollment.id)}
                               >
                                 <Eye className="w-4 h-4 mr-1" />
                                 View Details
                               </Button>
                               <Button
                                 size="sm"
                                 onClick={() => openConfirmationDialog(enrollment.id, 'approve', enrollment.student_name)}
                               >
                                 Approve
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => openConfirmationDialog(enrollment.id, 'reject', enrollment.student_name)}
                               >
                                 Reject
                               </Button>
                             </div>
                          </div>
                        ))}
                      </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Billing Overview</h2>
              
              {/* Billing Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold">
                          ₱{billingRecords
                            .filter(b => b.status === 'paid')
                            .reduce((total, b) => total + (Number(b.amount) || 0), 0)
                            .toLocaleString()}
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
                        <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                        <p className="text-2xl font-bold">
                          ₱{billingRecords
                            .filter(b => b.status === 'pending')
                            .reduce((total, b) => total + (Number(b.amount) || 0), 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Overdue Amount</p>
                        <p className="text-2xl font-bold">
                          ₱{billingRecords
                            .filter(b => b.status === 'overdue' || (b.status === 'pending' && new Date(b.due_date) < new Date()))
                            .reduce((total, b) => total + (Number(b.amount) || 0), 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Dynamic Billing List */}
            <Card>
              <CardHeader>
                <CardTitle>Student Billing List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <span>Student Name</span>
                    <span>Grade & Section</span>
                    <span>Due Date</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  
                  {billingRecords.slice(0, 10).map((billing) => (
                    <div key={billing.id} className="grid grid-cols-6 gap-4 items-center py-3 border-b">
                      <span className="font-medium">{billing.student_name}</span>
                      <span className="text-sm text-muted-foreground">{billing.grade_section || 'N/A'}</span>
                      <span className="text-sm">
                        {new Date(billing.due_date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold">₱{Number(billing.amount).toLocaleString()}</span>
                      <Badge 
                        variant={
                          billing.status === 'paid' ? 'default' :
                          billing.status === 'overdue' ? 'destructive' : 'outline'
                        }
                      >
                        {billing.status}
                      </Badge>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {billing.status === 'pending' && (
                          <Button size="sm" variant="outline">
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {billingRecords.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No billing records found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Document Request Overview</h2>
              
              {/* Document Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold">{documentRequests.length}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{documentRequests.filter(d => d.status === 'pending').length}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground">Ready for Pickup</p>
                    <p className="text-2xl font-bold">{documentRequests.filter(d => d.status === 'ready').length}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{documentRequests.filter(d => d.status === 'completed').length}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Dynamic Document Request List */}
            <Card>
              <CardHeader>
                <CardTitle>Request List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <span>Student Name</span>
                    <span>Grade & Section</span>
                    <span>Requested Document</span>
                    <span>Request Date</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>
                  
                  {documentRequests.slice(0, 10).map((request) => (
                    <div key={request.id} className="grid grid-cols-6 gap-4 items-center py-3 border-b">
                      <span className="font-medium">{request.student_name}</span>
                      <span className="text-sm text-muted-foreground">{request.grade_section || 'N/A'}</span>
                      <span className="text-sm">{request.document_type}</span>
                      <span className="text-sm">
                        {new Date(request.request_date).toLocaleDateString()}
                      </span>
                      <Badge 
                        variant={
                          request.status === 'completed' ? 'default' :
                          request.status === 'ready' ? 'secondary' :
                          request.status === 'processing' ? 'outline' : 'outline'
                        }
                      >
                        {request.status}
                      </Badge>
                      <div className="flex space-x-2">
                        {request.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('document_requests')
                                  .update({ status: 'ready' })
                                  .eq('id', request.id);
                                
                                if (error) throw error;
                                
                                toast({
                                  title: 'Success',
                                  description: 'Document marked as ready for pickup.',
                                });
                                
                                fetchDashboardData();
                              } catch (error) {
                                console.error('Error updating document status:', error);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update document status.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            Mark as Ready
                          </Button>
                        )}
                        
                        {request.status === 'ready' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('document_requests')
                                  .update({ 
                                    status: 'completed',
                                    completion_date: new Date().toISOString()
                                  })
                                  .eq('id', request.id);
                                
                                if (error) throw error;
                                
                                toast({
                                  title: 'Success',
                                  description: 'Student notified and document marked as completed.',
                                });
                                
                                fetchDashboardData();
                              } catch (error) {
                                console.error('Error completing document request:', error);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to complete document request.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {documentRequests.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No document requests found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportCardManagement />
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Class Management</h2>
                  <p className="text-muted-foreground">Create and manage classes for programs</p>
                </div>
                <Dialog open={isCreateClassOpen} onOpenChange={setIsCreateClassOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Create Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                      <DialogDescription>
                        Set up a new class for a program with an assigned teacher.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label htmlFor="class-name" className="text-sm font-medium">
                          Class Name
                        </label>
                        <input
                          id="class-name"
                          placeholder="e.g., Grade 7 Mathematics"
                          value={newClass.name}
                          onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <label htmlFor="program" className="text-sm font-medium">
                          Program
                        </label>
                        <Select 
                          value={newClass.program_id} 
                          onValueChange={(value) => setNewClass({ ...newClass, program_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select program" />
                          </SelectTrigger>
                          <SelectContent>
                            {programs.map((program) => (
                              <SelectItem key={program.id} value={program.id}>
                                {program.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <label htmlFor="teacher" className="text-sm font-medium">
                          Teacher
                        </label>
                        <Select 
                          value={newClass.teacher_id} 
                          onValueChange={(value) => setNewClass({ ...newClass, teacher_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.user_id} value={teacher.user_id}>
                                {teacher.first_name} {teacher.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label htmlFor="semester" className="text-sm font-medium">
                            Semester
                          </label>
                          <Select 
                            value={newClass.semester} 
                            onValueChange={(value) => setNewClass({ ...newClass, semester: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1st">1st Semester</SelectItem>
                              <SelectItem value="2nd">2nd Semester</SelectItem>
                              <SelectItem value="Summer">Summer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <label htmlFor="academic-year" className="text-sm font-medium">
                            Academic Year
                          </label>
                          <input
                            id="academic-year"
                            placeholder="e.g., 2024-2025"
                            value={newClass.academic_year}
                            onChange={(e) => setNewClass({ ...newClass, academic_year: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label htmlFor="room" className="text-sm font-medium">
                            Room
                          </label>
                          <input
                            id="room"
                            placeholder="e.g., Room 101"
                            value={newClass.room}
                            onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="grid gap-2">
                          <label htmlFor="max-students" className="text-sm font-medium">
                            Max Students
                          </label>
                          <input
                            id="max-students"
                            type="number"
                            placeholder="30"
                            value={newClass.max_students}
                            onChange={(e) => setNewClass({ ...newClass, max_students: parseInt(e.target.value) || 30 })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label htmlFor="schedule" className="text-sm font-medium">
                          Schedule
                        </label>
                        <input
                          id="schedule"
                          placeholder="e.g., MWF 8:00-9:00 AM"
                          value={newClass.schedule}
                          onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateClassOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createClass} disabled={!newClass.name || !newClass.program_id || !newClass.teacher_id || !newClass.semester}>
                        Create Class
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Classes List */}
            <Card>
              <CardHeader>
                <CardTitle>All Classes</CardTitle>
                <CardDescription>
                  Manage existing classes and their student enrollments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classes.map((classItem) => (
                    <div key={classItem.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold">{classItem.name}</h3>
                            <Badge variant={classItem.is_active ? 'default' : 'secondary'}>
                              {classItem.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <p>Program: {classItem.program_name}</p>
                            <p>Teacher: {classItem.teacher_name}</p>
                            <p>Students: {classItem.student_count}/{classItem.max_students || 30}</p>
                            {classItem.room && <p>Room: {classItem.room}</p>}
                            {classItem.schedule && <p>Schedule: {classItem.schedule}</p>}
                            <p>Semester: {classItem.semester} - {classItem.academic_year}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleClassStatus(classItem.id, classItem.is_active)}
                          >
                            {classItem.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          
                          <Select onValueChange={(studentId) => enrollStudentInClass(classItem.id, studentId)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Enroll student" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map((student) => (
                                <SelectItem key={student.user_id} value={student.user_id}>
                                  {student.first_name} {student.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {classes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No classes found. Create your first class to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enrollment Details Modal */}
        <Dialog open={enrollmentDetailsModal.isOpen} onOpenChange={(open) => 
          setEnrollmentDetailsModal({ isOpen: open, enrollment: null })
        }>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enrollment Details</DialogTitle>
              <DialogDescription>
                Complete enrollment information for {enrollmentDetailsModal.enrollment?.student_name}
              </DialogDescription>
            </DialogHeader>
            
            {enrollmentDetailsModal.enrollment && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">First Name</p>
                          <p className="font-medium">{enrollmentDetailsModal.enrollment.profiles?.first_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                          <p className="font-medium">{enrollmentDetailsModal.enrollment.profiles?.last_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Middle Name</p>
                          <p className="font-medium">{enrollmentDetailsModal.enrollment.middle_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Age</p>
                          <p className="font-medium">{enrollmentDetailsModal.enrollment.age || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Gender</p>
                          <p className="font-medium capitalize">{enrollmentDetailsModal.enrollment.gender || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Place of Birth</p>
                          <p className="font-medium">{enrollmentDetailsModal.enrollment.place_of_birth || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.gmail_account || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.telephone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Home Address</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.home_address || 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Emergency Contact */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Emergency Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Parent/Guardian Name</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.parent_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Parent/Guardian Contact</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.parent_contact || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Parent/Guardian Address</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.parent_address || 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Academic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Academic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Program</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.program_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Academic Year</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.academic_year || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Semester</p>
                        <p className="font-medium">{enrollmentDetailsModal.enrollment.semester || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Payment Plan</p>
                          <p className="font-medium capitalize">{enrollmentDetailsModal.enrollment.payment_plan || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Tuition Fee</p>
                          <p className="font-medium">₱{enrollmentDetailsModal.enrollment.tuition_fee?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Information */}
                {enrollmentDetailsModal.enrollment.medical_conditions && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm">
                        {enrollmentDetailsModal.enrollment.medical_conditions}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Status and Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Enrollment Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          enrollmentDetailsModal.enrollment.enrollment_status === 'pending' ? 'outline' :
                          enrollmentDetailsModal.enrollment.enrollment_status === 'approved' ? 'default' : 'destructive'
                        }>
                          {enrollmentDetailsModal.enrollment.enrollment_status}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Applied on {new Date(enrollmentDetailsModal.enrollment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {enrollmentDetailsModal.enrollment.enrollment_status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              openConfirmationDialog(
                                enrollmentDetailsModal.enrollment!.id, 
                                'approve', 
                                enrollmentDetailsModal.enrollment!.student_name
                              );
                              setEnrollmentDetailsModal({ isOpen: false, enrollment: null });
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              openConfirmationDialog(
                                enrollmentDetailsModal.enrollment!.id, 
                                'reject', 
                                enrollmentDetailsModal.enrollment!.student_name
                              );
                              setEnrollmentDetailsModal({ isOpen: false, enrollment: null });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmationDialog.isOpen} onOpenChange={(open) => 
          setConfirmationDialog({ isOpen: open, enrollmentId: '', action: 'approve', studentName: '' })
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmationDialog.action === 'approve' ? 'Approve Enrollment' : 'Reject Enrollment'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {confirmationDialog.action} the enrollment application for{' '}
                <strong>{confirmationDialog.studentName}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                className={confirmationDialog.action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {confirmationDialog.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminDashboard;