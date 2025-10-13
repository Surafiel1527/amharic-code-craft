/**
 * Mega Mind Orchestrator - Entry Point
 * 
 * HTTP handler with CORS and routing to core orchestration logic
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { 
  loadConversationHistory,
  loadProjectConversationMemory,
  buildProjectMemorySummary
} from '../_shared/conversationMemory.ts';
import { 
  loadFileDependencies 
} from '../_shared/fileDependencies.ts';
import { 
  logGenerationFailure, 
  checkHealthMetrics,
  classifyError, 
  extractStackTrace 
} from './productionMonitoring.ts';
import { analyzeContext, makeIntelligentDecision } from '../_shared/intelligenceEngine.ts';
import { processRequest } from './orchestrator.ts';
import { generateAndPackageCode } from './code-generator.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Main request handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      request, 
      conversationId, 
      userId, 
      requestType = 'generation',
      context = {},
      userSupabaseConnection 
    } = await req.json();

    // Extract framework from context (default: react)
    const framework = context.framework || 'react';
    const projectId = context.projectId || null;

    console.log('🚀 Mega Mind Orchestrator started', { 
      request: request.substring(0, 100), 
      conversationId, 
      userId, 
      requestType,
      framework,
      projectId
    });

    // Initialize Supabase clients
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const platformSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    const userSupabase = userSupabaseConnection 
      ? createClient(userSupabaseConnection.url, userSupabaseConnection.key)
      : null;

    // Load conversation context
    // For Q&A mode, load full history; for generation, keep it focused
    const isQuestion = request.length < 200 && 
      (request.includes('?') || /what|how|why|explain|tell me|describe|show me/i.test(request));
    
    const conversationContext = await loadConversationHistory(
      platformSupabase, 
      conversationId, 
      5, // Recent turns limit
      isQuestion // Load full history for Q&A
    );
    
    // 🆕 Load cross-conversation memory for project-wide context
    const projectMemory = projectId 
      ? await loadProjectConversationMemory(platformSupabase, projectId, 15)
      : { recentMessages: [], conversationCount: 0 };
    
    const dependencies = await loadFileDependencies(platformSupabase, conversationId);

    console.log(`📚 Loaded context: ${conversationContext.totalTurns} turns, ${dependencies.length} dependencies, Q&A mode: ${isQuestion}`);
    console.log(`🔗 Cross-conversation memory: ${projectMemory.recentMessages.length} messages from ${projectMemory.conversationCount} conversations`);

    // ✅ Create and subscribe to channel ONCE for the entire request
    const realtimeChannel = platformSupabase.channel(`ai-status-${conversationId}`);
    
    // Subscribe immediately before any broadcasts (non-blocking)
    realtimeChannel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Realtime channel subscribed: ai-status-${conversationId}`);
      }
    });
    
    // Small delay to ensure subscription is established
    await new Promise(resolve => setTimeout(resolve, 100));

    // Helper to broadcast via Supabase Realtime Channels
    const broadcast = async (event: string, data: any) => {
      try {
        // Handle thinking steps specially - send with original event name AND persist to DB
        if (event === 'thinking_step') {
          // Broadcast for real-time display using pre-subscribed channel
          await realtimeChannel.send({
            type: 'broadcast',
            event: 'thinking_step',
            payload: {
              ...data,
              projectId,
              conversationId
            }
          });
          
          // Persist to database for permanent display after reload
          try {
            await platformSupabase.from('thinking_steps').insert({
              conversation_id: conversationId,
              project_id: projectId,
              user_id: userId,
              operation: data.operation,
              detail: data.detail,
              status: data.status,
              duration: data.duration || null,
              timestamp: data.timestamp
            });
            console.log(`💾 Thinking step saved [${conversationId}]:`, data.operation, data.status);
          } catch (dbError) {
            console.error('Failed to persist thinking step:', dbError);
            // Don't throw - continue even if DB insert fails
          }
          
          console.log(`📡 Thinking step broadcast [${conversationId}]:`, data.operation, data.status);
          return;
        }
        
        // Determine event type - AGI events vs general status updates
        const isAGIEvent = ['confidence:low', 'confidence:reflecting', 'confidence:corrected', 
                            'confidence:high', 'confidence:proceeding', 'execution:monitoring',
                            'execution:complete', 'correction:detecting', 'correction:applied', 
                            'correction:failed'].includes(event);
        
        if (isAGIEvent) {
          // Send AGI events with generation_event format for useGenerationMonitor
          const agiEventType = mapToAGIEventType(event, data);
          await realtimeChannel.send({
            type: 'broadcast',
            event: 'generation_event',
            payload: {
              type: agiEventType,
              ...data,
              projectId,
              conversationId,
              timestamp: new Date().toISOString()
            }
          });
          console.log(`🧠 AGI Event: ${agiEventType}`, data.message || data.status);
        } else {
          // Send general status updates
          await realtimeChannel.send({
            type: 'broadcast',
            event: 'status-update',
            payload: {
              ...data,
              event,
              projectId,
              timestamp: new Date().toISOString()
            }
          });
          console.log(`📡 Status: ${event}`, data.message || data.status);
        }
      } catch (error) {
        console.error('❌ Broadcast error:', error);
      }
    };

    // Map orchestrator events to AGI event types
    function mapToAGIEventType(event: string, data: any): string {
      if (event === 'confidence:low') return 'clarification_needed';
      if (event === 'confidence:reflecting') return 'decision';
      if (event === 'confidence:corrected') return 'correction';
      if (event === 'confidence:high' || event === 'confidence:proceeding') return 'decision';
      if (event === 'execution:monitoring' || event === 'correction:detecting') return 'execution_start';
      if (event === 'execution:complete') return 'execution_complete';
      if (event === 'correction:applied') return 'correction_applied';
      if (event === 'correction:failed') return 'execution_failed';
      return 'decision';
    }

    // Start processing and return immediate response
    processRequest({
      request,
      conversationId,
      userId,
      requestType,
      framework,
      projectId,
      conversationContext,
      projectMemory, // 🆕 Add cross-conversation memory
      dependencies,
      platformSupabase,
      userSupabase,
      userSupabaseConnection,
      broadcast
    }).then(async (orchestrationResult) => {
      // Continue with code generation
      const packagedCode = await generateAndPackageCode({
        request,
        conversationId,
        userId,
        framework,
        projectId,
        analysis: orchestrationResult.analysis,
        conversationContext: orchestrationResult.conversationContext,
        dependencies,
        platformSupabase,
        userSupabase,
        broadcast,
        updateJobProgress: orchestrationResult.updateJobProgress,
        startTime: orchestrationResult.startTime
      });
      
      await broadcast('generation:complete', { 
        status: 'complete', 
        message: '✅ Generation complete!',
        progress: 100,
        code: packagedCode
      });

      // AGI: Validate outcome for successful generation
      const decisionId = (orchestrationResult.conversationContext as any)._decisionId;
      if (decisionId) {
        console.log('✅ Validating successful generation outcome...');
        
        const { validateOutcome } = await import('../_shared/agiIntegration.ts');
        await validateOutcome(decisionId, {
          userId,
          executionSuccess: true,
          actualOutcome: {
            codeGenerated: true,
            completed: true
          },
          expectedOutcome: {
            outputType: orchestrationResult.analysis.outputType,
            backendSetup: orchestrationResult.analysis.backendRequirements?.needsDatabase
          }
        });

        console.log('✅ Successful outcome validated and learned');
      }
    }).catch(async (error) => {
      console.error('❌ Generation failed:', error);
      
      // AGI: Validate failed outcome for learning
      const decisionId = (conversationContext as any)?._decisionId;
      if (decisionId) {
        console.log('❌ Validating failed generation outcome...');
        
        const { validateOutcome } = await import('../_shared/agiIntegration.ts');
        await validateOutcome(decisionId, {
          userId,
          executionSuccess: false,
          userFeedback: 'generation_failed',
          symptoms: [error.name || 'unknown_error', error.message || 'no_message'],
          actualOutcome: {
            failed: true,
            errorType: error.name
          },
          expectedOutcome: {
            success: true
          }
        });

        console.log('❌ Failed outcome validated - triggering learning');
      }
      
      // Log failure to production monitoring system
      const errorClassification = classifyError(error);
      await logGenerationFailure(platformSupabase, {
        errorType: error.name || 'GenerationError',
        errorMessage: error.message || 'Unknown error occurred',
        userRequest: request,
        context: { framework, projectId, conversationId },
        stackTrace: extractStackTrace(error),
        framework,
        userId,
        severity: errorClassification.severity,
        category: errorClassification.category
      });
      
      // Check overall system health after error
      const healthMetrics = await checkHealthMetrics(platformSupabase);
      if (healthMetrics) {
        console.log('📊 Current system health:', healthMetrics);
        
        // Alert if system health is degraded
        if (healthMetrics.failureRate > 50) {
          console.error(`🚨 CRITICAL: System failure rate is ${healthMetrics.failureRate.toFixed(2)}%`);
        }
      }
      
      // 🧠 NEW: Intelligent autonomous fix decision
      try {
        console.log('🧠 Analyzing error for autonomous fix possibility...');
        
        // Check for learned patterns
        const { data: matchingPatterns } = await platformSupabase
          .from('universal_error_patterns')
          .select('*')
          .eq('error_category', errorClassification.category)
          .gte('confidence_score', 0.7)
          .order('success_count', { ascending: false })
          .limit(1);
        
        const hasLearnedPattern = !!(matchingPatterns && matchingPatterns.length > 0);
        
        // Get context analysis (might be from earlier in the flow)
        let contextAnalysis: any;
        try {
          contextAnalysis = (conversationContext as any)._contextAnalysis || await analyzeContext(
            platformSupabase as any,
            conversationId,
            userId,
            request,
            projectId || undefined
          );
        } catch (analysisError) {
          console.error('Context analysis failed, using defaults:', analysisError);
          // Use default context
          contextAnalysis = {
            userIntent: 'fix',
            complexity: 'moderate',
            confidenceScore: 0.5,
            projectState: {
              hasAuth: false,
              hasDatabase: false,
              recentErrors: 0,
              successRate: 0.5,
              generationHistory: []
            },
            patterns: {
              commonIssues: [],
              userPreferences: [],
              successfulApproaches: []
            },
            contextQuality: 50
          };
        }
        
        // Map critical severity to high for decision making
        const mappedSeverity = errorClassification.severity === 'critical' ? 'high' : errorClassification.severity as 'low' | 'medium' | 'high';
        
        // Make intelligent decision
        const decision = makeIntelligentDecision(
          contextAnalysis,
          mappedSeverity,
          hasLearnedPattern
        );
        
        console.log('🎯 Autonomous Decision:', {
          action: decision.action,
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          requiresUserInput: decision.requiresUserInput
        });
        
        // If decision is to auto-fix, trigger autonomous healing
        if (decision.action === 'auto_fix' && decision.confidence >= 0.75) {
          console.log('🔧 Triggering autonomous fix...');
          
          const { data: job } = await platformSupabase
            .from('ai_generation_jobs')
            .select('id')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (job) {
            // Trigger autonomous healing
            await platformSupabase.functions.invoke('unified-healing-engine', {
              body: {
                operation: 'autonomous_fix',
                params: {
                  errorId: job.id,
                  userId,
                  projectId,
                  conversationId,
                  errorMessage: error.message,
                  errorType: errorClassification.category,
                  code: '', // Will be retrieved from context
                  context: {
                    framework,
                    request,
                    severity: errorClassification.severity,
                    decision: decision
                  }
                }
              }
            });
            
            console.log('✅ Autonomous healing triggered');
            
            // Notify user
            await broadcast('healing:triggered', {
              status: 'healing',
              message: '🤖 AI is autonomously fixing the issue...',
              decision: decision
            });
          }
        }
      } catch (healingError) {
        console.error('❌ Autonomous healing decision failed:', healingError);
      }
      
      // 🆕 PHASE 1: Trigger conversational diagnosis
      try {
        console.log('🔍 Triggering conversational diagnosis...');
        const { data: job } = await platformSupabase
          .from('ai_generation_jobs')
          .select('id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (job) {
          await platformSupabase.functions.invoke('unified-healing-engine', {
            body: {
              operation: 'conversational_diagnosis',
              params: {
                jobId: job.id,
                conversationId,
                errorMessage: error.message,
                stackTrace: extractStackTrace(error),
                context: { framework, projectId }
              }
            }
          });
          console.log('✅ Conversational diagnosis triggered');
        }
      } catch (diagError) {
        console.error('❌ Diagnosis failed:', diagError);
      }
      
      // 🆕 PHASE 1: Check if user wants to apply a diagnostic fix
      const userMessage = request.toLowerCase();
      const isFixRequest = 
        userMessage.includes('apply') || 
        userMessage.includes('implement') || 
        userMessage.includes('fix it') ||
        userMessage.includes('use that') ||
        userMessage.includes('try that') ||
        userMessage.includes('go ahead') ||
        userMessage.includes('do it');
      
      if (isFixRequest) {
        try {
          console.log('🔧 User requested fix application...');
          const { data: job } = await platformSupabase
            .from('ai_generation_jobs')
            .select('id, diagnostic_fixes')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (job && job.diagnostic_fixes && job.diagnostic_fixes.length > 0) {
            // Extract fix index if user specified (e.g., "apply fix 2")
            const fixIndexMatch = userMessage.match(/(?:fix|suggestion)\s+(\d+)/);
            const fixIndex = fixIndexMatch ? parseInt(fixIndexMatch[1]) - 1 : 0;
            
            await platformSupabase.functions.invoke('unified-healing-engine', {
              body: {
                operation: 'apply_diagnostic_fix',
                params: {
                  jobId: job.id,
                  conversationId,
                  fixIndex
                }
              }
            });
            
            console.log('✅ Diagnostic fix application triggered');
          }
        } catch (fixError) {
          console.error('❌ Fix application failed:', fixError);
        }
      }
      
      await broadcast('generation:failed', {
        status: 'error',
        error: error.message || 'Unknown error occurred',
        classification: errorClassification,
        progress: 0
      });
    });

    // Return immediate response - processing happens in background via channels
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Generation started',
        projectId,
        conversationId 
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Request error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

