-- Add framework column to generation_analytics table
ALTER TABLE generation_analytics 
ADD COLUMN framework text;

-- Add index for better query performance
CREATE INDEX idx_generation_analytics_framework ON generation_analytics(framework);

-- Add comment for documentation
COMMENT ON COLUMN generation_analytics.framework IS 'The framework used for generation (html, react, vue, etc.)';