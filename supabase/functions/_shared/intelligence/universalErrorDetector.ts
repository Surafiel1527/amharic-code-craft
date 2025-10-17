/**
 * UNIVERSAL ERROR DETECTOR
 * 
 * ENTERPRISE PATTERN: Comprehensive Multi-Layer Error Detection
 * 
 * This system detects and logs ALL types of errors:
 * 1. Runtime/Browser Errors
 * 2. Build/Compilation Errors
 * 3. Authentication/RLS Errors
 * 4. Edge Function Failures
 * 5. Performance/Memory Issues
 * 6. Dependency Conflicts
 * 7. TypeScript Errors
 * 8. Network/API Failures
 * 
 * Every error is automatically logged to detected_errors table
 * so the agent ALWAYS has context for self-healing.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface UniversalError {
  error_type: string;
  error_message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, any>;
  stack_trace?: string;
  file_path?: string;
  line_number?: number;
  user_id?: string;
  project_id?: string;
  source: 'runtime' | 'build' | 'auth' | 'edge_function' | 'performance' | 'dependency' | 'network';
}

export interface ErrorDetectionResult {
  errorsFound: boolean;
  errorCount: number;
  errors: UniversalError[];
  recommendations: string[];
  criticalIssues: UniversalError[];
}

export class UniversalErrorDetector {
  constructor(
    private supabase: SupabaseClient,
    private projectId?: string,
    private userId?: string
  ) {}

  /**
   * TOOL 1: Detect Runtime Errors
   * Analyzes browser console errors, unhandled promises, etc.
   */
  async detectRuntimeErrors(): Promise<ErrorDetectionResult> {
    console.log('🔍 [UniversalErrorDetector] Detecting runtime errors...');
    
    try {
      // Query recent runtime errors from detected_errors
      const { data: errors, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId || '')
        .in('error_type', [
          'runtime_error',
          'unhandled_promise',
          'console_error',
          'react_error',
          'component_error'
        ])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const result: ErrorDetectionResult = {
        errorsFound: (errors?.length || 0) > 0,
        errorCount: errors?.length || 0,
        errors: errors || [],
        recommendations: [],
        criticalIssues: []
      };

      // Analyze patterns
      if (errors && errors.length > 0) {
        const errorTypes = errors.reduce((acc, e) => {
          acc[e.error_type] = (acc[e.error_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Critical runtime errors
        result.criticalIssues = errors.filter(e => e.severity === 'critical');
        
        if (result.criticalIssues.length > 0) {
          result.recommendations.push(
            `🚨 ${result.criticalIssues.length} CRITICAL runtime errors detected - immediate attention required`
          );
        }

        // Pattern-based recommendations
        if (errorTypes['react_error'] > 3) {
          result.recommendations.push('React component errors detected - check hooks usage and component lifecycle');
        }

        if (errorTypes['unhandled_promise'] > 2) {
          result.recommendations.push('Unhandled promise rejections found - add .catch() handlers to async operations');
        }
      }

      return result;
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Runtime detection failed:', e);
      return {
        errorsFound: false,
        errorCount: 0,
        errors: [],
        recommendations: ['Failed to detect runtime errors - database query issue'],
        criticalIssues: []
      };
    }
  }

  /**
   * TOOL 2: Detect Authentication/RLS Errors
   * Identifies auth failures, permission denied, RLS policy issues
   */
  async detectAuthErrors(): Promise<ErrorDetectionResult> {
    console.log('🔍 [UniversalErrorDetector] Detecting auth/RLS errors...');
    
    try {
      const { data: errors, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId || '')
        .or('error_type.eq.auth_error,error_type.eq.rls_error,error_type.eq.permission_denied,error_message.ilike.%permission%,error_message.ilike.%unauthorized%,error_message.ilike.%forbidden%')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const result: ErrorDetectionResult = {
        errorsFound: (errors?.length || 0) > 0,
        errorCount: errors?.length || 0,
        errors: errors || [],
        recommendations: [],
        criticalIssues: []
      };

      if (errors && errors.length > 0) {
        // RLS policy issues
        const rlsErrors = errors.filter(e => 
          e.error_message.toLowerCase().includes('row level security') ||
          e.error_message.toLowerCase().includes('rls') ||
          e.error_message.toLowerCase().includes('policy')
        );

        if (rlsErrors.length > 0) {
          result.criticalIssues.push(...rlsErrors);
          result.recommendations.push(
            `🔒 RLS Policy Issues Detected: ${rlsErrors.length} permission errors - check table policies`
          );
        }

        // Auth token issues
        const authErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('token') ||
          e.error_message.toLowerCase().includes('unauthorized')
        );

        if (authErrors.length > 0) {
          result.recommendations.push(
            `🔑 Authentication errors detected - verify user login state and token validity`
          );
        }

        // Permission denied patterns
        const permissionErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('permission denied') ||
          e.error_message.toLowerCase().includes('forbidden')
        );

        if (permissionErrors.length > 0) {
          result.recommendations.push(
            `⛔ Permission denied errors - check RLS policies allow the operation`
          );
        }
      }

      return result;
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Auth detection failed:', e);
      return {
        errorsFound: false,
        errorCount: 0,
        errors: [],
        recommendations: ['Failed to detect auth errors'],
        criticalIssues: []
      };
    }
  }

  /**
   * TOOL 3: Detect Build/Compilation Errors
   * Identifies TypeScript errors, syntax errors, module resolution issues
   */
  async detectBuildErrors(): Promise<ErrorDetectionResult> {
    console.log('🔍 [UniversalErrorDetector] Detecting build/compilation errors...');
    
    try {
      const { data: errors, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId || '')
        .or('error_type.eq.build_error,error_type.eq.typescript_error,error_type.eq.syntax_error,error_type.eq.module_error,error_message.ilike.%cannot find module%,error_message.ilike.%syntax error%,error_message.ilike.%type error%')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const result: ErrorDetectionResult = {
        errorsFound: (errors?.length || 0) > 0,
        errorCount: errors?.length || 0,
        errors: errors || [],
        recommendations: [],
        criticalIssues: []
      };

      if (errors && errors.length > 0) {
        // TypeScript errors
        const tsErrors = errors.filter(e =>
          e.error_type === 'typescript_error' ||
          e.error_message.includes('Type \'') ||
          e.error_message.includes('is not assignable')
        );

        if (tsErrors.length > 0) {
          result.criticalIssues.push(...tsErrors);
          result.recommendations.push(
            `📘 TypeScript errors found - add proper type annotations and interface definitions`
          );
        }

        // Module resolution errors
        const moduleErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('cannot find module') ||
          e.error_message.toLowerCase().includes('module not found')
        );

        if (moduleErrors.length > 0) {
          result.recommendations.push(
            `📦 Module resolution errors - verify import paths and installed dependencies`
          );
        }

        // Syntax errors
        const syntaxErrors = errors.filter(e =>
          e.error_type === 'syntax_error' ||
          e.error_message.toLowerCase().includes('syntax error')
        );

        if (syntaxErrors.length > 0) {
          result.criticalIssues.push(...syntaxErrors);
          result.recommendations.push(
            `⚠️ Syntax errors detected - check for missing brackets, semicolons, or invalid JavaScript/TypeScript`
          );
        }
      }

      return result;
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Build detection failed:', e);
      return {
        errorsFound: false,
        errorCount: 0,
        errors: [],
        recommendations: ['Failed to detect build errors'],
        criticalIssues: []
      };
    }
  }

  /**
   * TOOL 4: Detect Edge Function Failures
   * Identifies edge function timeouts, crashes, invalid responses
   */
  async detectEdgeFunctionErrors(): Promise<ErrorDetectionResult> {
    console.log('🔍 [UniversalErrorDetector] Detecting edge function errors...');
    
    try {
      const { data: errors, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId || '')
        .or('error_type.eq.edge_function_error,error_type.eq.function_timeout,error_type.eq.function_crash,error_message.ilike.%edge function%,error_message.ilike.%timeout%')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const result: ErrorDetectionResult = {
        errorsFound: (errors?.length || 0) > 0,
        errorCount: errors?.length || 0,
        errors: errors || [],
        recommendations: [],
        criticalIssues: []
      };

      if (errors && errors.length > 0) {
        // Timeout errors
        const timeoutErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('timeout') ||
          e.error_message.toLowerCase().includes('timed out')
        );

        if (timeoutErrors.length > 0) {
          result.recommendations.push(
            `⏱️ Edge function timeouts detected - optimize function performance or increase timeout limits`
          );
        }

        // Memory/crash errors
        const crashErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('crash') ||
          e.error_message.toLowerCase().includes('memory') ||
          e.error_message.toLowerCase().includes('out of memory')
        );

        if (crashErrors.length > 0) {
          result.criticalIssues.push(...crashErrors);
          result.recommendations.push(
            `💥 Edge function crashes detected - check for memory leaks and infinite loops`
          );
        }
      }

      return result;
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Edge function detection failed:', e);
      return {
        errorsFound: false,
        errorCount: 0,
        errors: [],
        recommendations: ['Failed to detect edge function errors'],
        criticalIssues: []
      };
    }
  }

  /**
   * TOOL 5: Detect Performance Issues
   * Identifies memory leaks, slow operations, infinite loops
   */
  async detectPerformanceIssues(): Promise<ErrorDetectionResult> {
    console.log('🔍 [UniversalErrorDetector] Detecting performance issues...');
    
    try {
      const { data: errors, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId || '')
        .or('error_type.eq.performance_issue,error_type.eq.memory_leak,error_type.eq.slow_query,error_message.ilike.%performance%,error_message.ilike.%slow%,error_message.ilike.%memory%')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const result: ErrorDetectionResult = {
        errorsFound: (errors?.length || 0) > 0,
        errorCount: errors?.length || 0,
        errors: errors || [],
        recommendations: [],
        criticalIssues: []
      };

      if (errors && errors.length > 0) {
        // Memory issues
        const memoryErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('memory') ||
          e.error_message.toLowerCase().includes('heap')
        );

        if (memoryErrors.length > 0) {
          result.recommendations.push(
            `🧠 Memory issues detected - check for leaks, unnecessary re-renders, and large data structures`
          );
        }

        // Slow operations
        const slowErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('slow') ||
          e.error_message.toLowerCase().includes('timeout') ||
          e.context?.duration_ms > 5000
        );

        if (slowErrors.length > 0) {
          result.recommendations.push(
            `🐌 Slow operations detected - optimize queries, add pagination, or use background processing`
          );
        }
      }

      return result;
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Performance detection failed:', e);
      return {
        errorsFound: false,
        errorCount: 0,
        errors: [],
        recommendations: ['Failed to detect performance issues'],
        criticalIssues: []
      };
    }
  }

  /**
   * TOOL 6: Detect Dependency Conflicts
   * Identifies circular dependencies, version conflicts, missing packages
   */
  async detectDependencyIssues(): Promise<ErrorDetectionResult> {
    console.log('🔍 [UniversalErrorDetector] Detecting dependency issues...');
    
    try {
      const { data: errors, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId || '')
        .or('error_type.eq.dependency_error,error_type.eq.circular_dependency,error_type.eq.version_conflict,error_message.ilike.%circular%,error_message.ilike.%cannot find module%,error_message.ilike.%version%')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const result: ErrorDetectionResult = {
        errorsFound: (errors?.length || 0) > 0,
        errorCount: errors?.length || 0,
        errors: errors || [],
        recommendations: [],
        criticalIssues: []
      };

      if (errors && errors.length > 0) {
        // Circular dependencies
        const circularErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('circular') ||
          e.error_message.toLowerCase().includes('cycle')
        );

        if (circularErrors.length > 0) {
          result.criticalIssues.push(...circularErrors);
          result.recommendations.push(
            `🔄 Circular dependency detected - refactor imports to break the cycle`
          );
        }

        // Missing modules
        const missingErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('cannot find module') ||
          e.error_message.toLowerCase().includes('module not found')
        );

        if (missingErrors.length > 0) {
          result.recommendations.push(
            `📦 Missing dependencies detected - install required packages using npm/yarn`
          );
        }
      }

      return result;
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Dependency detection failed:', e);
      return {
        errorsFound: false,
        errorCount: 0,
        errors: [],
        recommendations: ['Failed to detect dependency issues'],
        criticalIssues: []
      };
    }
  }

  /**
   * TOOL 7: Detect Network/API Failures
   * Identifies failed API calls, CORS issues, network timeouts
   */
  async detectNetworkErrors(): Promise<ErrorDetectionResult> {
    console.log('🔍 [UniversalErrorDetector] Detecting network/API errors...');
    
    try {
      const { data: errors, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId || '')
        .or('error_type.eq.network_error,error_type.eq.api_error,error_type.eq.cors_error,error_message.ilike.%network%,error_message.ilike.%cors%,error_message.ilike.%fetch%,error_message.ilike.%api%')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const result: ErrorDetectionResult = {
        errorsFound: (errors?.length || 0) > 0,
        errorCount: errors?.length || 0,
        errors: errors || [],
        recommendations: [],
        criticalIssues: []
      };

      if (errors && errors.length > 0) {
        // CORS errors
        const corsErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('cors') ||
          e.error_message.toLowerCase().includes('cross-origin')
        );

        if (corsErrors.length > 0) {
          result.recommendations.push(
            `🌐 CORS errors detected - configure CORS headers in edge functions or API endpoints`
          );
        }

        // API failures
        const apiErrors = errors.filter(e =>
          e.error_message.toLowerCase().includes('api') ||
          e.error_message.toLowerCase().includes('fetch failed')
        );

        if (apiErrors.length > 0) {
          result.recommendations.push(
            `📡 API failures detected - check endpoint URLs, authentication, and error handling`
          );
        }
      }

      return result;
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Network detection failed:', e);
      return {
        errorsFound: false,
        errorCount: 0,
        errors: [],
        recommendations: ['Failed to detect network errors'],
        criticalIssues: []
      };
    }
  }

  /**
   * MASTER TOOL: Run All Detections
   * Comprehensive error detection across all categories
   */
  async runUniversalDetection(): Promise<{
    summary: {
      totalErrors: number;
      criticalCount: number;
      categoryCounts: Record<string, number>;
    };
    detections: {
      runtime: ErrorDetectionResult;
      auth: ErrorDetectionResult;
      build: ErrorDetectionResult;
      edgeFunctions: ErrorDetectionResult;
      performance: ErrorDetectionResult;
      dependencies: ErrorDetectionResult;
      network: ErrorDetectionResult;
    };
    allRecommendations: string[];
    criticalErrors: UniversalError[];
  }> {
    console.log('🚀 [UniversalErrorDetector] Running UNIVERSAL error detection...');

    // Run all detections in parallel
    const [runtime, auth, build, edgeFunctions, performance, dependencies, network] = await Promise.all([
      this.detectRuntimeErrors(),
      this.detectAuthErrors(),
      this.detectBuildErrors(),
      this.detectEdgeFunctionErrors(),
      this.detectPerformanceIssues(),
      this.detectDependencyIssues(),
      this.detectNetworkErrors()
    ]);

    // Aggregate results
    const totalErrors = 
      runtime.errorCount +
      auth.errorCount +
      build.errorCount +
      edgeFunctions.errorCount +
      performance.errorCount +
      dependencies.errorCount +
      network.errorCount;

    const allCritical = [
      ...runtime.criticalIssues,
      ...auth.criticalIssues,
      ...build.criticalIssues,
      ...edgeFunctions.criticalIssues,
      ...performance.criticalIssues,
      ...dependencies.criticalIssues,
      ...network.criticalIssues
    ];

    const allRecommendations = [
      ...runtime.recommendations,
      ...auth.recommendations,
      ...build.recommendations,
      ...edgeFunctions.recommendations,
      ...performance.recommendations,
      ...dependencies.recommendations,
      ...network.recommendations
    ];

    console.log('✅ [UniversalErrorDetector] Detection complete:', {
      totalErrors,
      criticalCount: allCritical.length,
      recommendationsCount: allRecommendations.length
    });

    return {
      summary: {
        totalErrors,
        criticalCount: allCritical.length,
        categoryCounts: {
          runtime: runtime.errorCount,
          auth: auth.errorCount,
          build: build.errorCount,
          edgeFunctions: edgeFunctions.errorCount,
          performance: performance.errorCount,
          dependencies: dependencies.errorCount,
          network: network.errorCount
        }
      },
      detections: {
        runtime,
        auth,
        build,
        edgeFunctions,
        performance,
        dependencies,
        network
      },
      allRecommendations,
      criticalErrors: allCritical
    };
  }

  /**
   * Auto-log any error to detected_errors table
   * Ensures NO error goes untracked
   */
  async logError(error: Partial<UniversalError>): Promise<void> {
    try {
      const errorRecord = {
        error_type: error.error_type || 'unknown_error',
        error_message: error.error_message || 'No message provided',
        severity: error.severity || 'medium',
        context: error.context || {},
        stack_trace: error.stack_trace,
        file_path: error.file_path,
        line_number: error.line_number,
        user_id: error.user_id || this.userId,
        project_id: error.project_id || this.projectId,
        created_at: new Date().toISOString()
      };

      await this.supabase
        .from('detected_errors')
        .insert(errorRecord);

      console.log('✅ [UniversalErrorDetector] Error logged:', error.error_type);
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Failed to log error:', e);
    }
  }
}
