-- Add video_url_part2 column for movies that need a second part
ALTER TABLE public.movies 
ADD COLUMN video_url_part2 TEXT NULL;