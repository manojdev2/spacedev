-- Ensure anon role has all necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON public.appointments TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Also ensure the locations table can be read (for the join in the query)
GRANT SELECT ON public.locations TO anon;
GRANT SELECT ON public.location_services TO anon;