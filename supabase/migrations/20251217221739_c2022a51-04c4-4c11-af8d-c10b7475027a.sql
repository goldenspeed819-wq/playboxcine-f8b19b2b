-- Enable RLS on blocked_ips (accessed via service role only)
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- No public policies needed - only service role can access this table