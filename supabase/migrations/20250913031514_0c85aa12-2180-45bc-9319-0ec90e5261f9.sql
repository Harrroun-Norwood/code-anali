-- Fix all remaining functions to have proper search_path set
CREATE OR REPLACE FUNCTION public.get_student_basic_info_for_teacher(_teacher_id uuid, _student_id uuid)
RETURNS TABLE(user_id uuid, first_name text, last_name text, photo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.first_name, p.last_name, p.photo_url
  FROM profiles p
  WHERE p.user_id = _student_id 
    AND p.role = 'student'
    AND EXISTS (
      SELECT 1 
      FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      WHERE ce.student_id = _student_id 
        AND c.teacher_id = _teacher_id
        AND ce.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_student_billing_info_for_accountant(_student_id uuid)
RETURNS TABLE(user_id uuid, first_name text, last_name text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.first_name, p.last_name, p.email
  FROM profiles p
  WHERE p.user_id = _student_id 
    AND p.role = 'student';
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_info(_user_id uuid)
RETURNS TABLE(user_id uuid, first_name text, last_name text, photo_url text, role user_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.first_name, p.last_name, p.photo_url, p.role
  FROM profiles p
  WHERE p.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.email_verification_otps 
  WHERE expires_at < now() - INTERVAL '1 hour';
$$;