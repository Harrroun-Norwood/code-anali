-- Add foreign key constraint between billing and profiles tables
ALTER TABLE public.billing 
ADD CONSTRAINT billing_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint between document_requests and profiles tables  
ALTER TABLE public.document_requests
ADD CONSTRAINT document_requests_student_id_fkey
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;