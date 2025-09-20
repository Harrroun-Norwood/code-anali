-- Create foreign key for class_enrollments to profiles if it doesn't exist
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'class_enrollments_student_id_fkey' 
        AND table_name = 'class_enrollments'
    ) THEN
        ALTER TABLE public.class_enrollments 
        ADD CONSTRAINT class_enrollments_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;