-- Allow students to update their own billing records (for payment processing)
CREATE POLICY "Students can update their own billing records"
ON public.billing
FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);