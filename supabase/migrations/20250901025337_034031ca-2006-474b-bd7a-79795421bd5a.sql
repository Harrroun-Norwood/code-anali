-- Create classes table to manage teacher classes
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  schedule TEXT,
  room TEXT,
  max_students INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create class_enrollments table to track student enrollments in classes
CREATE TABLE public.class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Enable Row Level Security
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- Create grades table for managing student grades
CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_enrollment_id UUID REFERENCES public.class_enrollments(id) ON DELETE CASCADE,
  assignment_name TEXT NOT NULL,
  grade_type TEXT NOT NULL CHECK (grade_type IN ('quiz', 'exam', 'project', 'homework', 'participation')),
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  date_recorded TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Teachers can view their own classes" 
ON public.classes 
FOR SELECT 
USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role));

CREATE POLICY "Admins can manage all classes" 
ON public.classes 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role));

-- RLS Policies for class_enrollments
CREATE POLICY "Students can view their own enrollments" 
ON public.class_enrollments 
FOR SELECT 
USING (auth.uid() = student_id OR has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role) OR 
       EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_enrollments.class_id AND classes.teacher_id = auth.uid()));

CREATE POLICY "Teachers can view enrollments in their classes" 
ON public.class_enrollments 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_enrollments.class_id AND classes.teacher_id = auth.uid()));

CREATE POLICY "Admins can manage all class enrollments" 
ON public.class_enrollments 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role));

-- RLS Policies for grades
CREATE POLICY "Students can view their own grades" 
ON public.grades 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.class_enrollments 
  WHERE class_enrollments.id = grades.class_enrollment_id 
  AND class_enrollments.student_id = auth.uid()
));

CREATE POLICY "Teachers can manage grades for their classes" 
ON public.grades 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.class_enrollments 
  JOIN public.classes ON classes.id = class_enrollments.class_id
  WHERE class_enrollments.id = grades.class_enrollment_id 
  AND classes.teacher_id = auth.uid()
));

CREATE POLICY "Admins can manage all grades" 
ON public.grades 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role));

-- Add triggers for updated_at
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_enrollments_updated_at
BEFORE UPDATE ON public.class_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grades_updated_at
BEFORE UPDATE ON public.grades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();