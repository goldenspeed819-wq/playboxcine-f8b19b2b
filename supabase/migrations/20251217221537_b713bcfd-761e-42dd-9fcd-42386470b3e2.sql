-- Create table for blocked IPs
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT DEFAULT 'dev_tools_attempt'
);

-- Create index for faster lookups
CREATE INDEX idx_blocked_ips_address ON public.blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_expires ON public.blocked_ips(expires_at);

-- No RLS needed - this will be accessed via service role from edge function