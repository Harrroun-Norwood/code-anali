-- Drop the problematic policy that's causing infinite recursion
DROP POLICY IF EXISTS "Students can view classes they are enrolled in" ON public.classes;

-- Create a security definer function to check class enrollment safely
CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_class(_class_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_enrollments
    WHERE class_id = _class_id
    AND student_id = _student_id
    AND status = 'active'
  )
$$;

-- Create a new policy using the security definer function
CREATE POLICY "Students can view enrolled classes" 
ON public.classes 
FOR SELECT 
USING (
  public.is_student_enrolled_in_class(id, auth.uid())
);