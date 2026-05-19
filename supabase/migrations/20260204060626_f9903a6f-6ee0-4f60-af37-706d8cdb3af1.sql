-- Drop and recreate with explicit role grants
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

-- Grant explicit permission to anon role
GRANT INSERT ON public.appointments TO anon;

-- Create policy that allows anyone to insert
CREATE POLICY "Anyone can book appointments" 
ON public.appointments 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);