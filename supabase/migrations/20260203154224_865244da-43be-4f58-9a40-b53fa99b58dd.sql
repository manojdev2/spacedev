-- Create a table to track system configuration (setup completed, etc.)
CREATE TABLE public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read for setup check
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Anyone can check if setup is complete (needed before auth exists)
CREATE POLICY "Anyone can view system config"
ON public.system_config
FOR SELECT
USING (true);

-- Only admins can update system config
CREATE POLICY "Admins can update system config"
ON public.system_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_system_config_updated_at
BEFORE UPDATE ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();