-- Create posts table for blog
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts table
-- Anyone can view all posts
CREATE POLICY "Anyone can view posts"
    ON public.posts
    FOR SELECT
    USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
    ON public.posts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
    ON public.posts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
    ON public.posts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();