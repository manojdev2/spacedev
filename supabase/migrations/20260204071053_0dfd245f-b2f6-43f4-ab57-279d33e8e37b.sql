-- Tighten overly-permissive public INSERT policies (replace WITH CHECK (true))

-- appointments: public booking is allowed, but validate obvious invariants
DROP POLICY IF EXISTS "Anyone can book appointments" ON public.appointments;
CREATE POLICY "Anyone can book appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  customer_email IS NOT NULL
  AND customer_email <> ''
  AND customer_name IS NOT NULL
  AND customer_name <> ''
  AND appointment_date IS NOT NULL
  AND appointment_date >= CURRENT_DATE
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL
  AND start_time < end_time
  AND location_id IS NOT NULL
);

-- contact_messages: allow public submissions but require non-empty payload
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND email <> ''
  AND name IS NOT NULL AND name <> ''
  AND subject IS NOT NULL AND subject <> ''
  AND message IS NOT NULL AND message <> ''
  AND length(message) BETWEEN 10 AND 5000
);

-- store_submissions: allow public submissions but require non-empty payload
DROP POLICY IF EXISTS "Anyone can submit a store" ON public.store_submissions;
CREATE POLICY "Anyone can submit a store"
ON public.store_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  business_name IS NOT NULL AND business_name <> ''
  AND contact_name IS NOT NULL AND contact_name <> ''
  AND contact_email IS NOT NULL AND contact_email <> ''
  AND contact_phone IS NOT NULL AND contact_phone <> ''
  AND address IS NOT NULL AND address <> ''
  AND city IS NOT NULL AND city <> ''
  AND state IS NOT NULL AND state <> ''
  AND zip_code IS NOT NULL AND zip_code <> ''
);
