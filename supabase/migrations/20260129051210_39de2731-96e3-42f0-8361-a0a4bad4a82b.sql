-- Create store submissions table for public store registration
CREATE TABLE public.store_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  website TEXT,
  category TEXT NOT NULL DEFAULT 'retail',
  services TEXT[] DEFAULT '{}',
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a store (public insert)
CREATE POLICY "Anyone can submit a store"
  ON public.store_submissions
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users with admin role can view submissions
CREATE POLICY "Admins can view all submissions"
  ON public.store_submissions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update submissions (approve/reject)
CREATE POLICY "Admins can update submissions"
  ON public.store_submissions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete submissions
CREATE POLICY "Admins can delete submissions"
  ON public.store_submissions
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_store_submissions_updated_at
  BEFORE UPDATE ON public.store_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();