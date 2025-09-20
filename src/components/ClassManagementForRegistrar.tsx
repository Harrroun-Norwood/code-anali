import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Calendar, MapPin, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Class {
  id: string;
  name: string;
  teacher_id: string;
  room: string;
  schedule: string;
  semester: string;
  academic_year: string;
  max_students: number;
  is_active: boolean;
  program_id: string;
  created_at: string;
  programs?: {
    name: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface Teacher {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Program {
  id: string;
  name: string;
}

interface Student {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const ClassManagementForRegistrar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    teacher_id: '',
    program_id: '',
    room: '',
    schedule: '',
    semester: 'First Semester',
    academic_year: '2024-2025',
    max_students: 30
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch classes
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          programs!program_id(name),
          teacher:profiles!teacher_id(first_name, last_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (classError) throw classError;

      // Transform the data to match our interface
      const transformedClasses = classData?.map(cls => ({
        ...cls,
        profiles: cls.teacher?.[0] || null
      })) || [];

      setClasses(transformedClasses as Class[]);

      // Fetch teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .eq('role', 'teacher')
        .eq('is_active', true);

      if (teacherError) throw teacherError;

      // Fetch programs
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true);

      if (programError) throw programError;

      // Fetch available students (those with approved enrollments)
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .eq('role', 'student')
        .eq('application_status', 'student')
        .eq('is_active', true);

      if (studentError) throw studentError;

      setTeachers(teacherData || []);
      setPrograms(programData || []);
      setAvailableStudents(studentData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load class data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add authentication check
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to perform this action.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.name || !formData.teacher_id || !formData.program_id || !formData.room || !formData.schedule) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: formData.name,
          teacher_id: formData.teacher_id,
          program_id: formData.program_id,
          room: formData.room,
          schedule: formData.schedule,
          semester: formData.semester,
          academic_year: formData.academic_year,
          max_students: formData.max_students,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'Class Created Successfully',
        description: 'The new class has been created and assigned to the teacher.',
      });

      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        teacher_id: '',
        program_id: '',
        room: '',
        schedule: '',
        semester: 'First Semester',
        academic_year: '2024-2025',
        max_students: 30
      });
      fetchData();
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Error',
        description: 'Failed to create class.',
        variant: 'destructive',
      });
    }
  };

  const handleAssignStudents = async (classId: string, studentIds: string[]) => {
    try {
      // Remove existing enrollments for this class
      await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_id', classId);

      // Add new enrollments
      const enrollments = studentIds.map(studentId => ({
        class_id: classId,
        student_id: studentId,
        status: 'active',
        enrollment_date: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('class_enrollments')
        .insert(enrollments);

      if (error) throw error;

      toast({
        title: 'Students Assigned Successfully',
        description: `${studentIds.length} students have been assigned to the class.`,
      });

      fetchData();
    } catch (error) {
      console.error('Error assigning students:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign students to class.',
        variant: 'destructive',
      });
    }
  };

  const timeSlots = [
    '8:00 AM - 9:00 AM',
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM'
  ];

  const days = [
    'Monday, Wednesday, Friday',
    'Tuesday, Thursday',
    'Monday, Tuesday, Wednesday',
    'Thursday, Friday',
    'Saturday'
  ];

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
          <h2 className="text-2xl font-bold">Class Management</h2>
          <p className="text-muted-foreground">
            Create and manage classes, assign teachers and students
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreateClass}>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Set up a new class and assign it to a teacher.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Class Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                      placeholder="e.g., Mathematics Grade 1-A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room *</Label>
                    <Input
                      id="room"
                      value={formData.room}
                      onChange={(e) => setFormData(prev => ({...prev, room: e.target.value}))}
                      placeholder="e.g., Room 101"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Assign Teacher *</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({...prev, teacher_id: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.user_id} value={teacher.user_id}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program">Program *</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({...prev, program_id: value}))}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule *</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({...prev, schedule: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select days and time" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map(day => 
                        timeSlots.map(time => (
                          <SelectItem key={`${day} ${time}`} value={`${day} ${time}`}>
                            {day} • {time}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semester</Label>
                    <Select 
                      value={formData.semester}
                      onValueChange={(value) => setFormData(prev => ({...prev, semester: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="First Semester">First Semester</SelectItem>
                        <SelectItem value="Second Semester">Second Semester</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academic_year">Academic Year</Label>
                    <Input
                      id="academic_year"
                      value={formData.academic_year}
                      onChange={(e) => setFormData(prev => ({...prev, academic_year: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_students">Max Students</Label>
                    <Input
                      id="max_students"
                      type="number"
                      value={formData.max_students}
                      onChange={(e) => setFormData(prev => ({...prev, max_students: parseInt(e.target.value)}))}
                      min="1"
                      max="50"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Class</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {classes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Classes Found</h3>
              <p className="text-muted-foreground">
                Create your first class to get started with scheduling.
              </p>
            </CardContent>
          </Card>
        ) : (
          classes.map((classItem) => (
            <Card key={classItem.id} className="border-l-4 border-l-secondary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {classItem.name}
                    </CardTitle>
                    <CardDescription>
                      {classItem.programs?.name} • Taught by {classItem.profiles?.first_name} {classItem.profiles?.last_name}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{classItem.room}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{classItem.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{classItem.semester} {classItem.academic_year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Max: {classItem.max_students} students</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Students
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit Class
                  </Button>
                  <Button variant="outline" size="sm">
                    Assign Students
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClassManagementForRegistrar;