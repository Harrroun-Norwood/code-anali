-- Add RLS policy for teachers to view student profiles in their classes
CREATE POLICY "Teachers can view profiles of students in their classes" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'student' AND EXISTS (
    SELECT 1 
    FROM public.class_enrollments ce
    JOIN public.classes c ON c.id = ce.class_id
    WHERE ce.student_id = profiles.user_id 
    AND c.teacher_id = auth.uid()
    AND ce.status = 'active'
  )
);