/**
 * React Hooks for Unified Functions
 * Provides React Query integration with unified function calls
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unifiedFunctions } from "@/lib/unifiedFunctions";
import { toast } from "sonner";

/**
 * AI Workers Hooks
 */
export const useAIChat = () => {
  return useMutation({
    mutationFn: unifiedFunctions.aiWorkers.chat,
    onError: (error: any) => {
      toast.error("Chat failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useCodeGeneration = () => {
  return useMutation({
    mutationFn: unifiedFunctions.aiWorkers.generateCode,
    onError: (error: any) => {
      toast.error("Code generation failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useDebugAssist = () => {
  return useMutation({
    mutationFn: unifiedFunctions.aiWorkers.debugAssist,
    onError: (error: any) => {
      toast.error("Debug assistance failed: " + (error?.message || "Unknown error"));
    },
  });
};

/**
 * Code Operations Hooks
 */
export const useCodeAnalysis = () => {
  return useMutation({
    mutationFn: unifiedFunctions.codeOps.analyze,
    onError: (error: any) => {
      toast.error("Code analysis failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useCodeOptimization = () => {
  return useMutation({
    mutationFn: unifiedFunctions.codeOps.optimize,
    onSuccess: () => {
      toast.success("Code optimized successfully");
    },
    onError: (error: any) => {
      toast.error("Optimization failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useCodeRefactor = () => {
  return useMutation({
    mutationFn: unifiedFunctions.codeOps.refactor,
    onSuccess: () => {
      toast.success("Code refactored successfully");
    },
    onError: (error: any) => {
      toast.error("Refactoring failed: " + (error?.message || "Unknown error"));
    },
  });
};

/**
 * Deployment Hooks
 */
export const useDeployment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unifiedFunctions.deployment.deploy,
    onSuccess: () => {
      toast.success("Deployment initiated successfully");
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
    onError: (error: any) => {
      toast.error("Deployment failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useDeploymentMonitor = (deploymentId: string, enabled = true) => {
  return useQuery({
    queryKey: ["deployment-monitor", deploymentId],
    queryFn: () => unifiedFunctions.deployment.monitor({ deploymentId }),
    enabled: enabled && !!deploymentId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useRollback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unifiedFunctions.deployment.rollback,
    onSuccess: () => {
      toast.success("Rollback completed successfully");
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
    onError: (error: any) => {
      toast.error("Rollback failed: " + (error?.message || "Unknown error"));
    },
  });
};

/**
 * Infrastructure Hooks
 */
export const usePackageInstall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unifiedFunctions.infrastructure.packages.install,
    onSuccess: () => {
      toast.success("Package installed successfully");
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (error: any) => {
      toast.error("Package installation failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useSecurityScan = () => {
  return useMutation({
    mutationFn: unifiedFunctions.infrastructure.security.scan,
    onSuccess: () => {
      toast.success("Security scan completed");
    },
    onError: (error: any) => {
      toast.error("Security scan failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useSnapshotCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unifiedFunctions.infrastructure.snapshots.create,
    onSuccess: () => {
      toast.success("Snapshot created successfully");
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
    onError: (error: any) => {
      toast.error("Snapshot creation failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useSnapshotRestore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unifiedFunctions.infrastructure.snapshots.restore,
    onSuccess: () => {
      toast.success("Snapshot restored successfully");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: any) => {
      toast.error("Snapshot restore failed: " + (error?.message || "Unknown error"));
    },
  });
};

/**
 * Analytics Hooks
 */
export const useTrackEvent = () => {
  return useMutation({
    mutationFn: unifiedFunctions.analytics.trackEvent,
  });
};

export const useAnalyticsDashboard = (userId?: string, projectId?: string) => {
  return useQuery({
    queryKey: ["analytics-dashboard", userId, projectId],
    queryFn: () => unifiedFunctions.analytics.getDashboardData({ userId, projectId }),
    enabled: !!userId || !!projectId,
  });
};

export const useMetrics = (filters?: any, timeRange?: string) => {
  return useQuery({
    queryKey: ["metrics", filters, timeRange],
    queryFn: () => unifiedFunctions.analytics.getMetrics({ filters, timeRange }),
  });
};

/**
 * Quality Hooks
 */
export const useCodeReview = () => {
  return useMutation({
    mutationFn: unifiedFunctions.quality.codeReview,
    onSuccess: () => {
      toast.success("Code review completed");
    },
    onError: (error: any) => {
      toast.error("Code review failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useAccessibilityCheck = () => {
  return useMutation({
    mutationFn: unifiedFunctions.quality.checkAccessibility,
    onError: (error: any) => {
      toast.error("Accessibility check failed: " + (error?.message || "Unknown error"));
    },
  });
};

export const useDocGeneration = () => {
  return useMutation({
    mutationFn: unifiedFunctions.quality.generateDocs,
    onSuccess: () => {
      toast.success("Documentation generated successfully");
    },
    onError: (error: any) => {
      toast.error("Documentation generation failed: " + (error?.message || "Unknown error"));
    },
  });
};

/**
 * Learning Hooks
 */
export const useLearnPattern = () => {
  return useMutation({
    mutationFn: unifiedFunctions.learning.learnPattern,
  });
};

export const useReinforcePattern = () => {
  return useMutation({
    mutationFn: unifiedFunctions.learning.reinforcePattern,
  });
};
