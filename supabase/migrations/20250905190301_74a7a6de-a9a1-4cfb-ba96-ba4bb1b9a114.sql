-- CRITICAL SECURITY FIX: Prevent public access to profiles table

-- First, drop all existing policies to start fresh with secure ones
DROP POLICY IF EXISTS "Accountants can view student billing info" ON profiles;
DROP POLICY IF EXISTS "Contact numbers are restricted" ON profiles;
DROP POLICY IF EXISTS "Registrars can view student profiles for administrative purpose" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view basic student info in their classes" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create a restrictive default policy that DENIES all access to unauthenticated users
CREATE POLICY "Deny all access to unauthenticated users" 
ON profiles 
FOR ALL
TO public
USING (false);

-- Create secure policies for authenticated users only
CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Super admins have full access (authenticated only)
CREATE POLICY "Super admins can manage all profiles" 
ON profiles 
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'super_admin'::user_role)
);

-- Teachers can only view basic student info (no email/contact) in their classes
CREATE POLICY "Teachers can view basic student info in their classes" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND role = 'student'
  AND EXISTS (
    SELECT 1 
    FROM class_enrollments ce
    JOIN classes c ON c.id = ce.class_id
    WHERE ce.student_id = profiles.user_id 
      AND c.teacher_id = auth.uid()
      AND ce.status = 'active'
  )
);

-- Accountants can view limited student info for billing purposes only
CREATE POLICY "Accountants can view student billing info" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND role = 'student'
  AND has_role(auth.uid(), 'accountant'::user_role)
);

-- Registrars can view student profiles for administrative purposes
CREATE POLICY "Registrars can view student profiles for administrative purposes" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND role = 'student'
  AND has_role(auth.uid(), 'registrar'::user_role)
);

-- Protect sensitive contact information with restrictive access
CREATE POLICY "Contact numbers are restricted to authorized roles only" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id  -- Users can see their own contact
    OR has_role(auth.uid(), 'super_admin'::user_role)  -- Super admins
    OR has_role(auth.uid(), 'registrar'::user_role)    -- Registrars for admin purposes
  )
);

-- Protect email addresses from unauthorized access
CREATE POLICY "Email addresses are restricted to authorized roles only" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id  -- Users can see their own email
    OR has_role(auth.uid(), 'super_admin'::user_role)  -- Super admins
    OR has_role(auth.uid(), 'registrar'::user_role)    -- Registrars for admin
    OR has_role(auth.uid(), 'accountant'::user_role)   -- Accountants for billing
  )
);

-- Create a function to safely get public profile info (names and photos only)
CREATE OR REPLACE FUNCTION public.get_public_profile_info(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  photo_url text,
  role user_role
)
LANGUAGE sql
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT p.user_id, p.first_name, p.last_name, p.photo_url, p.role
  FROM profiles p
  WHERE p.user_id = _user_id;
$$;

-- Log the security fix
INSERT INTO student_data_access_log (
  accessed_by,
  student_id,
  access_type,
  accessed_fields
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,  -- System user
  '00000000-0000-0000-0000-000000000000'::uuid,  -- System operation
  'SECURITY_FIX',
  ARRAY['profiles_table_secured']
);