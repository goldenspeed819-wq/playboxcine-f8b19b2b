-- Create watched_movies table for movie watch history with progress
CREATE TABLE IF NOT EXISTS public.watched_movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- Enable RLS
ALTER TABLE public.watched_movies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own watched movies"
  ON public.watched_movies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watched movies"
  ON public.watched_movies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watched movies"
  ON public.watched_movies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watched movies"
  ON public.watched_movies FOR DELETE
  USING (auth.uid() = user_id);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Everyone can view active notifications"
  ON public.admin_notifications FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Founder can manage notifications"
  ON public.admin_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_code = 'User001' OR profiles.user_code = 'Fundador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_code = 'User001' OR profiles.user_code = 'Fundador')
    )
  );

-- Create dismissed notifications table to track which users have dismissed which notifications
CREATE TABLE IF NOT EXISTS public.dismissed_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Enable RLS
ALTER TABLE public.dismissed_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for dismissed notifications
CREATE POLICY "Users can view their own dismissed notifications"
  ON public.dismissed_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss notifications"
  ON public.dismissed_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add progress tracking to existing watched_episodes if not exists
-- The column already exists based on the types file, so we skip this