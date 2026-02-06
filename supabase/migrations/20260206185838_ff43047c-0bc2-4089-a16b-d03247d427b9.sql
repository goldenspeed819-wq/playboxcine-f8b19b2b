-- Create table for VIP/whitelisted users
CREATE TABLE public.vip_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  user_code TEXT NOT NULL,
  added_by UUID NOT NULL,
  reason TEXT DEFAULT 'VIP',
  no_ads BOOLEAN DEFAULT true,
  no_ip_ban BOOLEAN DEFAULT true,
  allow_devtools BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_users ENABLE ROW LEVEL SECURITY;

-- Only Fundador can manage VIP users
CREATE POLICY "Founder can manage VIP users"
ON public.vip_users
FOR ALL
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

-- Anyone can check if they are VIP (for client-side checks)
CREATE POLICY "Users can check their own VIP status"
ON public.vip_users
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check VIP status (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_user_vip(_user_id uuid)
RETURNS TABLE(is_vip boolean, no_ads boolean, no_ip_ban boolean, allow_devtools boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    true as is_vip,
    vu.no_ads,
    vu.no_ip_ban,
    vu.allow_devtools
  FROM public.vip_users vu
  WHERE vu.user_id = _user_id
  LIMIT 1;
$$;