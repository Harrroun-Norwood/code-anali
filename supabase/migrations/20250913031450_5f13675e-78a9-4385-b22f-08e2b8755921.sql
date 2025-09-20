-- Add trigger for role change validation
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();

-- Fix function search path issues by setting search_path explicitly
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
    AND role = _role
    AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_class(_class_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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