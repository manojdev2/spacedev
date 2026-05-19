-- Create territories table for service coverage zones
CREATE TABLE public.territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#4338ca',
  
  -- Territory definition type
  territory_type TEXT NOT NULL CHECK (territory_type IN ('polygon', 'radius', 'zipcode')),
  
  -- For polygon territories - GeoJSON coordinates stored as JSONB
  polygon_coordinates JSONB,
  
  -- For radius-based territories
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION,
  
  -- For zip code territories
  zip_codes TEXT[],
  
  -- Assignment
  assigned_team_id UUID,
  assigned_user_id UUID,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_territories_organization ON public.territories(organization_id);
CREATE INDEX idx_territories_type ON public.territories(territory_type);

-- Enable RLS
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

-- Org members can view their territories
CREATE POLICY "Org members can view territories"
ON public.territories
FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Org members can create territories
CREATE POLICY "Org members can create territories"
ON public.territories
FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

-- Org members can update territories
CREATE POLICY "Org members can update territories"
ON public.territories
FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Admins can delete territories
CREATE POLICY "Admins can delete territories"
ON public.territories
FOR DELETE
USING (user_belongs_to_org(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Create territory_demand table for heatmap data
CREATE TABLE public.territory_demand (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  demand_weight INTEGER NOT NULL DEFAULT 1,
  demand_type TEXT DEFAULT 'request',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_territory_demand_org ON public.territory_demand(organization_id);
CREATE INDEX idx_territory_demand_location ON public.territory_demand(lat, lng);
CREATE INDEX idx_territory_demand_timestamp ON public.territory_demand(timestamp);

-- Enable RLS
ALTER TABLE public.territory_demand ENABLE ROW LEVEL SECURITY;

-- Org members can view demand data
CREATE POLICY "Org members can view demand data"
ON public.territory_demand
FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Org members can insert demand data
CREATE POLICY "Org members can insert demand data"
ON public.territory_demand
FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

-- Admins can delete demand data
CREATE POLICY "Admins can delete demand data"
ON public.territory_demand
FOR DELETE
USING (user_belongs_to_org(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Add update trigger for territories
CREATE TRIGGER update_territories_updated_at
BEFORE UPDATE ON public.territories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();