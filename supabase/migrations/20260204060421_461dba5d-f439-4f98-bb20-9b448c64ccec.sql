-- Drop the existing policy that might not be working correctly
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;

-- Create a new policy that explicitly allows all inserts (for public booking)
CREATE POLICY "Public can create appointments" 
ON public.appointments 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);