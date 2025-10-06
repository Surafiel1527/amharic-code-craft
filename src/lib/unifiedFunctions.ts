/**
 * Unified Functions Client Library
 * Enterprise-grade client for interacting with consolidated edge functions
 */

import { supabase } from "@/integrations/supabase/client";
import { trackError } from "./errorTracking";

// Base function invoker with error handling and retry logic
async function invokeUnifiedFunction<T = any>(
  functionName: string,
  operation: string,
  params: Record<string, any> = {},
  retries = 3
): Promise<{ data: T | null; error: any }> {
  let lastError: any;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { operation, params },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      lastError = error;
      
      // Track error on final attempt
      if (attempt === retries - 1) {
        trackError(error, {
          function: functionName,
          operation,
          params,
          attempt: attempt + 1,
        });
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return { data: null, error: lastError };
}

/**
 * AI Workers Unified Client
 * Consolidates: chat, code generation, debug assistance, test generation, reasoning, knowledge retrieval
 */
export const aiWorkers = {
  chat: (params: { message: string; conversationId?: string; context?: any }) =>
    invokeUnifiedFunction("unified-ai-workers", "chat", params),

  generateCode: (params: { prompt: string; language?: string; context?: any }) =>
    invokeUnifiedFunction("unified-ai-workers", "code_generation", params),

  debugAssist: (params: { code: string; error: string; context?: any }) =>
    invokeUnifiedFunction("unified-ai-workers", "debug_assistance", params),

  generateTests: (params: { code: string; framework?: string }) =>
    invokeUnifiedFunction("unified-ai-workers", "test_generation", params),

  reason: (params: { problem: string; context?: any }) =>
    invokeUnifiedFunction("unified-ai-workers", "basic_reasoning", params),

  retrieveKnowledge: (params: { query: string; category?: string }) =>
    invokeUnifiedFunction("unified-ai-workers", "knowledge_retrieval", params),
};

/**
 * Code Operations Unified Client
 * Consolidates: analysis, optimization, refactoring, testing, component generation
 */
export const codeOps = {
  analyze: (params: { code: string; language: string }) =>
    invokeUnifiedFunction("unified-code-operations", "analyze", params),

  optimize: (params: { code: string; optimizationType?: string }) =>
    invokeUnifiedFunction("unified-code-operations", "optimize", params),

  refactor: (params: { code: string; refactorType: string }) =>
    invokeUnifiedFunction("unified-code-operations", "refactor", params),

  runTests: (params: { projectId: string; testFiles?: string[] }) =>
    invokeUnifiedFunction("unified-code-operations", "run_tests", params),

  generateComponent: (params: { description: string; framework?: string }) =>
    invokeUnifiedFunction("unified-code-operations", "generate_component", params),
};

/**
 * Deployment Unified Client
 * Consolidates: deployment execution, monitoring, builds, rollbacks, health checks
 */
export const deployment = {
  deploy: (params: { projectId: string; environment?: string }) =>
    invokeUnifiedFunction("unified-deployment", "deploy", params),

  monitor: (params: { deploymentId: string }) =>
    invokeUnifiedFunction("unified-deployment", "monitor", params),

  build: (params: { projectId: string; buildConfig?: any }) =>
    invokeUnifiedFunction("unified-deployment", "build", params),

  rollback: (params: { deploymentId: string; targetVersion?: string }) =>
    invokeUnifiedFunction("unified-deployment", "rollback", params),

  healthCheck: (params: { deploymentId: string }) =>
    invokeUnifiedFunction("unified-deployment", "health_check", params),
};

/**
 * Infrastructure Unified Client
 * Consolidates: database ops, packages, security, admin, snapshots
 */
export const infrastructure = {
  database: {
    query: (params: { query: string; params?: any[] }) =>
      invokeUnifiedFunction("unified-infrastructure", "db_query", params),

    migrate: (params: { migration: string }) =>
      invokeUnifiedFunction("unified-infrastructure", "db_migrate", params),
  },

  packages: {
    install: (params: { packageName: string; version?: string }) =>
      invokeUnifiedFunction("unified-infrastructure", "package_install", params),

    uninstall: (params: { packageName: string }) =>
      invokeUnifiedFunction("unified-infrastructure", "package_uninstall", params),

    audit: (params: { projectId: string }) =>
      invokeUnifiedFunction("unified-infrastructure", "package_audit", params),
  },

  security: {
    scan: (params: { projectId: string; scanType?: string }) =>
      invokeUnifiedFunction("unified-infrastructure", "security_scan", params),
  },

  admin: {
    getStats: () =>
      invokeUnifiedFunction("unified-infrastructure", "admin_stats", {}),
  },

  snapshots: {
    create: (params: { projectId: string; description?: string }) =>
      invokeUnifiedFunction("unified-infrastructure", "snapshot_create", params),

    restore: (params: { snapshotId: string }) =>
      invokeUnifiedFunction("unified-infrastructure", "snapshot_restore", params),
  },
};

/**
 * Monitoring & Analytics Unified Client
 */
export const monitoring = {
  trackMetric: (params: { metricType: string; value: number; metadata?: any }) =>
    invokeUnifiedFunction("unified-monitoring", "track_metric", params),

  trackError: (params: { error: string; severity: string; context?: any }) =>
    invokeUnifiedFunction("unified-monitoring", "track_error", params),

  trackEvent: (params: { eventType: string; eventData: any }) =>
    invokeUnifiedFunction("unified-monitoring", "track_event", params),

  getHealthStatus: (params: { projectId?: string }) =>
    invokeUnifiedFunction("unified-monitoring", "health_status", params),
};

/**
 * Learning Systems Unified Client
 */
export const learning = {
  learnFromConversation: (params: { conversationId: string; patterns: any[] }) =>
    invokeUnifiedFunction("unified-learning", "learn_conversation", params),

  learnPattern: (params: { pattern: any; category: string }) =>
    invokeUnifiedFunction("unified-learning", "learn_pattern", params),

  learnPreferences: (params: { userId: string; preferences: any }) =>
    invokeUnifiedFunction("unified-learning", "learn_preferences", params),

  reinforcePattern: (params: { patternId: string; success: boolean }) =>
    invokeUnifiedFunction("unified-learning", "reinforce_pattern", params),

  learnFromFeedback: (params: { feedback: any; context: any }) =>
    invokeUnifiedFunction("unified-learning", "learn_feedback", params),
};

/**
 * Quality & Documentation Unified Client
 */
export const quality = {
  analyzeQuality: (params: { code: string; standards?: string[] }) =>
    invokeUnifiedFunction("unified-quality", "analyze_quality", params),

  reviewCode: (params: { code: string; reviewType?: string }) =>
    invokeUnifiedFunction("unified-quality", "review_code", params),

  auditSecurity: (params: { projectId: string }) =>
    invokeUnifiedFunction("unified-quality", "audit_security", params),

  auditPerformance: (params: { projectId: string }) =>
    invokeUnifiedFunction("unified-quality", "audit_performance", params),

  checkAccessibility: (params: { html: string; wcagLevel?: string }) =>
    invokeUnifiedFunction("unified-quality", "check_accessibility", params),

  generateDocs: (params: { code: string; docType?: string }) =>
    invokeUnifiedFunction("unified-quality", "generate_docs", params),
};

/**
 * Unified Analytics Client
 */
export const analytics = {
  trackEvent: (params: { eventType: string; eventData: any; userId?: string }) =>
    invokeUnifiedFunction("unified-analytics", "track_event", params),

  trackMetric: (params: { metricType: string; value: number; metadata?: any }) =>
    invokeUnifiedFunction("unified-analytics", "track_metric", params),

  getMetrics: (params: { filters?: any; timeRange?: string }) =>
    invokeUnifiedFunction("unified-analytics", "get_metrics", params),

  getUserStats: (params: { userId: string; timeRange?: string }) =>
    invokeUnifiedFunction("unified-analytics", "get_user_stats", params),

  getTrends: (params: { metricType: string; timeRange?: string; granularity?: string }) =>
    invokeUnifiedFunction("unified-analytics", "get_trends", params),

  aggregateData: (params: { groupBy: string; filters?: any }) =>
    invokeUnifiedFunction("unified-analytics", "aggregate_data", params),

  exportAnalytics: (params: { filters?: any; format?: string }) =>
    invokeUnifiedFunction("unified-analytics", "export_analytics", params),

  getDashboardData: (params: { userId?: string; projectId?: string }) =>
    invokeUnifiedFunction("unified-analytics", "get_dashboard_data", params),
};

// Export all clients
export const unifiedFunctions = {
  aiWorkers,
  codeOps,
  deployment,
  infrastructure,
  monitoring,
  learning,
  quality,
  analytics,
};
