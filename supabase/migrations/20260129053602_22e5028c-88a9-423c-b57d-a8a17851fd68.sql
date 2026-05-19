-- Create storage bucket for location photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('location-photos', 'location-photos', true);

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view location photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'location-photos');

-- Org members can upload photos for their locations
CREATE POLICY "Org members can upload location photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'location-photos' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  );

-- Org members can update their photos
CREATE POLICY "Org members can update location photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'location-photos' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  );

-- Org members can delete their photos
CREATE POLICY "Org members can delete location photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'location-photos' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  );