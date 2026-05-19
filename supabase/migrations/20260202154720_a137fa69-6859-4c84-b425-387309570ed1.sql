-- Create location_services table for service-based booking
CREATE TABLE public.location_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment status enum
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.location_services(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  admin_notes TEXT,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create location booking settings table
CREATE TABLE public.location_booking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  booking_enabled BOOLEAN NOT NULL DEFAULT true,
  advance_booking_days INTEGER NOT NULL DEFAULT 30,
  min_notice_hours INTEGER NOT NULL DEFAULT 24,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  max_appointments_per_slot INTEGER NOT NULL DEFAULT 1,
  buffer_between_appointments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.location_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_booking_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for location_services
CREATE POLICY "Anyone can view active services for active locations"
ON public.location_services
FOR SELECT
USING (
  is_active = true AND
  EXISTS (SELECT 1 FROM locations WHERE locations.id = location_id AND locations.is_active = true)
);

CREATE POLICY "Org members can manage services"
ON public.location_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM locations l
    JOIN user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_id AND ur.user_id = auth.uid()
  )
);

-- RLS policies for appointments
CREATE POLICY "Users can view their own appointments"
ON public.appointments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Org members can view all location appointments"
ON public.appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM locations l
    JOIN user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_id AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Org members can update location appointments"
ON public.appointments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM locations l
    JOIN user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_id AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Users can cancel their own appointments"
ON public.appointments
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete appointments"
ON public.appointments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM locations l
    JOIN user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_id AND ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- RLS policies for location_booking_settings
CREATE POLICY "Anyone can view booking settings for active locations"
ON public.location_booking_settings
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM locations WHERE locations.id = location_id AND locations.is_active = true)
);

CREATE POLICY "Org members can manage booking settings"
ON public.location_booking_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM locations l
    JOIN user_roles ur ON ur.organization_id = l.organization_id
    WHERE l.id = location_id AND ur.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_location_services_updated_at
BEFORE UPDATE ON public.location_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_booking_settings_updated_at
BEFORE UPDATE ON public.location_booking_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_appointments_location_date ON public.appointments(location_id, appointment_date);
CREATE INDEX idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_location_services_location_id ON public.location_services(location_id);

-- Enable realtime for appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;