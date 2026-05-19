-- Add lat/lng columns to store_submissions table
ALTER TABLE public.store_submissions
ADD COLUMN lat double precision,
ADD COLUMN lng double precision;