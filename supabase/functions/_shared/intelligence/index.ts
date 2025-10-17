/**
 * Intelligence Layer - Central Export
 * 
 * This module exports all intelligence components for easy importing.
 * Creates a unified interface for the Universal Mega Mind system.
 */

export { MetaCognitiveAnalyzer, DeepUnderstandingAnalyzer, type QueryAnalysis, type DeepUnderstanding } from './metaCognitiveAnalyzer.ts';
export { NaturalCommunicator, type CommunicationContext, type GeneratedMessage } from './naturalCommunicator.ts';
export { AdaptiveExecutor, AutonomousExecutor, type ExecutionContext, type ExecutionResult } from './adaptiveExecutor.ts';
export { SupervisorAgent, type SupervisionResult } from './supervisorAgent.ts';
export { AutonomousHealingOrchestrator, type HealingResult, type HealingAttempt } from './autonomousHealingOrchestrator.ts';
export { IntelligentDecisionEngine, type DecisionResult, type DecisionOption, type DecisionContext } from './intelligentDecisionEngine.ts';
export { UniversalErrorDetector } from './universalErrorDetector.ts';

/**
 * Universal Mega Mind - Main Intelligence Controller
 * 
 * This is the primary interface for the award-winning AI system.
 * It orchestrates all intelligence layers to provide true AI autonomy.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MetaCognitiveAnalyzer, QueryAnalysis, DeepUnderstanding } from './metaCognitiveAnalyzer.ts';
import { NaturalCommunicator } from './naturalCommunicator.ts';
import { AdaptiveExecutor, ExecutionContext, ExecutionResult } from './adaptiveExecutor.ts';
import { SupervisorAgent, SupervisionResult } from './supervisorAgent.ts';

export interface UniversalMindRequest {
  userRequest: string;
  userId: string;
  conversationId: string;
  projectId?: string;
  existingFiles?: Record<string, string>;
  framework?: string;
  context?: any;
}

export class UniversalMegaMind {
  private analyzer: MetaCognitiveAnalyzer;
  private communicator: NaturalCommunicator;
  private executor: AdaptiveExecutor;
  private supervisor: SupervisorAgent;
  private currentAnalysis?: QueryAnalysis;
  private readonly MAX_ITERATIONS = 3;
  
  constructor(
    private supabase: SupabaseClient,
    private lovableApiKey: string
  ) {
    this.analyzer = new MetaCognitiveAnalyzer(lovableApiKey);
    this.communicator = new NaturalCommunicator(lovableApiKey);
    this.executor = new AdaptiveExecutor(supabase, this.communicator, lovableApiKey);
    this.supervisor = new SupervisorAgent(lovableApiKey);
  }
  
  /**
   * Wire up broadcast callback for real-time status updates
   */
  setBroadcastCallback(callback: (status: any) => Promise<void>): void {
    this.executor.setBroadcastCallback(callback);
  }
  
  /**
   * Process user request with full AI autonomy + Supervisor Quality Assurance
   * 
   * This implements the Hybrid Evolution approach:
   * 1. Analyzes the query to understand intent and complexity
   * 2. Executes with natural AI-generated communication
   * 3. Verifies quality with supervisor agent
   * 4. Iterates if needed (max 3 attempts)
   * 5. Returns results with supervision details
   */
  async processRequest(request: UniversalMindRequest): Promise<ExecutionResult & { analysis: DeepUnderstanding; supervision?: SupervisionResult }> {
    console.log('🧠 Universal Mega Mind with Supervisor: Activating...');
    console.log(`📝 Request: "${request.userRequest.slice(0, 100)}..."`);
    
    const iterationHistory: Array<{
      attempt: number;
      executionResult: ExecutionResult;
      supervision: SupervisionResult;
    }> = [];
    
    try {
      // Reset communicator for new conversation thread
      this.communicator.resetContext();
      
      // PHASE 1: Deep Understanding Analysis (Once)
      console.log('🔍 Phase 1: Deep Understanding...');
      
      this.currentAnalysis = await this.analyzer.analyzeRequest(
        request.userRequest,
        {
          conversationHistory: request.context?.conversationHistory,
          projectContext: request.context,
          existingFiles: request.existingFiles,
          framework: request.framework,
          currentRoute: request.context?.currentRoute,
          recentErrors: request.context?.recentErrors
        }
      );
      
      console.log('✅ Understanding Complete:', {
        goal: this.currentAnalysis.understanding.userGoal,
        needsCode: this.currentAnalysis.actionPlan.requiresCodeGeneration,
        confidence: this.currentAnalysis.meta.confidence
      });
      
      // PHASE 2-4: Iterative Execution + Supervision
      let attemptNumber = 0;
      let executionResult: ExecutionResult;
      let supervision: SupervisionResult;
      const previousFeedback: string[] = [];
      
      do {
        attemptNumber++;
        console.log(`🎯 Execution Attempt #${attemptNumber}/${this.MAX_ITERATIONS}`);
        
        const executionContext: ExecutionContext = {
          userRequest: request.userRequest,
          userId: request.userId,
          conversationId: request.conversationId,
          projectId: request.projectId,
          existingFiles: request.existingFiles,
          framework: request.framework,
          awashContext: request.context,
          supervisorFeedback: previousFeedback.length > 0 ? previousFeedback[previousFeedback.length - 1] : undefined
        };
        
        // Execute based on autonomous understanding
        executionResult = await this.executor.execute(executionContext, this.currentAnalysis);
        
        console.log(`✅ Execution #${attemptNumber} Complete:`, {
          success: executionResult.success,
          filesGenerated: executionResult.filesGenerated?.length || 0
        });
        
        // PHASE 3: Verify Quality with Supervisor
        console.log(`🔍 Supervisor: Verifying quality (attempt #${attemptNumber})...`);
        
        supervision = await this.supervisor.verify({
          userRequest: request.userRequest,
          understanding: this.currentAnalysis,
          executionResult,
          attemptNumber,
          previousFeedback
        });
        
        console.log(`📊 Supervision Result:`, {
          approved: supervision.approved,
          confidence: supervision.confidence,
          requiresIteration: supervision.requiresIteration,
          issues: supervision.issues?.length || 0
        });
        
        // Record iteration
        iterationHistory.push({
          attempt: attemptNumber,
          executionResult: { ...executionResult },
          supervision: { ...supervision }
        });
        
        // Add feedback for next iteration if needed
        if (supervision.feedback && !supervision.approved) {
          previousFeedback.push(supervision.feedback);
        }
        
        // Check if we should continue iterating
        const shouldContinue = this.supervisor.shouldRetry(supervision, attemptNumber, this.MAX_ITERATIONS);
        
        if (!shouldContinue) {
          console.log(`🛑 Stopping iteration: ${
            supervision.approved 
              ? '✅ Quality approved' 
              : attemptNumber >= this.MAX_ITERATIONS 
                ? '⚠️ Max attempts reached' 
                : '⚠️ Low confidence in fix'
          }`);
          break;
        }
        
        console.log(`🔄 Preparing retry with supervisor feedback...`);
        
      } while (attemptNumber < this.MAX_ITERATIONS);
      
      // Final result with supervision details
      const finalResult = {
        ...executionResult,
        analysis: this.currentAnalysis,
        supervision,
        iterationHistory: iterationHistory.length > 1 ? iterationHistory : undefined
      };
      
      console.log('🎉 Universal Mega Mind Complete:', {
        success: executionResult.success,
        approved: supervision.approved,
        attempts: attemptNumber,
        duration: executionResult.duration
      });
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ Universal Mega Mind Error:', error);
      
      // Generate error response with AI
      const errorMessage = this.currentAnalysis 
        ? await this.communicator.generateErrorResponse(
            error as Error,
            {
              phase: 'error',
              taskDescription: this.currentAnalysis.userIntent.primaryGoal
            },
            this.currentAnalysis
          )
        : { content: 'I encountered an unexpected error. Please try rephrasing your request.' };
      
      return {
        success: false,
        message: errorMessage.content,
        duration: 0,
        error: error as Error,
        analysis: this.currentAnalysis!
      };
    }
  }
  
  /**
   * Get the current understanding (for debugging/monitoring)
   */
  getCurrentAnalysis(): DeepUnderstanding | undefined {
    return this.currentAnalysis;
  }
}
