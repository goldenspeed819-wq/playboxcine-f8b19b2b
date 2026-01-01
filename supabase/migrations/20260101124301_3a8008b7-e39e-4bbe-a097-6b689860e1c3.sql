-- Create table for banned users
CREATE TABLE public.banned_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_code text NOT NULL,
  banned_by uuid NOT NULL,
  reason text DEFAULT 'Violação dos termos de uso',
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_permanent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view banned users
CREATE POLICY "Admins can view banned users"
ON public.banned_users
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only User001/Fundador can manage banned users (insert/update/delete)
CREATE POLICY "Founder can manage banned users"
ON public.banned_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (user_code = 'User001' OR user_code = 'Fundador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (user_code = 'User001' OR user_code = 'Fundador')
  )
);

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS TABLE(is_banned boolean, expires_at timestamp with time zone, reason text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    true as is_banned,
    bu.expires_at,
    bu.reason
  FROM public.banned_users bu
  WHERE bu.user_id = _user_id
    AND (bu.is_permanent = true OR bu.expires_at > now())
  LIMIT 1;
$$;