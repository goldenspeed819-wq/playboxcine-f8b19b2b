
-- Add unique constraint on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username) WHERE username IS NOT NULL;

-- Function to get auth email by username (for login)
CREATE OR REPLACE FUNCTION public.get_auth_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE username = _username LIMIT 1;
$$;
