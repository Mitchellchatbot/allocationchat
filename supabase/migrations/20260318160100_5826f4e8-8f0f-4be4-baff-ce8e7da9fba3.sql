CREATE POLICY "Anonymous can upload widget images"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'agent-avatars'
  AND (storage.foldername(name))[1] = 'widget-uploads'
);