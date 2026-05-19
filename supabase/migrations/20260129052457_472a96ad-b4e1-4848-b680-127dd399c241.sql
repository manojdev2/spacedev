-- Create table for location photos
CREATE TABLE public.location_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view photos for active locations
CREATE POLICY "Photos are publicly viewable for active locations"
ON public.location_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE locations.id = location_photos.location_id
    AND locations.is_active = true
  )
);

-- Org admins can manage photos for their locations
CREATE POLICY "Org admins can insert photos"
ON public.location_photos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_photos.location_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can update photos"
ON public.location_photos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_photos.location_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can delete photos"
ON public.location_photos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_photos.location_id
    AND ur.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_location_photos_location_id ON public.location_photos(location_id);
CREATE INDEX idx_location_photos_order ON public.location_photos(location_id, display_order);

-- Add trigger for updated_at
CREATE TRIGGER update_location_photos_updated_at
BEFORE UPDATE ON public.location_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();