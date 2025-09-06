-- Create report cards table
CREATE TABLE public.report_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  academic_year text NOT NULL,
  semester text NOT NULL,
  quarter text NOT NULL,
  general_average numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'released')),
  generated_date timestamp with time zone,
  released_date timestamp with time zone,
  created_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for report cards
CREATE POLICY "Admins can manage all report cards" 
ON public.report_cards 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'registrar'::user_role));

CREATE POLICY "Teachers can manage report cards for their classes" 
ON public.report_cards 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM classes 
  WHERE classes.id = report_cards.class_id 
  AND classes.teacher_id = auth.uid()
));

CREATE POLICY "Students can view their own report cards" 
ON public.report_cards 
FOR SELECT 
USING (auth.uid() = student_id AND status = 'released');

-- Create trigger for timestamps
CREATE TRIGGER update_report_cards_updated_at
BEFORE UPDATE ON public.report_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();