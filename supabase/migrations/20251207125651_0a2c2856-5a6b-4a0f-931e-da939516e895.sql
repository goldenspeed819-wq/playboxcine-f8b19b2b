-- Fix function search path
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'User' || LPAD(nextval('public.user_code_seq')::text, 3, '0');
END;
$$;