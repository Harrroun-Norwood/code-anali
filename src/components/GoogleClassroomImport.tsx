import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Users, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ImportedGrade {
  studentName: string;
  email: string;
  assignmentName: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradeType: string;
  notes?: string;
}

interface TeacherClass {
  id: string;
  name: string;
  program_name: string;
  academic_year: string;
  semester: string;
}

const GoogleClassroomImport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [importedGrades, setImportedGrades] = useState<ImportedGrade[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeacherClasses();
    }
  }, [user]);

  const fetchTeacherClasses = async () => {
    try {
      const { data: classData, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          academic_year,
          semester,
          programs (name)
        `)
        .eq('teacher_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      const formattedClasses = (classData || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        program_name: cls.programs?.name || 'Unknown Program',
        academic_year: cls.academic_year,
        semester: cls.semester
      }));

      setClasses(formattedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV file exported from Google Classroom.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const grades: ImportedGrade[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < headers.length) continue;

        // Expected CSV format from Google Classroom:
        // Student Name, Email, Assignment Name, Points Earned, Points Possible, Grade Type, Notes
        const grade: ImportedGrade = {
          studentName: values[0] || '',
          email: values[1] || '',
          assignmentName: values[2] || '',
          score: parseFloat(values[3]) || 0,
          maxScore: parseFloat(values[4]) || 100,
          percentage: Math.round(((parseFloat(values[3]) || 0) / (parseFloat(values[4]) || 100)) * 100),
          gradeType: values[5] || 'Assignment',
          notes: values[6] || ''
        };

        if (grade.studentName && grade.assignmentName) {
          grades.push(grade);
        }
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setImportedGrades(grades);

      setTimeout(() => {
        setUploadProgress(0);
        setIsProcessing(false);
      }, 500);

      toast({
        title: 'Import Successful',
        description: `Imported ${grades.length} grade records from Google Classroom.`,
      });

    } catch (error) {
      console.error('Error processing file:', error);
      setIsProcessing(false);
      setUploadProgress(0);
      toast({
        title: 'Import Failed',
        description: 'Failed to process the CSV file. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  const saveGradesToDatabase = async () => {
    if (!selectedClass || importedGrades.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a class and import grades first.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const grade of importedGrades) {
        try {
          // First, find the student by email
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', grade.email)
            .single();

          if (profileError || !profiles) {
            console.warn(`Student not found: ${grade.email}`);
            errorCount++;
            continue;
          }

          // Find the class enrollment
          const { data: enrollment, error: enrollmentError } = await supabase
            .from('class_enrollments')
            .select('id')
            .eq('student_id', profiles.user_id)
            .eq('class_id', selectedClass)
            .single();

          if (enrollmentError || !enrollment) {
            console.warn(`Enrollment not found for student: ${grade.email}`);
            errorCount++;
            continue;
          }

          // Insert the grade
          const { error: gradeError } = await supabase
            .from('grades')
            .insert({
              class_enrollment_id: enrollment.id,
              assignment_name: grade.assignmentName,
              grade_type: grade.gradeType,
              score: grade.score,
              max_score: grade.maxScore,
              percentage: grade.percentage,
              quarter: selectedQuarter,
              notes: grade.notes || null,
              date_recorded: new Date().toISOString()
            });

          if (gradeError) {
            console.error(`Error saving grade for ${grade.email}:`, gradeError);
            errorCount++;
          } else {
            successCount++;
          }

        } catch (error) {
          console.error(`Error processing grade for ${grade.email}:`, error);
          errorCount++;
        }
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${successCount} grades. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });

      if (successCount > 0) {
        setImportedGrades([]);
      }

    } catch (error) {
      console.error('Error saving grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to save grades to database.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      'Student Name,Email,Assignment Name,Points Earned,Points Possible,Grade Type,Notes',
      'John Doe,john.doe@example.com,Math Test 1,85,100,Test,Good work',
      'Jane Smith,jane.smith@example.com,Math Test 1,92,100,Test,Excellent'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'google_classroom_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'CSV template downloaded successfully.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready to Import</p>
                <p className="text-2xl font-bold">{importedGrades.length}</p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Students</p>
                <p className="text-2xl font-bold">
                  {new Set(importedGrades.map(g => g.email)).size}
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
                <p className="text-sm font-medium text-muted-foreground">Assignments</p>
                <p className="text-2xl font-bold">
                  {new Set(importedGrades.map(g => g.assignmentName)).size}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Grades from Google Classroom
          </CardTitle>
          <CardDescription>
            Upload a CSV file exported from Google Classroom to import grades directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class">Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading classes..." : "Choose a class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.program_name} ({cls.academic_year} {cls.semester})
                    </SelectItem>
                  ))}
                  {classes.length === 0 && !loading && (
                    <SelectItem value="" disabled>
                      No classes found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter</Label>
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
          </div>

          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Upload CSV File</h3>
                <p className="text-muted-foreground">
                  Choose a CSV file exported from Google Classroom
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Label htmlFor="csv-upload">
                  <Button asChild>
                    <span className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </span>
                  </Button>
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {importedGrades.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Imported Grades Preview</h4>
                <Button 
                  onClick={saveGradesToDatabase}
                  disabled={isProcessing || !selectedClass}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save to Database
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-4">
                  <div className="grid grid-cols-7 gap-4 text-sm font-medium">
                    <span>Student</span>
                    <span>Email</span>
                    <span>Assignment</span>
                    <span>Score</span>
                    <span>Max</span>
                    <span>%</span>
                    <span>Type</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {importedGrades.slice(0, 10).map((grade, index) => (
                    <div key={index} className="p-4 border-b grid grid-cols-7 gap-4 text-sm">
                      <span className="font-medium">{grade.studentName}</span>
                      <span className="text-muted-foreground">{grade.email}</span>
                      <span>{grade.assignmentName}</span>
                      <span>{grade.score}</span>
                      <span>{grade.maxScore}</span>
                      <span>
                        <Badge variant={grade.percentage >= 80 ? 'default' : 'secondary'}>
                          {grade.percentage}%
                        </Badge>
                      </span>
                      <span className="text-muted-foreground">{grade.gradeType}</span>
                    </div>
                  ))}
                  {importedGrades.length > 10 && (
                    <div className="p-4 text-center text-muted-foreground">
                      ... and {importedGrades.length - 10} more grades
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Google Classroom Export Instructions
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to your Google Classroom</li>
              <li>Click on "Classwork" tab</li>
              <li>Select the assignment you want to export</li>
              <li>Click "View Assignment" → "Grades"</li>
              <li>Click the download icon and select "Download grades (.csv)"</li>
              <li>Upload the downloaded CSV file here</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleClassroomImport;