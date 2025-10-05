-- Create table for visual code generations
CREATE TABLE IF NOT EXISTS public.visual_code_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  has_image BOOLEAN NOT NULL DEFAULT false,
  framework TEXT NOT NULL,
  styling TEXT NOT NULL,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_code JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for multi-modal generations
CREATE TABLE IF NOT EXISTS public.multi_modal_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  included_images BOOLEAN NOT NULL DEFAULT false,
  included_code BOOLEAN NOT NULL DEFAULT false,
  images_generated INTEGER NOT NULL DEFAULT 0,
  has_code BOOLEAN NOT NULL DEFAULT false,
  generation_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visual_code_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_modal_generations ENABLE ROW LEVEL SECURITY;

-- Policies for visual_code_generations
CREATE POLICY "Users can view their own visual code generations"
  ON public.visual_code_generations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert visual code generations"
  ON public.visual_code_generations
  FOR INSERT
  WITH CHECK (true);

-- Policies for multi_modal_generations
CREATE POLICY "Users can view their own multi-modal generations"
  ON public.multi_modal_generations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert multi-modal generations"
  ON public.multi_modal_generations
  FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_visual_code_user_id ON public.visual_code_generations(user_id);
CREATE INDEX idx_visual_code_created_at ON public.visual_code_generations(created_at DESC);
CREATE INDEX idx_multi_modal_user_id ON public.multi_modal_generations(user_id);
CREATE INDEX idx_multi_modal_created_at ON public.multi_modal_generations(created_at DESC);