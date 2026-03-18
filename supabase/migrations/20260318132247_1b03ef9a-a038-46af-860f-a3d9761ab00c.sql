ALTER TABLE public.series ADD COLUMN IF NOT EXISTS tmdb_id integer;
CREATE INDEX IF NOT EXISTS idx_series_tmdb_id ON public.series(tmdb_id) WHERE tmdb_id IS NOT NULL;