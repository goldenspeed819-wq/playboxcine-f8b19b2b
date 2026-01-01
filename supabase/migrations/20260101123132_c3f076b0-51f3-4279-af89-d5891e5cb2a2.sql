-- Drop all existing SELECT policies on profiles to remove conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view linked account profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;

-- Create a single consolidated SELECT policy that covers all legitimate cases
-- Users can view: their own profile, linked account profiles, or admins can view all
CREATE POLICY "Authenticated users can view allowed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR id IN (
    SELECT linked_user_id FROM public.linked_accounts WHERE primary_user_id = auth.uid()
    UNION
    SELECT primary_user_id FROM public.linked_accounts WHERE linked_user_id = auth.uid()
  )
);

-- Explicitly deny anonymous access (anon role gets no access)
-- By not creating any policy for anon, they are denied by default with RLS enabled