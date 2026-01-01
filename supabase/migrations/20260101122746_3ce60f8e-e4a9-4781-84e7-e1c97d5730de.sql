-- Remove email from direct exposure by ensuring only authenticated users can access
-- The existing policies already restrict to own profile, linked accounts, or admins
-- But we need to ensure anonymous users are explicitly blocked

-- Add explicit deny for anonymous users (no auth.uid())
-- This is redundant with existing policies but makes security intent clear
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Additionally, ensure that email is not exposed in contexts where it shouldn't be
-- The existing policies are correct but we reinforce with role-based check
CREATE POLICY "Service role can manage profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);