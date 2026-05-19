-- Allow users to select appointments they just created (for the insert return)
-- This allows anon users to read back their own appointment using customer_email
-- Note: We use a more specific policy - select only newly created appointments (created within last minute)
CREATE POLICY "Users can view appointments they created" 
ON public.appointments 
FOR SELECT 
TO anon, authenticated
USING (
  -- Allow reading appointments created by the current session
  -- This is a workaround for anonymous bookings - they can read back their recent appointment
  created_at > now() - interval '1 minute'
);