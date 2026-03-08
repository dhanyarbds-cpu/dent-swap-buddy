
-- Create dedicated video storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-videos', 'listing-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-videos');

-- Allow public read access
CREATE POLICY "Anyone can view listing videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-videos');

-- Allow owners to delete their videos
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listing-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
