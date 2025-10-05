-- Bulletproof Super Mega Mind Enhancements

-- Feedback Learning System
CREATE TABLE public.ai_feedback_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_category TEXT NOT NULL CHECK (pattern_category IN ('prompt_improvement', 'error_fix', 'code_quality', 'user_preference')),
  original_prompt TEXT NOT NULL,
  improved_prompt TEXT NOT NULL,
  success_rate NUMERIC DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
  times_used INTEGER DEFAULT 0,
  avg_user_rating NUMERIC DEFAULT 0,
  learned_from_feedback_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- Plugin Security Scans
CREATE TABLE public.plugin_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id UUID REFERENCES public.ai_plugins(id) ON DELETE CASCADE NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('code_analysis', 'dependency_check', 'malware_scan', 'api_security')),
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'scanning', 'completed', 'failed')),
  severity_level TEXT CHECK (severity_level IN ('critical', 'high', 'medium', 'low', 'info')),
  vulnerabilities_found JSONB DEFAULT '[]'::jsonb,
  security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
  recommendations JSONB DEFAULT '[]'::jsonb,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin Approval Workflow
CREATE TABLE public.admin_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('plugin', 'model', 'content', 'user_report')),
  item_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reviewer_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  auto_approved BOOLEAN DEFAULT false,
  approval_score NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creator Analytics
CREATE TABLE public.creator_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue', 'downloads', 'ratings', 'active_users', 'engagement')),
  metric_value NUMERIC NOT NULL,
  time_period TEXT NOT NULL CHECK (time_period IN ('hourly', 'daily', 'weekly', 'monthly')),
  plugin_id UUID REFERENCES public.ai_plugins(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Transactions
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  plugin_id UUID REFERENCES public.ai_plugins(id),
  amount_total INTEGER NOT NULL,
  amount_creator INTEGER NOT NULL,
  amount_platform INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-Improvement Logs
CREATE TABLE public.ai_improvement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_type TEXT NOT NULL CHECK (improvement_type IN ('prompt_optimization', 'pattern_learning', 'error_reduction', 'performance_boost')),
  before_metric NUMERIC NOT NULL,
  after_metric NUMERIC NOT NULL,
  improvement_percentage NUMERIC,
  changes_made JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5,
  validation_status TEXT DEFAULT 'testing' CHECK (validation_status IN ('testing', 'validated', 'rolled_back')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ
);

-- Pattern Recognition Cache
CREATE TABLE public.pattern_recognition_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  pattern_signature TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  success_rate NUMERIC DEFAULT 100,
  recommended_action JSONB,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pattern_type, pattern_signature)
);

-- Enable RLS
ALTER TABLE public.ai_feedback_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_improvement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_recognition_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Feedback Patterns: Anyone can read, system can manage
CREATE POLICY "Anyone can view feedback patterns"
ON public.ai_feedback_patterns FOR SELECT
USING (true);

CREATE POLICY "System can manage feedback patterns"
ON public.ai_feedback_patterns FOR ALL
USING (true);

-- Security Scans: Plugin creators and admins can view
CREATE POLICY "Creators can view their plugin security scans"
ON public.plugin_security_scans FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ai_plugins
  WHERE ai_plugins.id = plugin_security_scans.plugin_id
  AND ai_plugins.created_by = auth.uid()
) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage security scans"
ON public.plugin_security_scans FOR ALL
USING (true);

-- Admin Queue: Admins only
CREATE POLICY "Admins can manage approval queue"
ON public.admin_approval_queue FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their submitted items"
ON public.admin_approval_queue FOR SELECT
USING (auth.uid() = submitted_by OR has_role(auth.uid(), 'admin'::app_role));

-- Creator Analytics: Creators can view their own
CREATE POLICY "Creators can view their analytics"
ON public.creator_analytics FOR SELECT
USING (auth.uid() = creator_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert analytics"
ON public.creator_analytics FOR INSERT
WITH CHECK (true);

-- Transactions: Buyers, sellers, and admins
CREATE POLICY "Users can view their transactions"
ON public.payment_transactions FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage transactions"
ON public.payment_transactions FOR ALL
USING (true);

-- Improvement Logs: Admins only
CREATE POLICY "Admins can view improvement logs"
ON public.ai_improvement_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage improvement logs"
ON public.ai_improvement_logs FOR ALL
USING (true);

-- Pattern Cache: Anyone can read, system can manage
CREATE POLICY "Anyone can view patterns"
ON public.pattern_recognition_cache FOR SELECT
USING (true);

CREATE POLICY "System can manage patterns"
ON public.pattern_recognition_cache FOR ALL
USING (true);

-- Indexes for performance
CREATE INDEX idx_feedback_patterns_category ON public.ai_feedback_patterns(pattern_category);
CREATE INDEX idx_feedback_patterns_success ON public.ai_feedback_patterns(success_rate DESC);
CREATE INDEX idx_security_scans_plugin ON public.plugin_security_scans(plugin_id);
CREATE INDEX idx_security_scans_status ON public.plugin_security_scans(scan_status);
CREATE INDEX idx_approval_queue_status ON public.admin_approval_queue(status);
CREATE INDEX idx_approval_queue_priority ON public.admin_approval_queue(priority DESC);
CREATE INDEX idx_creator_analytics_creator ON public.creator_analytics(creator_id);
CREATE INDEX idx_creator_analytics_plugin ON public.creator_analytics(plugin_id);
CREATE INDEX idx_transactions_buyer ON public.payment_transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.payment_transactions(seller_id);
CREATE INDEX idx_transactions_status ON public.payment_transactions(payment_status);
CREATE INDEX idx_pattern_cache_type ON public.pattern_recognition_cache(pattern_type);

-- Function to calculate improvement percentage
CREATE OR REPLACE FUNCTION calculate_improvement_percentage()
RETURNS TRIGGER AS $$
BEGIN
  NEW.improvement_percentage := ((NEW.after_metric - NEW.before_metric) / NEW.before_metric) * 100;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_improvement_percentage
BEFORE INSERT ON public.ai_improvement_logs
FOR EACH ROW
EXECUTE FUNCTION calculate_improvement_percentage();