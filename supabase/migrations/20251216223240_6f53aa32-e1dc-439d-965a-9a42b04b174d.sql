-- Add username and avatar_url to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Create avatars table for character/actor photos
CREATE TABLE public.avatars (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id uuid REFERENCES public.movies(id) ON DELETE CASCADE,
  series_id uuid REFERENCES public.series(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  character_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT avatar_content_check CHECK (
    (movie_id IS NOT NULL AND series_id IS NULL) OR 
    (movie_id IS NULL AND series_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Everyone can view avatars
CREATE POLICY "Avatars are viewable by everyone" 
ON public.avatars 
FOR SELECT 
USING (true);

-- Admins can manage avatars
CREATE POLICY "Admins can manage avatars" 
ON public.avatars 
FOR ALL 
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);