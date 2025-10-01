-- Add new columns to projects table
ALTER TABLE public.projects
ADD COLUMN is_public BOOLEAN DEFAULT false,
ADD COLUMN is_favorite BOOLEAN DEFAULT false,
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN views_count INTEGER DEFAULT 0,
ADD COLUMN forked_from UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN share_token TEXT UNIQUE;

-- Add templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  html_code TEXT NOT NULL,
  preview_image TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates (public read, admin write)
CREATE POLICY "Templates are viewable by everyone"
ON public.templates FOR SELECT
USING (true);

CREATE POLICY "Admins can insert templates"
ON public.templates FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update templates"
ON public.templates FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete templates"
ON public.templates FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create images table for AI-generated images
CREATE TABLE public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  image_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on images
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for images
CREATE POLICY "Users can view their own images"
ON public.generated_images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own images"
ON public.generated_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
ON public.generated_images FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON public.projects(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_projects_is_favorite ON public.projects(is_favorite, user_id) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_projects_tags ON public.projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON public.templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);

-- Trigger for templates updated_at
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'base64');
END;
$$;

-- Update RLS policy for projects to allow public viewing
CREATE POLICY "Public projects are viewable by everyone"
ON public.projects FOR SELECT
USING (is_public = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Insert some starter templates
INSERT INTO public.templates (title, description, category, prompt, html_code, tags, is_featured) VALUES
('የቡና ቤት ድህረ ገፅ', 'ለቡና ቤት ሙሉ ተግባራዊ ድህረ ገፅ', 'ንግድ', 'ለቡና ቤቴ ቆንጆ ድህረ ገፅ ፍጠር። የቡና ምስሎች፣ የቡና አይነቶች እና ዋጋዎች፣ የመገኛ አድራሻ እና የድህረ ገፁ ቆንጆ ዲዛይን ይኑረው።', '<!DOCTYPE html><html lang="am"><head><meta charset="UTF-8"><title>የቡና ቤት</title></head><body><h1>እንኳን ደህና መጡ</h1></body></html>', ARRAY['ቡና', 'ንግድ', 'ምግብ'], true),
('የግል ብሎግ', 'ለግል ብሎግ ዘመናዊ ድህረ ገፅ', 'ብሎግ', 'ለግል ብሎግ ድህረ ገፅ ፍጠር። የብሎግ ፖስቶች፣ ስለኔ ክፍል፣ የመገናኛ ቅጽ እና ማህበራዊ ሚዲያ አገናኞች ይኑሩት።', '<!DOCTYPE html><html lang="am"><head><meta charset="UTF-8"><title>ብሎግ</title></head><body><h1>የእኔ ብሎግ</h1></body></html>', ARRAY['ብሎግ', 'የግል'], true),
('የፖርትፎሊዮ ድህረ ገፅ', 'ለአርቲስቶች እና ፎቶግራፈሮች', 'ፖርትፎሊዮ', 'ለአርቲስት ወይም ፎቶግራፈር የፖርትፎሊዮ ድህረ ገፅ ፍጠር። የስራ ማሳያ ክፍል፣ ስለኔ፣ እና የመገናኛ ቅጽ።', '<!DOCTYPE html><html lang="am"><head><meta charset="UTF-8"><title>ፖርትፎሊዮ</title></head><body><h1>የእኔ ስራዎች</h1></body></html>', ARRAY['ፖርትፎሊዮ', 'ስነ-ጥበብ'], true);