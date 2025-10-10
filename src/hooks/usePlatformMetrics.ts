/**
 * Platform Metrics Hook
 * Provides access to storage and generation metrics
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface StorageSummary {
  totalStorageMb: number;
  totalProjects: number;
  totalFiles: number;
  avgGenerationSizeKb: number;
  largestProjectMb: number;
  lastGeneratedAt: string;
}

interface GenerationStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  successRate: number;
  avgGenerationTimeSec: number;
  totalLinesGenerated: number;
  avgComplexityScore: number;
}

interface PlatformStatistics {
  totalUsers: number;
  totalGenerations: number;
  successRate: number;
  totalStorageGb: number;
  avgGenerationTimeSec: number;
  totalFilesGenerated: number;
  mostPopularFramework: string;
}

/**
 * Get user's storage summary
 */
export const useStorageSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["storage-summary", user?.id],
    queryFn: async (): Promise<StorageSummary> => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .rpc('get_user_storage_summary', { p_user_id: user.id });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          totalStorageMb: 0,
          totalProjects: 0,
          totalFiles: 0,
          avgGenerationSizeKb: 0,
          largestProjectMb: 0,
          lastGeneratedAt: new Date().toISOString()
        };
      }
      
      return {
        totalStorageMb: data[0].total_storage_mb || 0,
        totalProjects: data[0].total_projects || 0,
        totalFiles: data[0].total_files || 0,
        avgGenerationSizeKb: data[0].avg_generation_size_kb || 0,
        largestProjectMb: data[0].largest_project_mb || 0,
        lastGeneratedAt: data[0].last_generated_at || new Date().toISOString()
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
};

/**
 * Get user's generation statistics
 */
export const useGenerationStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["generation-stats", user?.id],
    queryFn: async (): Promise<GenerationStats> => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('platform_generation_stats')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          totalGenerations: 0,
          successfulGenerations: 0,
          failedGenerations: 0,
          successRate: 0,
          avgGenerationTimeSec: 0,
          totalLinesGenerated: 0,
          avgComplexityScore: 0
        };
      }
      
      const successfulGenerations = data.filter(g => g.success).length;
      const failedGenerations = data.length - successfulGenerations;
      const successRate = (successfulGenerations / data.length) * 100;
      
      const avgGenerationTime = data.reduce((sum, g) => sum + (g.generation_time_ms || 0), 0) / data.length;
      const totalLines = data.reduce((sum, g) => sum + (g.total_lines_generated || 0), 0);
      const avgComplexity = data.reduce((sum, g) => sum + (g.complexity_score || 0), 0) / data.length;
      
      return {
        totalGenerations: data.length,
        successfulGenerations,
        failedGenerations,
        successRate,
        avgGenerationTimeSec: avgGenerationTime / 1000,
        totalLinesGenerated: totalLines,
        avgComplexityScore: avgComplexity
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });
};

/**
 * Get recent storage metrics with details
 */
export const useRecentStorageMetrics = (limit = 10) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["recent-storage-metrics", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('platform_storage_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};

/**
 * Get platform-wide statistics (admin only)
 */
export const usePlatformStatistics = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["platform-statistics"],
    queryFn: async (): Promise<PlatformStatistics> => {
      const { data, error } = await supabase.rpc('get_platform_statistics');
      
      if (error) {
        // If access denied, return empty stats
        if (error.message.includes('Access denied')) {
          throw new Error('Admin access required');
        }
        throw error;
      }
      
      if (!data || data.length === 0) {
        return {
          totalUsers: 0,
          totalGenerations: 0,
          successRate: 0,
          totalStorageGb: 0,
          avgGenerationTimeSec: 0,
          totalFilesGenerated: 0,
          mostPopularFramework: 'react'
        };
      }
      
      return {
        totalUsers: data[0].total_users || 0,
        totalGenerations: data[0].total_generations || 0,
        successRate: data[0].success_rate || 0,
        totalStorageGb: data[0].total_storage_gb || 0,
        avgGenerationTimeSec: data[0].avg_generation_time_sec || 0,
        totalFilesGenerated: data[0].total_files_generated || 0,
        mostPopularFramework: data[0].most_popular_framework || 'react'
      };
    },
    enabled: !!user,
    retry: false // Don't retry if access denied
  });
};

/**
 * Get storage growth over time
 */
export const useStorageGrowth = (days = 30) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["storage-growth", user?.id, days],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('platform_storage_metrics')
        .select('total_size_bytes, created_at')
        .eq('user_id', user.id)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};
