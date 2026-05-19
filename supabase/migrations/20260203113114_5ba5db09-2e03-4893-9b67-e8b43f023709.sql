-- Create payment gateway settings table for admin configuration
CREATE TABLE public.payment_gateway_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  gateway_type TEXT NOT NULL CHECK (gateway_type IN ('stripe', 'paypal', 'crypto')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_live_mode BOOLEAN NOT NULL DEFAULT false,
  -- Test mode credentials (encrypted at rest by Supabase)
  test_api_key TEXT,
  test_secret_key TEXT,
  test_webhook_secret TEXT,
  -- Live mode credentials
  live_api_key TEXT,
  live_secret_key TEXT,
  live_webhook_secret TEXT,
  -- Additional settings as JSON
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one config per gateway per organization
  UNIQUE(organization_id, gateway_type)
);

-- Enable RLS
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Only org admins can view their payment settings
CREATE POLICY "Admins can view their org payment settings"
ON public.payment_gateway_settings
FOR SELECT
USING (
  public.user_belongs_to_org(auth.uid(), organization_id) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only org admins can insert payment settings
CREATE POLICY "Admins can create payment settings"
ON public.payment_gateway_settings
FOR INSERT
WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only org admins can update payment settings
CREATE POLICY "Admins can update their payment settings"
ON public.payment_gateway_settings
FOR UPDATE
USING (
  public.user_belongs_to_org(auth.uid(), organization_id) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only org admins can delete payment settings
CREATE POLICY "Admins can delete their payment settings"
ON public.payment_gateway_settings
FOR DELETE
USING (
  public.user_belongs_to_org(auth.uid(), organization_id) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Add updated_at trigger
CREATE TRIGGER update_payment_gateway_settings_updated_at
BEFORE UPDATE ON public.payment_gateway_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();