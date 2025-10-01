-- Create storage bucket for theme screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-screenshots', 'theme-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Add screenshot_url column to customization_snapshots
ALTER TABLE customization_snapshots
ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Create RLS policies for theme screenshots bucket
CREATE POLICY "Admins can upload theme screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'theme-screenshots' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view theme screenshots"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'theme-screenshots');

CREATE POLICY "Admins can delete theme screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'theme-screenshots' 
  AND has_role(auth.uid(), 'admin'::app_role)
);