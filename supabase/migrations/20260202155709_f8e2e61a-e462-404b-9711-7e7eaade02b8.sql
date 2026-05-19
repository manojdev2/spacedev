-- Create table to track user browsing history
CREATE TABLE public.user_location_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_duration_seconds INTEGER DEFAULT 0,
  source TEXT DEFAULT 'direct' -- 'direct', 'search', 'recommendation', 'nearby'
);

-- Create index for efficient queries
CREATE INDEX idx_user_location_views_user_id ON public.user_location_views(user_id);
CREATE INDEX idx_user_location_views_location_id ON public.user_location_views(location_id);
CREATE INDEX idx_user_location_views_viewed_at ON public.user_location_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.user_location_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own browsing history
CREATE POLICY "Users can view own browsing history"
ON public.user_location_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own browsing history
CREATE POLICY "Users can insert own browsing history"
ON public.user_location_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own browsing history
CREATE POLICY "Users can delete own browsing history"
ON public.user_location_views
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for browsing history updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_location_views;