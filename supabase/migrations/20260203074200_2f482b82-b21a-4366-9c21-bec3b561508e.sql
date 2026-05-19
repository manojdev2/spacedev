-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM (
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete'
);

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM (
  'stripe',
  'paypal',
  'crypto',
  'bank_transfer'
);

-- Create subscriptions table to track user subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  plan subscription_plan NOT NULL DEFAULT 'starter',
  status subscription_status NOT NULL DEFAULT 'incomplete',
  payment_method payment_method NOT NULL DEFAULT 'stripe',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  trial_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payments table to track all payment transactions
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  payment_method payment_method NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add stripe_customer_id to organizations for easy lookup
ALTER TABLE public.organizations 
ADD COLUMN stripe_customer_id text;

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Org members can view their subscription"
ON public.subscriptions FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can update subscription"
ON public.subscriptions FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Org members can view their payments"
ON public.payments FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();