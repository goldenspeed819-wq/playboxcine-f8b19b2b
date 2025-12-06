-- Add is_release column to movies table
ALTER TABLE public.movies ADD COLUMN is_release boolean DEFAULT false;

-- Add is_release column to series table
ALTER TABLE public.series ADD COLUMN is_release boolean DEFAULT false;