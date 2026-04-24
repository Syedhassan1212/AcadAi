-- Setup Storage Buckets for Documents and Note Assets
-- Run this in your Supabase SQL Editor if you get "Bucket not found" errors.

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('study-files', 'study-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('note-assets', 'note-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Add RLS Policies for study-files
CREATE POLICY "Authenticated users can upload study files"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'study-files');

CREATE POLICY "Public can view study files"
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'study-files');

-- 3. Add RLS Policies for note-assets
CREATE POLICY "Authenticated users can upload note assets"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'note-assets');

CREATE POLICY "Public can view note assets"
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'note-assets');
