import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RuntimeError {
  id: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  filePath?: string;
  lineNumber?: number;
  severity: 'critical' | 'error' | 'warning';
  status: 'new' | 'analyzing' | 'fixed' | 'ignored';
  occurredAt: string;
}

export interface ErrorAnalysis {
  rootCause: string;
  category: string;
  affectedComponents: string[];
  errorPath: string[];
  confidence: number;
  relatedIssues?: string[];
  preventionStrategy?: string;
}

export interface ErrorFix {
  id: string;
  type: string;
  priority: number;
  description: string;
  originalCode?: string;
  fixedCode: string;
  explanation: string;
  steps: string[];
  applied: boolean;
}

interface UseSmartDebuggerOptions {
  projectId?: string;
  autoAnalyze?: boolean;
}

export const useSmartDebugger = (options: UseSmartDebuggerOptions = {}) => {
  const { projectId, autoAnalyze = true } = options;
  const { toast } = useToast();
  
  const [errors, setErrors] = useState<RuntimeError[]>([]);
  const [currentError, setCurrentError] = useState<RuntimeError | null>(null);
  const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null);
  const [fixes, setFixes] = useState<ErrorFix[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugSessionId, setDebugSessionId] = useState<string | null>(null);

  // Capture and analyze error
  const captureError = useCallback(async (errorData: {
    message: string;
    stack?: string;
    type?: string;
    file?: string;
    line?: number;
    column?: number;
  }) => {
    try {
      // Store error in database
      const { data: storedError, error: storeError } = await supabase
        .from('runtime_errors' as any)
        .insert({
          project_id: projectId,
          error_type: errorData.type || 'runtime',
          error_message: errorData.message,
          stack_trace: errorData.stack,
          file_path: errorData.file,
          line_number: errorData.line,
          column_number: errorData.column,
          browser_info: {
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`
          }
        })
        .select()
        .single();

      if (storeError) throw storeError;

      setErrors(prev => [storedError as any, ...prev]);
      
      // Show toast
      toast({
        title: '🐛 Error Detected',
        description: errorData.message.substring(0, 100),
        variant: 'destructive'
      });

      return storedError;
    } catch (error) {
      console.error('Failed to capture error:', error);
      return null;
    }
  }, [projectId, toast]);

  // Auto-detect runtime errors
  useEffect(() => {
    if (!autoAnalyze) return;

    const errorHandler = async (event: ErrorEvent) => {
      await captureError({
        message: event.message,
        stack: event.error?.stack,
        type: 'runtime',
        file: event.filename,
        line: event.lineno,
        column: event.colno
      });
    };

    const rejectionHandler = async (event: PromiseRejectionEvent) => {
      await captureError({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        type: 'promise-rejection'
      });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [autoAnalyze, captureError]);

  // Create debugging session
  const startDebuggingSession = useCallback(async (type: 'manual' | 'auto' | 'proactive' = 'manual') => {
    try {
      const { data, error } = await supabase
        .from('debugging_sessions' as any)
        .insert({
          project_id: projectId,
          session_type: type
        })
        .select()
        .single();

      if (error || !data) throw error || new Error('No data returned');
      setDebugSessionId((data as any).id);
      return (data as any).id;
    } catch (error) {
      console.error('Failed to start debugging session:', error);
      return null;
    }
  }, [projectId]);

  // Analyze error with AI
  const analyzeError = useCallback(async (error: RuntimeError, codeContext?: string) => {
    setIsAnalyzing(true);
    setCurrentError(error);
    
    try {
      const { data, error: debugError } = await supabase.functions.invoke('smart-debugger', {
        body: {
          error: {
            message: error.errorMessage,
            stack: error.stackTrace,
            type: error.errorType,
            file: error.filePath,
            line: error.lineNumber,
            column: (error as any).columnNumber
          },
          context: {
            code: codeContext,
            browserInfo: (error as any).browser_info
          },
          projectId
        }
      });

      if (debugError) throw debugError;

      if (data.success) {
        setAnalysis(data.analysis);
        setFixes(data.fixes);

        toast({
          title: '✅ Analysis Complete',
          description: `${data.fixes.length} fix${data.fixes.length > 1 ? 'es' : ''} generated`,
        });

        return data;
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Unable to analyze error',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId, toast]);

  // Apply a fix
  const applyFix = useCallback(async (fixId: string) => {
    try {
      const { error } = await supabase
        .from('error_fixes' as any)
        .update({ 
          applied: true,
          applied_at: new Date().toISOString()
        })
        .eq('id', fixId);

      if (error) throw error;

      setFixes(prev =>
        prev.map(f => f.id === fixId ? { ...f, applied: true } : f)
      );

      toast({
        title: '✅ Fix Applied',
        description: 'Error fix has been applied successfully',
      });

      return true;
    } catch (error) {
      console.error('Error applying fix:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply fix',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Get recent errors
  const getRecentErrors = useCallback(async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('runtime_errors' as any)
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setErrors(data as any);
      return data;
    } catch (error) {
      console.error('Failed to fetch errors:', error);
      return [];
    }
  }, []);

  // Get error patterns
  const getErrorPatterns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('error_patterns' as any)
        .select('*')
        .order('detection_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
      return [];
    }
  }, []);

  return {
    errors,
    currentError,
    analysis,
    fixes,
    isAnalyzing,
    debugSessionId,
    startDebuggingSession,
    captureError,
    analyzeError,
    applyFix,
    getRecentErrors,
    getErrorPatterns
  };
};
