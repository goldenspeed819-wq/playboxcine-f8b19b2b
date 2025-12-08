-- Update the videos bucket to allow larger files (up to 50GB)
UPDATE storage.buckets 
SET file_size_limit = 53687091200  -- 50GB in bytes
WHERE id = 'videos';

-- Also ensure the bucket is configured correctly for resumable uploads
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime', 'video/avi']
WHERE id = 'videos';