-- Explicitly allow anonymous users to read active locations/services needed for booking flow
-- (RLS policies are required in addition to GRANTs)

DO $$
BEGIN
  -- locations: anon SELECT active locations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'locations'
      AND policyname = 'Anon can view active locations'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Anon can view active locations"
      ON public.locations
      FOR SELECT
      TO anon
      USING (is_active = true)
    $sql$;
  END IF;

  -- location_services: anon SELECT active services for active locations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'location_services'
      AND policyname = 'Anon can view active services for active locations'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Anon can view active services for active locations"
      ON public.location_services
      FOR SELECT
      TO anon
      USING (
        is_active = true
        AND EXISTS (
          SELECT 1
          FROM public.locations
          WHERE locations.id = location_services.location_id
            AND locations.is_active = true
        )
      )
    $sql$;
  END IF;
END
$$;
