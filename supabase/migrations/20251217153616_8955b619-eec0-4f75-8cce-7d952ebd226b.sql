-- Create table to track watched episodes
CREATE TABLE public.watched_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, episode_id)
);

-- Enable RLS
ALTER TABLE public.watched_episodes ENABLE ROW LEVEL SECURITY;

-- Users can view their own watched episodes
CREATE POLICY "Users can view their own watched episodes"
ON public.watched_episodes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own watched episodes
CREATE POLICY "Users can insert their own watched episodes"
ON public.watched_episodes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own watched episodes
CREATE POLICY "Users can update their own watched episodes"
ON public.watched_episodes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own watched episodes
CREATE POLICY "Users can delete their own watched episodes"
ON public.watched_episodes
FOR DELETE
USING (auth.uid() = user_id);