-- Add intro start and end time columns to episodes table
ALTER TABLE public.episodes 
ADD COLUMN intro_start INTEGER DEFAULT NULL,
ADD COLUMN intro_end INTEGER DEFAULT NULL;

-- intro_start and intro_end are in seconds