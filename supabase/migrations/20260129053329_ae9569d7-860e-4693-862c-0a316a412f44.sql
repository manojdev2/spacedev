-- Table for tracking helpful votes on reviews
CREATE TABLE public.review_helpfuls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

-- Enable RLS
ALTER TABLE public.review_helpfuls ENABLE ROW LEVEL SECURITY;

-- Policies for review_helpfuls
CREATE POLICY "Anyone can view helpful counts"
  ON public.review_helpfuls FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can mark helpful"
  ON public.review_helpfuls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their helpful vote"
  ON public.review_helpfuls FOR DELETE
  USING (auth.uid() = user_id);

-- Table for reporting inappropriate reviews
CREATE TABLE public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

-- Enable RLS
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- Policies for review_reports
CREATE POLICY "Users can submit reports"
  ON public.review_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports"
  ON public.review_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports"
  ON public.review_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.review_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_review_reports_updated_at
  BEFORE UPDATE ON public.review_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();