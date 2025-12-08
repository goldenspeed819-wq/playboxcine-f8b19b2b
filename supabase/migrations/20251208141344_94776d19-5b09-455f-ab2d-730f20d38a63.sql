-- Update the videos bucket to allow even larger files (up to 100GB)
UPDATE storage.buckets 
SET file_size_limit = 107374182400  -- 100GB in bytes
WHERE id = 'videos';