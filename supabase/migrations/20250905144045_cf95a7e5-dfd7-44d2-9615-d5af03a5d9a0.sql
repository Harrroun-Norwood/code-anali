-- Add RLS policies for registrars and accountants to view student profiles
CREATE POLICY "Registrars can view all student profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'student' AND (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    has_role(auth.uid(), 'registrar'::user_role)
  )
);

CREATE POLICY "Accountants can view all student profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'student' AND (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    has_role(auth.uid(), 'accountant'::user_role)
  )
);

-- Add foreign key constraints for better data integrity if they don't exist
DO $$
BEGIN
    -- Add foreign key for enrollments to profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enrollments_student_id_fkey' 
        AND table_name = 'enrollments'
    ) THEN
        ALTER TABLE public.enrollments 
        ADD CONSTRAINT enrollments_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for document_requests to profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'document_requests_student_id_fkey' 
        AND table_name = 'document_requests'
    ) THEN
        ALTER TABLE public.document_requests 
        ADD CONSTRAINT document_requests_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for billing to profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'billing_student_id_fkey' 
        AND table_name = 'billing'
    ) THEN
        ALTER TABLE public.billing 
        ADD CONSTRAINT billing_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;