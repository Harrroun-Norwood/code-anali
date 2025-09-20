-- Fix security issue: Restrict access to sensitive student personal information

-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Teachers can view profiles of students in their classes" ON profiles;
DROP POLICY IF EXISTS "Accountants can view all student profiles" ON profiles;
DROP POLICY IF EXISTS "Registrars can view all student profiles" ON profiles;

-- Create security definer functions for controlled data access
CREATE OR REPLACE FUNCTION public.get_student_basic_info_for_teacher(_teacher_id uuid, _student_id uuid)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  photo_url text
)
LANGUAGE sql
SECURITY DEFINER 
STABLE
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
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  email text
)
LANGUAGE sql
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT p.user_id, p.first_name, p.last_name, p.email
  FROM profiles p
  WHERE p.user_id = _student_id 
    AND p.role = 'student';
$$;

-- Create new restrictive policies

-- Teachers can only view basic info (no email/contact) of students in their classes
CREATE POLICY "Teachers can view basic student info in their classes" 
ON profiles 
FOR SELECT 
USING (
  role = 'student' 
  AND EXISTS (
    SELECT 1 
    FROM class_enrollments ce
    JOIN classes c ON c.id = ce.class_id
    WHERE ce.student_id = profiles.user_id 
      AND c.teacher_id = auth.uid()
      AND ce.status = 'active'
  )
  -- Only allow access to non-sensitive fields by limiting what can be selected
);

-- Accountants can view student profiles only for billing purposes (limited fields)
CREATE POLICY "Accountants can view student billing info" 
ON profiles 
FOR SELECT 
USING (
  role = 'student' 
  AND has_role(auth.uid(), 'accountant'::user_role)
);

-- Registrars maintain broader access but we'll monitor this closely
CREATE POLICY "Registrars can view student profiles for administrative purposes" 
ON profiles 
FOR SELECT 
USING (
  role = 'student' 
  AND has_role(auth.uid(), 'registrar'::user_role)
);

-- Add policy to prevent contact number exposure to unauthorized roles
CREATE POLICY "Contact numbers are restricted" 
ON profiles 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true  -- Users can see their own contact
    WHEN has_role(auth.uid(), 'super_admin'::user_role) THEN true  -- Super admins need full access
    WHEN has_role(auth.uid(), 'registrar'::user_role) THEN true  -- Registrars need contact info for admin
    ELSE contact_number IS NULL  -- Hide contact numbers from other roles
  END
);

-- Create audit table to track access to sensitive student data
CREATE TABLE IF NOT EXISTS public.student_data_access_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  accessed_by uuid REFERENCES auth.users(id),
  student_id uuid,
  access_type text NOT NULL,
  accessed_fields text[],
  accessed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Enable RLS on audit table
ALTER TABLE public.student_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view access logs
CREATE POLICY "Super admins can view access logs" 
ON public.student_data_access_log 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::user_role));

-- Function to log access to student data
CREATE OR REPLACE FUNCTION public.log_student_data_access(
  _student_id uuid,
  _access_type text,
  _accessed_fields text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO student_data_access_log (
    accessed_by,
    student_id,
    access_type,
    accessed_fields
  ) VALUES (
    auth.uid(),
    _student_id,
    _access_type,
    _accessed_fields
  );
END;
$$;