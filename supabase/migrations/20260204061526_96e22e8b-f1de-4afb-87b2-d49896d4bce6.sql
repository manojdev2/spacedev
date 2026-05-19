-- Ensure proper grants for anonymous booking
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON public.appointments TO anon;

-- Also ensure authenticated users can insert
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- Grant access to related tables needed for the booking flow
GRANT SELECT ON public.locations TO anon;
GRANT SELECT ON public.location_services TO anon;
GRANT SELECT ON public.location_booking_settings TO anon;

-- Grant sequence usage for id generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;