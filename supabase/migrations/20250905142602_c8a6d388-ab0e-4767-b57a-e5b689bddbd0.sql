-- Add RLS policy for students to view classes they are enrolled in
CREATE POLICY "Students can view classes they are enrolled in" 
ON public.classes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.class_enrollments 
    WHERE class_enrollments.class_id = classes.id 
    AND class_enrollments.student_id = auth.uid() 
    AND class_enrollments.status = 'active'
  )
);