-- Add framework column to projects table
ALTER TABLE public.projects 
ADD COLUMN framework text DEFAULT 'react' CHECK (framework IN ('react', 'html', 'vue'));

-- Add index for better query performance
CREATE INDEX idx_projects_framework ON public.projects(framework);

-- Update existing projects to have 'react' as default
UPDATE public.projects 
SET framework = 'react' 
WHERE framework IS NULL;