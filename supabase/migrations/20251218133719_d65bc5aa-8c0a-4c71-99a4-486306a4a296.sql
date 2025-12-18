-- Drop the unused admins table that contains exposed credentials
-- The application uses Supabase Auth + user_roles table for admin authentication

-- First drop the RLS policy
DROP POLICY IF EXISTS "Admins readable by system" ON public.admins;

-- Then drop the table
DROP TABLE IF EXISTS public.admins;