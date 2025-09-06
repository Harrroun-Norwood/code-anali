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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Calendar, Clock, MapPin, Edit, Trash, UserPlus } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  program_id: string;
  program_name: string;
  academic_year: string;
  semester: string;
  room: string;
  schedule: string;
  max_students: number;
  student_count: number;
  is_active: boolean;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  enrollment_status: string;
  enrollment_date: string;
}

interface AvailableStudent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Program {
  id: string;
  name: string;
}

const ClassManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [newClass, setNewClass] = useState({
    name: '',
    program_id: '',
    academic_year: '2024-2025',
    semester: 'First Semester',
    room: '',
    schedule: '',
    max_students: 30
  });

  useEffect(() => {
    fetchTeacherClasses();
    fetchPrograms();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
      fetchAvailableStudents();
    }
  }, [selectedClass]);

  const fetchTeacherClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          programs(name)
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get student counts for each class
      const classesWithCounts = await Promise.all(
        (data || []).map(async (cls) => {
          const { count } = await supabase
            .from('class_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('status', 'active');

          return {
            ...cls,
            program_name: cls.programs?.name || 'Unknown Program',
            student_count: count || 0
          };
        })
      );

      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes.',
        variant: 'destructive',
      });
    }
  };

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const fetchClassStudents = async () => {
    if (!selectedClass) return;

    console.log('Fetching students for class:', selectedClass);
    try {
      // First get enrollment data
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select('student_id, status, enrollment_date')
        .eq('class_id', selectedClass)
        .order('enrollment_date', { ascending: false });

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError);
        throw enrollmentError;
      }

      console.log('Found enrollments:', enrollmentData?.length || 0);

      if (!enrollmentData || enrollmentData.length === 0) {
        setClassStudents([]);
        return;
      }

      // Get student profiles separately with proper error handling
      const studentIds = enrollmentData.map(enrollment => enrollment.student_id);
      console.log('Fetching profiles for student IDs:', studentIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', studentIds)
        .eq('role', 'student');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue with enrollment data even if profiles fail
      }

      console.log('Found profiles:', profilesData?.length || 0, profilesData);

      // Combine enrollment data with profile data
      const formattedStudents = enrollmentData.map(enrollment => {
        const profile = profilesData?.find(p => p.user_id === enrollment.student_id);
        return {
          id: enrollment.student_id,
          first_name: profile?.first_name || 'Unknown',
          last_name: profile?.last_name || 'Student',
          email: profile?.email || 'No email available',
          enrollment_status: enrollment.status,
          enrollment_date: enrollment.enrollment_date
        };
      });

      console.log('Final formatted students:', formattedStudents);
      setClassStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching class students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load class students.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.name || !newClass.program_id) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          program_id: newClass.program_id,
          teacher_id: user?.id,
          academic_year: newClass.academic_year,
          semester: newClass.semester,
          room: newClass.room,
          schedule: newClass.schedule,
          max_students: newClass.max_students
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class created successfully.',
      });

      setIsAddClassOpen(false);
      setNewClass({
        name: '',
        program_id: '',
        academic_year: '2024-2025',
        semester: 'First Semester',
        room: '',
        schedule: '',
        max_students: 30
      });
      fetchTeacherClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Error',
        description: 'Failed to create class.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleClassStatus = async (classId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: !currentStatus })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Class ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      });

      fetchTeacherClasses();
    } catch (error) {
      console.error('Error updating class status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update class status.',
        variant: 'destructive',
      });
    }
  };

  const fetchAvailableStudents = async () => {
    if (!selectedClass) return;

    try {
      // Get students who are already enrolled in this class
      const { data: enrolledStudents, error: enrolledError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', selectedClass);

      if (enrolledError) throw enrolledError;

      const enrolledIds = (enrolledStudents || []).map(e => e.student_id);

      // Get students with approved enrollment status
      const { data: approvedEnrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('enrollment_status', 'approved');

      if (enrollmentsError) throw enrollmentsError;

      const approvedStudentIds = (approvedEnrollments || []).map(e => e.student_id);

      // Get all active student profiles who have approved enrollment status
      const { data: allStudents, error: studentsError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .eq('role', 'student')
        .eq('is_active', true)
        .in('user_id', approvedStudentIds);

      if (studentsError) {
        console.error('Error fetching student profiles:', studentsError);
        setAvailableStudents([]);
        return;
      }

      // Filter out already enrolled students
      const available = (allStudents || []).filter(student => 
        !enrolledIds.includes(student.user_id)
      ).map(student => ({
        id: student.user_id,
        first_name: student.first_name || 'Unknown',
        last_name: student.last_name || 'Student',
        email: student.email
      }));

      setAvailableStudents(available);
    } catch (error) {
      console.error('Error fetching available students:', error);
      setAvailableStudents([]);
    }
  };

  const handleAddStudents = async () => {
    if (!selectedClass || selectedStudentIds.length === 0) {
      toast({
        title: 'No Students Selected',
        description: 'Please select at least one student to enroll.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Check if students have approved enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('student_id, enrollment_status')
        .in('student_id', selectedStudentIds)
        .eq('enrollment_status', 'approved');

      if (enrollmentError) throw enrollmentError;

      const approvedStudentIds = enrollmentData?.map(e => e.student_id) || [];
      const unapprovedStudents = selectedStudentIds.filter(id => !approvedStudentIds.includes(id));

      if (unapprovedStudents.length > 0) {
        toast({
          title: 'Enrollment Not Approved',
          description: `${unapprovedStudents.length} student(s) do not have approved enrollment status. Only approved students can be enrolled in classes.`,
          variant: 'destructive',
        });
        return;
      }

      const enrollments = selectedStudentIds.map(studentId => ({
        class_id: selectedClass,
        student_id: studentId,
        status: 'active'
      }));

      const { error } = await supabase
        .from('class_enrollments')
        .insert(enrollments);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Successfully enrolled ${selectedStudentIds.length} student(s).`,
      });

      setIsAddStudentOpen(false);
      setSelectedStudentIds([]);
      fetchClassStudents();
      fetchAvailableStudents();
    } catch (error) {
      console.error('Error enrolling students:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll students.',
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

  const selectedClassData = classes.find(cls => cls.id === selectedClass);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Class Management</h2>
        <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input 
                  value={newClass.name}
                  onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                  placeholder="e.g., Grade 10 - Section A"
                />
              </div>

              <div className="space-y-2">
                <Label>Program</Label>
                <Select 
                  value={newClass.program_id} 
                  onValueChange={(value) => setNewClass({...newClass, program_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(program => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input 
                    value={newClass.academic_year}
                    onChange={(e) => setNewClass({...newClass, academic_year: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select 
                    value={newClass.semester} 
                    onValueChange={(value) => setNewClass({...newClass, semester: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Semester">First Semester</SelectItem>
                      <SelectItem value="Second Semester">Second Semester</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Input 
                    value={newClass.room}
                    onChange={(e) => setNewClass({...newClass, room: e.target.value})}
                    placeholder="e.g., Room 101"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Students</Label>
                  <Input 
                    type="number"
                    value={newClass.max_students}
                    onChange={(e) => setNewClass({...newClass, max_students: Number(e.target.value)})}
                    min="1"
                    max="50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Schedule</Label>
                <Textarea 
                  value={newClass.schedule}
                  onChange={(e) => setNewClass({...newClass, schedule: e.target.value})}
                  placeholder="e.g., Monday-Friday 8:00 AM - 12:00 PM"
                  rows={2}
                />
              </div>

              <Button onClick={handleCreateClass} disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Class'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>Select a class to manage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {classes.map(cls => (
                <div 
                  key={cls.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedClass === cls.id ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedClass(cls.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm">{cls.name}</h3>
                      <p className="text-xs text-muted-foreground">{cls.program_name}</p>
                      <p className="text-xs text-muted-foreground">{cls.academic_year}</p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={cls.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {cls.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cls.student_count}/{cls.max_students}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Class Details */}
        <div className="lg:col-span-2">
          {selectedClassData ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {selectedClassData.name}
                      <Button
                        variant={selectedClassData.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleClassStatus(selectedClassData.id, selectedClassData.is_active)}
                      >
                        {selectedClassData.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </CardTitle>
                    <CardDescription>{selectedClassData.program_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Academic Year: {selectedClassData.academic_year}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Semester: {selectedClassData.semester}</span>
                        </div>
                        {selectedClassData.room && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Room: {selectedClassData.room}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Students: {selectedClassData.student_count}/{selectedClassData.max_students}
                          </span>
                        </div>
                        {selectedClassData.schedule && (
                          <div>
                            <p className="text-sm font-medium">Schedule:</p>
                            <p className="text-sm text-muted-foreground">{selectedClassData.schedule}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="students" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Class Students ({classStudents.length})
                      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Student
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add Students to {selectedClassData?.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="max-h-96 overflow-y-auto space-y-2">
                              {availableStudents.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                  No available students to enroll.
                                </p>
                              ) : (
                                availableStudents.map(student => (
                                  <div 
                                    key={student.id} 
                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                      selectedStudentIds.includes(student.id) 
                                        ? 'border-primary bg-primary/5' 
                                        : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => {
                                      setSelectedStudentIds(prev => 
                                        prev.includes(student.id)
                                          ? prev.filter(id => id !== student.id)
                                          : [...prev, student.id]
                                      );
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="font-semibold">
                                          {student.first_name} {student.last_name}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={selectedStudentIds.includes(student.id)}
                                        onChange={() => {}}
                                        className="w-4 h-4"
                                      />
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t">
                              <p className="text-sm text-muted-foreground">
                                {selectedStudentIds.length} student(s) selected
                              </p>
                              <div className="space-x-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setIsAddStudentOpen(false);
                                    setSelectedStudentIds([]);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleAddStudents} 
                                  disabled={loading || selectedStudentIds.length === 0}
                                >
                                  {loading ? 'Enrolling...' : `Enroll ${selectedStudentIds.length} Student(s)`}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {classStudents.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No students enrolled in this class yet.
                        </p>
                      ) : (
                        classStudents.map(student => (
                          <div key={student.id} className="flex justify-between items-center p-4 border rounded-lg">
                            <div>
                              <h4 className="font-semibold">
                                {student.first_name} {student.last_name}
                              </h4>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(student.enrollment_status)}>
                              {student.enrollment_status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Class Settings</CardTitle>
                    <CardDescription>Manage class configuration and preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Class Name</Label>
                        <Input defaultValue={selectedClassData.name} />
                      </div>
                      <div className="space-y-2">
                        <Label>Room</Label>
                        <Input defaultValue={selectedClassData.room || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label>Schedule</Label>
                        <Textarea defaultValue={selectedClassData.schedule || ''} rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Students</Label>
                        <Input 
                          type="number" 
                          defaultValue={selectedClassData.max_students} 
                          min="1" 
                          max="50" 
                        />
                      </div>
                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Class Selected</h3>
                <p className="text-muted-foreground">
                  Select a class from the left panel to view and manage its details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassManagement;