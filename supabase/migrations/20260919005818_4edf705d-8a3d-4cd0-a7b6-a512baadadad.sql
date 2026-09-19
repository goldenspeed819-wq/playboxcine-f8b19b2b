ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS tmdb_id integer;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS pending_content boolean NOT NULL DEFAULT false;
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS pending_content boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.content_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  title text NOT NULL,
  content_type text NOT NULL,
  content_id uuid,
  tmdb_id integer,
  requested_by uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.content_requests TO authenticated;
GRANT UPDATE, DELETE ON public.content_requests TO authenticated;
GRANT ALL ON public.content_requests TO service_role;

ALTER TABLE public.content_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view requests" ON public.content_requests
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create requests" ON public.content_requests
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update requests" ON public.content_requests
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete requests" ON public.content_requests
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));