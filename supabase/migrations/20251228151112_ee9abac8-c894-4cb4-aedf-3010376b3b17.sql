-- Create subtitles table
CREATE TABLE public.subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'Português',
  subtitle_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_movie_or_episode CHECK (
    (movie_id IS NOT NULL AND episode_id IS NULL) OR
    (movie_id IS NULL AND episode_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.subtitles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Subtitles are viewable by everyone"
ON public.subtitles
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage subtitles"
ON public.subtitles
FOR ALL
USING (true);

-- Create subtitles storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('subtitles', 'subtitles', true);

-- Storage policies for subtitles bucket
CREATE POLICY "Subtitles are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'subtitles');

CREATE POLICY "Authenticated users can upload subtitles"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'subtitles' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update subtitles"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'subtitles' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete subtitles"
ON storage.objects
FOR DELETE
USING (bucket_id = 'subtitles' AND auth.role() = 'authenticated');