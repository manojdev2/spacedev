-- Create enum for location categories
CREATE TYPE public.location_category AS ENUM ('retail', 'warehouse', 'service-center', 'headquarters', 'branch');

-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'professional', 'enterprise');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create organizations table (clients)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  plan subscription_plan NOT NULL DEFAULT 'starter',
  max_locations INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Create locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category location_category NOT NULL DEFAULT 'retail',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  opening_hours JSONB NOT NULL DEFAULT '{
    "monday": {"isOpen": true, "open": "09:00", "close": "17:00"},
    "tuesday": {"isOpen": true, "open": "09:00", "close": "17:00"},
    "wednesday": {"isOpen": true, "open": "09:00", "close": "17:00"},
    "thursday": {"isOpen": true, "open": "09:00", "close": "17:00"},
    "friday": {"isOpen": true, "open": "09:00", "close": "17:00"},
    "saturday": {"isOpen": false, "open": "10:00", "close": "14:00"},
    "sunday": {"isOpen": false, "open": "10:00", "close": "14:00"}
  }'::jsonb,
  services TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_locations_organization ON public.locations(organization_id);
CREATE INDEX idx_locations_category ON public.locations(category);
CREATE INDEX idx_locations_city ON public.locations(city);
CREATE INDEX idx_locations_active ON public.locations(is_active);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), id));

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), id) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.user_belongs_to_org(auth.uid(), id) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles (view own roles, admins manage)
CREATE POLICY "Users can view roles in their organization"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert roles in their organization"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles in their organization"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for locations
-- Public can view active locations (for store locator)
CREATE POLICY "Anyone can view active locations"
ON public.locations FOR SELECT
USING (is_active = true);

-- Authenticated users in org can view all their locations
CREATE POLICY "Org members can view all their locations"
ON public.locations FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Admins and staff can insert locations
CREATE POLICY "Org members can insert locations"
ON public.locations FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Admins and staff can update locations
CREATE POLICY "Org members can update their locations"
ON public.locations FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id))
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Only admins can delete locations
CREATE POLICY "Admins can delete locations"
ON public.locations FOR DELETE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();