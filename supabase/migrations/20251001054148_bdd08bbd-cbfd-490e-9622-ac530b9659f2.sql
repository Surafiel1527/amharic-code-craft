-- Create user_follows table for follower system
CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create project_comments table
CREATE TABLE IF NOT EXISTS public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES public.project_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create project_ratings table
CREATE TABLE IF NOT EXISTS public.project_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create featured_projects table
CREATE TABLE IF NOT EXISTS public.featured_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  featured_by uuid NOT NULL REFERENCES auth.users(id),
  featured_at timestamp with time zone NOT NULL DEFAULT now(),
  display_order integer DEFAULT 0,
  UNIQUE(project_id)
);

-- Add bio and social links to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS github text,
  ADD COLUMN IF NOT EXISTS twitter text;

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_follows
CREATE POLICY "Anyone can view follows"
  ON public.user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- RLS Policies for project_comments
CREATE POLICY "Anyone can view comments on public projects"
  ON public.project_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_comments.project_id 
      AND projects.is_public = true
    )
  );

CREATE POLICY "Authenticated users can comment"
  ON public.project_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.project_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.project_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for project_ratings
CREATE POLICY "Anyone can view ratings on public projects"
  ON public.project_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_ratings.project_id 
      AND projects.is_public = true
    )
  );

CREATE POLICY "Authenticated users can rate"
  ON public.project_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.project_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.project_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for featured_projects
CREATE POLICY "Anyone can view featured projects"
  ON public.featured_projects FOR SELECT
  USING (true);

CREATE POLICY "Admins can feature projects"
  ON public.featured_projects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update featured projects"
  ON public.featured_projects FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove featured projects"
  ON public.featured_projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project ON public.project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_user ON public.project_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_ratings_project ON public.project_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ratings_user ON public.project_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_projects_order ON public.featured_projects(display_order);

-- Trigger for updating comment timestamps
CREATE TRIGGER update_project_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating rating timestamps
CREATE TRIGGER update_project_ratings_updated_at
  BEFORE UPDATE ON public.project_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();