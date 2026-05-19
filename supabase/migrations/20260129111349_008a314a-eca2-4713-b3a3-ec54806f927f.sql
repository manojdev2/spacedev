-- Enable realtime for notifications-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_reports;