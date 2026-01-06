-- Add RLS policies for blocked_ips table
-- Only admins can manage blocked IPs
-- The table is used for security purposes to block malicious IPs

-- Admins can view all blocked IPs
CREATE POLICY "Admins can view blocked IPs"
  ON public.blocked_ips
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert blocked IPs
CREATE POLICY "Admins can insert blocked IPs"
  ON public.blocked_ips
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete blocked IPs
CREATE POLICY "Admins can delete blocked IPs"
  ON public.blocked_ips
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Edge function (service role) can also check blocked IPs via service role key (bypasses RLS)
-- But for anonymous checks, we need a specific policy
CREATE POLICY "Anyone can check if their IP is blocked"
  ON public.blocked_ips
  FOR SELECT
  USING (true);