-- Create billing table for student payments
CREATE TABLE public.billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id),
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document requests table
CREATE TABLE public.document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  grade_section TEXT,
  document_type TEXT NOT NULL,
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'declined')),
  notes TEXT,
  completion_date TIMESTAMP WITH TIME ZONE,
  pickup_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for billing
CREATE POLICY "Students can view their own billing" 
ON public.billing 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all billing" 
ON public.billing 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role));

-- Create RLS policies for document requests  
CREATE POLICY "Students can create and view their own document requests" 
ON public.document_requests 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can create document requests" 
ON public.document_requests 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage all document requests" 
ON public.document_requests 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_billing_updated_at
BEFORE UPDATE ON public.billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_requests_updated_at
BEFORE UPDATE ON public.document_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();