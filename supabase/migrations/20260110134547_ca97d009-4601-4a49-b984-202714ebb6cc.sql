-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view allowed profiles" ON public.profiles;

-- Create a more restrictive policy for profiles
-- Users can only see their own profile (full access including email)
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Create a secure function to get linked account profiles WITHOUT exposing emails
-- This function returns only non-sensitive profile data (username, avatar, user_code)
CREATE OR REPLACE FUNCTION public.get_linked_profile_safe(profile_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  user_code text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requester has permission to see this profile
  -- Either it's their own profile, they're an admin, or it's a linked account
  IF EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = profile_id 
    AND (
      p.id = auth.uid() 
      OR has_role(auth.uid(), 'admin')
      OR profile_id IN (
        SELECT linked_user_id FROM linked_accounts WHERE primary_user_id = auth.uid()
        UNION
        SELECT primary_user_id FROM linked_accounts WHERE linked_user_id = auth.uid()
      )
    )
  ) THEN
    RETURN QUERY
    SELECT p.id, p.username, p.avatar_url, p.user_code
    FROM profiles p
    WHERE p.id = profile_id;
  ELSE
    -- Return empty result if not authorized
    RETURN;
  END IF;
END;
$$;