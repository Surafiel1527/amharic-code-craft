/**
 * Predictive Intelligence Hook
 * 
 * Phase 3A: Proactive error detection and code quality prediction
 * Real-time analysis, smart suggestions, performance insights
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface CodeQualityScores {
  quality: number;
  maintainability: number;
  security: number;
  performance: number;
  overall: number;
}

export interface PredictedIssue {
  type: 'error' | 'warning' | 'info';
  category: 'quality' | 'error' | 'performance' | 'security';
  line?: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface ErrorPrediction {
  id: string;
  type: string;
  description: string;
  line?: number;
  confidence: number;
  preventionTip: string;
  autoFixAvailable: boolean;
  status: 'predicted' | 'confirmed' | 'false_positive' | 'resolved';
}

export interface RefactoringSuggestion {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  currentCode: string;
  suggestedCode: string;
  reasoning: string;
  difficulty: 'easy' | 'medium' | 'hard';
  applied: boolean;
}

export interface PerformanceInsight {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedFiles: string[];
  recommendation: string;
  estimatedImprovement?: string;
}

export interface SmartNotification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: string;
}

interface UsePredictiveIntelligenceOptions {
  projectId?: string;
  autoAnalyze?: boolean;
  analysisInterval?: number;
}

export function usePredictiveIntelligence(options: UsePredictiveIntelligenceOptions = {}) {
  const { projectId, autoAnalyze = false, analysisInterval = 5000 } = options;

  const [scores, setScores] = useState<CodeQualityScores | null>(null);
  const [issues, setIssues] = useState<PredictedIssue[]>([]);
  const [errorPredictions, setErrorPredictions] = useState<ErrorPrediction[]>([]);
  const [refactoringSuggestions, setRefactoringSuggestions] = useState<RefactoringSuggestion[]>([]);
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsight[]>([]);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Analyze code for quality, errors, and performance
   */
  const analyzeCode = useCallback(async (code: string, filePath: string) => {
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('predictive-analysis', {
        body: {
          code,
          filePath,
          projectId,
          analysisType: 'all'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.success && data.analysis) {
        const { scores: analysisScores, issues: analysisIssues } = data.analysis;
        
        const overall = (
          analysisScores.quality +
          analysisScores.maintainability +
          analysisScores.security +
          analysisScores.performance
        ) / 4;

        setScores({
          quality: analysisScores.quality,
          maintainability: analysisScores.maintainability,
          security: analysisScores.security,
          performance: analysisScores.performance,
          overall
        });

        setIssues(analysisIssues || []);

        const critical = analysisIssues?.filter((i: PredictedIssue) => i.severity === 'critical') || [];
        if (critical.length > 0) {
          toast.error(`Found ${critical.length} critical issue${critical.length > 1 ? 's' : ''}`, {
            description: 'Check Predictive Analysis panel for details'
          });
        }

        await Promise.all([
          fetchErrorPredictions(),
          fetchRefactoringSuggestions(),
          fetchPerformanceInsights(),
          fetchNotifications()
        ]);
      }

    } catch (error) {
      logger.error('Code analysis error', error);
      toast.error('Failed to analyze code');
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId]);

  const fetchErrorPredictions = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('error_predictions')
        .select('*')
        .eq('status', 'predicted')
        .order('confidence', { ascending: false })
        .limit(20);

      if (error) throw error;
      setErrorPredictions(data?.map((p: any) => ({
        id: p.id,
        type: p.error_type,
        description: p.description,
        line: p.predicted_line,
        confidence: p.confidence,
        preventionTip: p.prevention_suggestion || '',
        autoFixAvailable: p.auto_fix_available,
        status: p.status
      })) || []);
    } catch (error) {
      logger.error('Failed to fetch error predictions', error);
    }
  }, []);

  const fetchRefactoringSuggestions = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('refactoring_suggestions')
        .select('*')
        .eq('applied', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRefactoringSuggestions(data?.map((s: any) => ({
        id: s.id,
        type: s.suggestion_type,
        priority: s.priority,
        description: s.description,
        currentCode: s.current_code,
        suggestedCode: s.suggested_code,
        reasoning: s.reasoning || '',
        difficulty: s.difficulty,
        applied: s.applied
      })) || []);
    } catch (error) {
      logger.error('Failed to fetch refactoring suggestions', error);
    }
  }, []);

  const fetchPerformanceInsights = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('performance_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPerformanceInsights(data?.map((i: any) => ({
        id: i.id,
        type: i.insight_type,
        severity: i.severity,
        title: i.title,
        description: i.description,
        affectedFiles: i.affected_files || [],
        recommendation: i.recommendation,
        estimatedImprovement: i.estimated_improvement
      })) || []);
    } catch (error) {
      logger.error('Failed to fetch performance insights', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('smart_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data?.map((n: any) => ({
        id: n.id,
        type: n.notification_type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        actionUrl: n.action_url,
        actionLabel: n.action_label,
        read: n.read,
        createdAt: n.created_at
      })) || []);
    } catch (error) {
      logger.error('Failed to fetch notifications', error);
    }
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await (supabase as any)
        .from('smart_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
    }
  }, []);

  const applyRefactoring = useCallback(async (suggestionId: string) => {
    try {
      await (supabase as any)
        .from('refactoring_suggestions')
        .update({ applied: true, applied_at: new Date().toISOString() })
        .eq('id', suggestionId);

      setRefactoringSuggestions(prev => prev.map(s =>
        s.id === suggestionId ? { ...s, applied: true } : s
      ));

      toast.success('Refactoring applied successfully');
    } catch (error) {
      logger.error('Failed to apply refactoring', error);
      toast.error('Failed to apply refactoring');
    }
  }, []);

  const confirmError = useCallback(async (predictionId: string, confirmed: boolean) => {
    try {
      await (supabase as any)
        .from('error_predictions')
        .update({
          status: confirmed ? 'confirmed' : 'false_positive',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', predictionId);

      await fetchErrorPredictions();
      toast.success(confirmed ? 'Error confirmed' : 'Marked as false positive');
    } catch (error) {
      logger.error('Failed to update error prediction', error);
      toast.error('Failed to update prediction');
    }
  }, [fetchErrorPredictions]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchErrorPredictions(),
        fetchRefactoringSuggestions(),
        fetchPerformanceInsights(),
        fetchNotifications()
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchErrorPredictions, fetchRefactoringSuggestions, fetchPerformanceInsights, fetchNotifications]);

  useEffect(() => {
    const channel = (supabase as any)
      .channel('predictive-intelligence')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_notifications'
        },
        (payload: any) => {
          const newNotification = payload.new;
          setNotifications(prev => [{
            id: newNotification.id,
            type: newNotification.notification_type,
            priority: newNotification.priority,
            title: newNotification.title,
            message: newNotification.message,
            actionUrl: newNotification.action_url,
            actionLabel: newNotification.action_label,
            read: false,
            createdAt: newNotification.created_at
          }, ...prev]);

          if (newNotification.priority === 'urgent') {
            toast.error(newNotification.title, {
              description: newNotification.message
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    scores,
    issues,
    errorPredictions,
    refactoringSuggestions,
    performanceInsights,
    notifications,
    isAnalyzing,
    loading,
    analyzeCode,
    applyRefactoring,
    confirmError,
    markNotificationRead,
    refreshData: async () => {
      await Promise.all([
        fetchErrorPredictions(),
        fetchRefactoringSuggestions(),
        fetchPerformanceInsights(),
        fetchNotifications()
      ]);
    }
  };
}
