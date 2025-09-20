import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  FileText, 
  GraduationCap, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import EnrollmentManagement from '@/components/EnrollmentManagement';
import ClassManagementForRegistrar from '@/components/ClassManagementForRegistrar';
import EnhancedDocumentGenerator from '@/components/EnhancedDocumentGenerator';
import ReportCardSystem from '@/components/ReportCardSystem';

interface RegistrarStats {
  totalEnrollments: number;
  pendingEnrollments: number;
  approvedEnrollments: number;
  rejectedEnrollments: number;
  totalStudents: number;
  activePrograms: number;
  consultationBookings: number;
  documentRequests: number;
}

const RegistrarDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<RegistrarStats>({
    totalEnrollments: 0,
    pendingEnrollments: 0,
    approvedEnrollments: 0,
    rejectedEnrollments: 0,
    totalStudents: 0,
    activePrograms: 0,
    consultationBookings: 0,
    documentRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch enrollments
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*');

      if (enrollmentError) throw enrollmentError;

      const totalEnrollments = enrollments?.length || 0;
      const pendingEnrollments = enrollments?.filter(e => e.enrollment_status === 'pending').length || 0;
      const approvedEnrollments = enrollments?.filter(e => e.enrollment_status === 'approved').length || 0;
      const rejectedEnrollments = enrollments?.filter(e => e.enrollment_status === 'rejected').length || 0;
      
      // Fetch students count
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('is_active', true);

      // Fetch active programs
      const { count: activePrograms } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch consultations
      const { count: consultationBookings } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true });

      // Fetch document requests
      const { count: documentRequests } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalEnrollments,
        pendingEnrollments,
        approvedEnrollments, 
        rejectedEnrollments,
        totalStudents: totalStudents || 0,
        activePrograms: activePrograms || 0,
        consultationBookings: consultationBookings || 0,
        documentRequests: documentRequests || 0
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
            Welcome, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            Manage enrollments, process documents, and oversee academic operations.
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
                  <p className="text-sm font-medium text-muted-foreground">Active Programs</p>
                  <p className="text-2xl font-bold">{stats.activePrograms}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Document Requests</p>
                  <p className="text-2xl font-bold">{stats.documentRequests}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approvals">Enrollments</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="reports">Report Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Enrollment Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <Badge variant="secondary">{stats.pendingEnrollments}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Approved</span>
                      <Badge className="bg-green-100 text-green-800">{stats.approvedEnrollments}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rejected</span>
                      <Badge variant="destructive">{stats.rejectedEnrollments}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>New enrollment submitted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Document request processed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Consultation scheduled</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Pending Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Enrollment Reviews</span>
                      <Badge variant="secondary">{stats.pendingEnrollments}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Document Processing</span>
                      <Badge variant="secondary">{stats.documentRequests}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Consultation Bookings</span>
                      <Badge variant="secondary">{stats.consultationBookings}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <h2 className="text-xl font-semibold">Enrollment Management</h2>
            <p className="text-muted-foreground mb-4">
              Approve or reject student enrollments. Rejected enrollments won't appear for super admin review.
            </p>
            <EnrollmentManagement />
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <h2 className="text-xl font-semibold">Class Management</h2>
            <p className="text-muted-foreground mb-4">
              Create classes for teachers and assign students based on their enrollments.
            </p>
            <ClassManagementForRegistrar />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <EnhancedDocumentGenerator />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <h2 className="text-xl font-semibold">Report Card System</h2>
            <p className="text-muted-foreground mb-4">
              View and manage student report cards and academic reports.
            </p>
            <ReportCardSystem />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RegistrarDashboard;