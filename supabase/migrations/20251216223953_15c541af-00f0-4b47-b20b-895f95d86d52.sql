-- Create live_channels table for iframe-based streams
CREATE TABLE public.live_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  thumbnail text,
  iframe_url text NOT NULL,
  category text,
  is_featured boolean DEFAULT false,
  is_live boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_channels ENABLE ROW LEVEL SECURITY;

-- Everyone can view channels
CREATE POLICY "Live channels are viewable by everyone" 
ON public.live_channels 
FOR SELECT 
USING (true);

-- Admins can manage channels
CREATE POLICY "Admins can manage live channels" 
ON public.live_channels 
FOR ALL 
USING (true);