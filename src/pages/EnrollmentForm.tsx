import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, CreditCard, User, Phone, MapPin, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface Program {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: string;
  price: number;
}

// Form validation schema
const enrollmentFormSchema = z.object({
  // Personal Information
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  middle_name: z.string().optional(),
  birth_date: z.string().min(1, "Birth date is required"),
  gender: z.string().min(1, "Please select gender"),
  civil_status: z.string().min(1, "Please select civil status"),
  
  // Contact Information
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(10, "Please enter your complete address"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province is required"),
  postal_code: z.string().min(4, "Postal code is required"),
  
  // Emergency Contact
  emergency_name: z.string().min(2, "Emergency contact name is required"),
  emergency_relationship: z.string().min(1, "Please specify relationship"),
  emergency_phone: z.string().min(10, "Emergency contact phone is required"),
  
  // Academic Information
  program_id: z.string().min(1, "Please select a program"),
  academic_year: z.string().min(1, "Please select academic year"),
  semester: z.string().min(1, "Please select semester"),
  payment_plan: z.string().min(1, "Please select payment plan"),
  
  // Additional Information
  previous_education: z.string().optional(),
  work_experience: z.string().optional(),
  goals: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;

const EnrollmentForm = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      middle_name: '',
      birth_date: '',
      gender: '',
      civil_status: '',
      email: user?.email || '',
      phone: profile?.contact_number || '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      emergency_name: '',
      emergency_relationship: '',
      emergency_phone: '',
      program_id: '',
      academic_year: '2024-2025',
      semester: 'First Semester',
      payment_plan: 'monthly',
      previous_education: '',
      work_experience: '',
      goals: '',
    },
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load programs.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: EnrollmentFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if student already has an enrollment
      const { data: existingEnrollments, error: checkError } = await supabase
        .from('enrollments')
        .select('id, enrollment_status')
        .eq('student_id', user.id);

      if (checkError) throw checkError;

      if (existingEnrollments && existingEnrollments.length > 0) {
        toast({
          title: 'Enrollment Not Allowed',
          description: 'You are already enrolled in a program. Students can only enroll in one program at a time.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const selectedProgram = programs.find(p => p.id === data.program_id);
      
      // Calculate age from birth date
      const birthDate = new Date(data.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear() - 
                 (today.getMonth() < birthDate.getMonth() || 
                  (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: user.id,
          program_id: data.program_id,
          academic_year: data.academic_year,
          semester: data.semester,
          payment_plan: data.payment_plan,
          tuition_fee: selectedProgram?.price || 0,
          enrollment_status: 'pending',
          // Personal Information
          middle_name: data.middle_name,
          age: age,
          gender: data.gender,
          place_of_birth: `${data.city}, ${data.province}`, // Using city, province as place of birth
          // Contact Information  
          telephone: data.phone,
          gmail_account: data.email,
          home_address: `${data.address}, ${data.city}, ${data.province} ${data.postal_code}`,
          // Emergency Contact (stored as parent info for now)
          parent_name: data.emergency_name,
          parent_contact: data.emergency_phone,
          parent_address: `${data.address}, ${data.city}, ${data.province} ${data.postal_code}`, // Same as home address initially
          // Additional Information stored in medical_conditions field for now
          medical_conditions: [
            data.previous_education && `Previous Education: ${data.previous_education}`,
            data.work_experience && `Work Experience: ${data.work_experience}`,
            data.goals && `Goals: ${data.goals}`
          ].filter(Boolean).join('\n')
        });

      if (error) throw error;

      // Also update profile with additional information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          contact_number: data.phone,
        })
        .eq('user_id', user.id);

      if (profileError) console.error('Profile update error:', profileError);

      toast({
        title: 'Enrollment Submitted Successfully!',
        description: 'Your application has been submitted and is pending review. You will receive a confirmation email shortly.',
      });

      navigate('/student-dashboard');
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      toast({
        title: 'Enrollment Failed',
        description: 'There was an error submitting your enrollment. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProgramId = form.watch('program_id');
  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const paymentPlan = form.watch('payment_plan');

  const calculatePaymentAmount = () => {
    if (!selectedProgram) return 0;
    
    switch (paymentPlan) {
      case 'monthly':
        return Math.ceil(selectedProgram.price / 10); // 10 months
      case 'quarterly': 
        return Math.ceil(selectedProgram.price / 4); // 4 quarters
      case 'full':
        return selectedProgram.price;
      default:
        return selectedProgram.price;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Program Enrollment</h1>
          <p className="text-muted-foreground text-lg">
            Join ANALI Learning Institution - Complete your enrollment application
          </p>
          <div className="w-24 h-1 bg-primary mx-auto mt-4 rounded-full"></div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Personal Information Section */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      Please provide your personal details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="middle_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your middle name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="birth_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Birth Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="civil_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Civil Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="divorced">Divorced</SelectItem>
                                <SelectItem value="widowed">Widowed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information Section */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Contact Information
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      How can we reach you?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="your.email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+63 912 345 6789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complete Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="House/Unit Number, Street, Barangay, District"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter province" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="1234" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact Section */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Emergency Contact
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      Someone we can contact in case of emergency
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="emergency_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergency_relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="parent">Parent</SelectItem>
                                <SelectItem value="sibling">Sibling</SelectItem>
                                <SelectItem value="spouse">Spouse</SelectItem>
                                <SelectItem value="relative">Relative</SelectItem>
                                <SelectItem value="friend">Friend</SelectItem>
                                <SelectItem value="guardian">Guardian</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergency_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+63 912 345 6789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Academic Information Section */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Academic Information
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      Select your program and academic details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="program_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Program</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose your program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {programs.map((program) => (
                                <SelectItem key={program.id} value={program.id}>
                                  {program.name} - ₱{program.price?.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="academic_year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Academic Year</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="2024-2025">2024-2025</SelectItem>
                                <SelectItem value="2025-2026">2025-2026</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="semester"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Semester</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="First Semester">First Semester</SelectItem>
                                <SelectItem value="Second Semester">Second Semester</SelectItem>
                                <SelectItem value="Summer">Summer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="payment_plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Plan</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly Payment (10 months)</SelectItem>
                              <SelectItem value="quarterly">Quarterly Payment (4 payments)</SelectItem>
                              <SelectItem value="full">Full Payment (One-time)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Additional Information Section */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Additional Information
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      Help us understand your background and goals (Optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="previous_education"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Education</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your educational background, degrees, certifications..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="work_experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Experience</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your relevant work experience..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="goals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Learning Goals & Expectations</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What do you hope to achieve with this program?"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Summary Sidebar */}
              <div className="space-y-6">
                {selectedProgram && (
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm sticky top-4">
                    <CardHeader className="bg-gradient-to-r from-secondary to-primary text-white rounded-t-lg">
                      <CardTitle>Program Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg text-primary">{selectedProgram.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{selectedProgram.description}</p>
                      </div>
                      
                      <div className="space-y-3 text-sm border-t pt-4">
                        <div className="flex justify-between">
                          <span className="font-medium">Category:</span>
                          <span>{selectedProgram.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Duration:</span>
                          <span>{selectedProgram.duration}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-semibold">Total Fee:</span>
                          <span className="text-lg font-bold text-primary">₱{selectedProgram.price?.toLocaleString()}</span>
                        </div>
                        {paymentPlan && (
                          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
                            <div>
                              <span className="font-medium block">{paymentPlan === 'monthly' ? 'Monthly Payment' : paymentPlan === 'quarterly' ? 'Quarterly Payment' : 'Full Payment'}:</span>
                              <span className="text-xs text-muted-foreground">
                                {paymentPlan === 'monthly' ? '10 payments' : paymentPlan === 'quarterly' ? '4 payments' : 'One-time payment'}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-primary">₱{calculatePaymentAmount().toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-secondary to-primary text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span>Submit your enrollment application</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                        <span>Receive confirmation email within 24 hours</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                        <span>Complete document submission</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                        <span>Receive payment instructions</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                        <span>Begin your classes!</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold shadow-lg" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Enrollment Application'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EnrollmentForm;