-- Dedicated storage bucket for doctor-uploaded files from the chat widget
-- (CVs, ID scans, etc.). Previously these were dumped into agent-avatars
-- under a widget-uploads/ prefix — splitting them out keeps avatars clean
-- and lets us set tighter mime/size constraints on visitor uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-attachments',
  'doctor-attachments',
  true, -- public so dashboard preview / download URLs work without signed URLs
  10485760, -- 10 MB cap, mirrored client-side in the widget
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for the bucket: anonymous visitors must be able to upload
-- (they're not authenticated when they use the widget) and the public
-- internet must be able to read (for dashboard preview / download links).
-- Mirrors the agent-avatars policies that already work.

-- Anyone can read
DROP POLICY IF EXISTS "doctor_attachments_public_read" ON storage.objects;
CREATE POLICY "doctor_attachments_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'doctor-attachments');

-- Anonymous + authenticated can upload
DROP POLICY IF EXISTS "doctor_attachments_anon_insert" ON storage.objects;
CREATE POLICY "doctor_attachments_anon_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'doctor-attachments');
