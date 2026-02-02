-- Tabela de favoritos
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id),
  UNIQUE(user_id, series_id),
  CONSTRAINT check_content_type CHECK (
    (movie_id IS NOT NULL AND series_id IS NULL) OR 
    (movie_id IS NULL AND series_id IS NOT NULL)
  )
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de avaliações
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id),
  UNIQUE(user_id, series_id),
  CONSTRAINT check_rating_content_type CHECK (
    (movie_id IS NOT NULL AND series_id IS NULL) OR 
    (movie_id IS NULL AND series_id IS NOT NULL)
  )
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone" ON public.ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can add ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON public.ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" ON public.ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de preferências do usuário (idioma, controle parental, tema)
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_audio_language TEXT DEFAULT 'Português',
  preferred_subtitle_language TEXT DEFAULT 'Português',
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  parental_control_enabled BOOLEAN DEFAULT false,
  parental_control_pin TEXT,
  parental_control_max_rating TEXT DEFAULT '18+',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Tabela de séries seguidas (para notificações de novos episódios)
CREATE TABLE public.followed_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, series_id)
);

ALTER TABLE public.followed_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their followed series" ON public.followed_series
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can follow series" ON public.followed_series
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow series" ON public.followed_series
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de notificações de novos episódios
CREATE TABLE public.episode_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

ALTER TABLE public.episode_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications" ON public.episode_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read" ON public.episode_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete notifications" ON public.episode_notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.episode_notifications
  FOR INSERT WITH CHECK (true);

-- Trigger para criar notificações quando novo episódio é adicionado
CREATE OR REPLACE FUNCTION public.notify_followers_of_new_episode()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.episode_notifications (user_id, episode_id, series_id)
  SELECT fs.user_id, NEW.id, NEW.series_id
  FROM public.followed_series fs
  WHERE fs.series_id = NEW.series_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_new_episode_notify_followers
  AFTER INSERT ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_of_new_episode();