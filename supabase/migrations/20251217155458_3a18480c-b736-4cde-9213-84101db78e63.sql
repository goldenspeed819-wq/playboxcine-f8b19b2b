-- Create a table to link accounts together
CREATE TABLE public.linked_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_user_id UUID NOT NULL,
  linked_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(primary_user_id, linked_user_id)
);

-- Enable RLS
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their linked accounts (both as primary or linked)
CREATE POLICY "Users can view their linked accounts"
ON public.linked_accounts
FOR SELECT
USING (auth.uid() = primary_user_id OR auth.uid() = linked_user_id);

-- Users can link accounts to their own
CREATE POLICY "Users can link accounts"
ON public.linked_accounts
FOR INSERT
WITH CHECK (auth.uid() = primary_user_id);

-- Users can unlink accounts
CREATE POLICY "Users can unlink accounts"
ON public.linked_accounts
FOR DELETE
USING (auth.uid() = primary_user_id OR auth.uid() = linked_user_id);