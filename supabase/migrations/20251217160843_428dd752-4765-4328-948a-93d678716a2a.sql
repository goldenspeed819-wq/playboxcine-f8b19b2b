-- Allow users to view profiles of their linked accounts
CREATE POLICY "Users can view linked account profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT linked_user_id FROM public.linked_accounts WHERE primary_user_id = auth.uid()
    UNION
    SELECT primary_user_id FROM public.linked_accounts WHERE linked_user_id = auth.uid()
  )
);