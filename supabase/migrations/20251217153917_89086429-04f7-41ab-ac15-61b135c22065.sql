-- Create table for sub-profiles (up to 5 per account)
CREATE TABLE public.sub_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own sub-profiles
CREATE POLICY "Users can view their own sub-profiles"
ON public.sub_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sub-profiles (with limit check done in app)
CREATE POLICY "Users can insert their own sub-profiles"
ON public.sub_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sub-profiles
CREATE POLICY "Users can update their own sub-profiles"
ON public.sub_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own sub-profiles
CREATE POLICY "Users can delete their own sub-profiles"
ON public.sub_profiles
FOR DELETE
USING (auth.uid() = user_id);