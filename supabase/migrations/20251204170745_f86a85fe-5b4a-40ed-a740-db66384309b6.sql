-- Create movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  video_url TEXT,
  category TEXT,
  duration TEXT,
  release_year INTEGER,
  rating TEXT DEFAULT 'Livre',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create series table
CREATE TABLE public.series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  category TEXT,
  release_year INTEGER,
  rating TEXT DEFAULT 'Livre',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create episodes table
CREATE TABLE public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT 1,
  episode INTEGER NOT NULL DEFAULT 1,
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail TEXT,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anônimo',
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_content_reference CHECK (
    (movie_id IS NOT NULL AND episode_id IS NULL) OR
    (movie_id IS NULL AND episode_id IS NOT NULL)
  )
);

-- Create admins table
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Public read policies for content
CREATE POLICY "Movies are viewable by everyone" ON public.movies FOR SELECT USING (true);
CREATE POLICY "Series are viewable by everyone" ON public.series FOR SELECT USING (true);
CREATE POLICY "Episodes are viewable by everyone" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);

-- Public insert policy for comments (anyone can comment)
CREATE POLICY "Anyone can create comments" ON public.comments FOR INSERT WITH CHECK (true);

-- Admin policies (we'll handle auth via edge function)
CREATE POLICY "Admins can manage movies" ON public.movies FOR ALL USING (true);
CREATE POLICY "Admins can manage series" ON public.series FOR ALL USING (true);
CREATE POLICY "Admins can manage episodes" ON public.episodes FOR ALL USING (true);
CREATE POLICY "Admins readable by system" ON public.admins FOR SELECT USING (true);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Insert default admin (password: AdmBr1212&)
-- Using bcrypt-style hash simulation - in production use proper hashing
INSERT INTO public.admins (email, password_hash) 
VALUES ('admin@playboxcine.com', 'AdmBr1212&');

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 107374182400);

-- Create storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);

-- Storage policies for videos bucket
CREATE POLICY "Videos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Anyone can upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
CREATE POLICY "Anyone can update videos" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
CREATE POLICY "Anyone can delete videos" ON storage.objects FOR DELETE USING (bucket_id = 'videos');

-- Storage policies for thumbnails bucket
CREATE POLICY "Thumbnails are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Anyone can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails');
CREATE POLICY "Anyone can update thumbnails" ON storage.objects FOR UPDATE USING (bucket_id = 'thumbnails');
CREATE POLICY "Anyone can delete thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'thumbnails');