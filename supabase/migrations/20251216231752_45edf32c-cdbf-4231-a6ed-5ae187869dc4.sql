-- Add user_id column to comments table
ALTER TABLE public.comments 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add avatar_url column to store the user's avatar at time of comment
ALTER TABLE public.comments 
ADD COLUMN user_avatar text;

-- Update RLS policy to allow users to insert comments with their user_id
DROP POLICY IF EXISTS "Anyone can create comments" ON public.comments;

CREATE POLICY "Authenticated users can create comments" 
ON public.comments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);