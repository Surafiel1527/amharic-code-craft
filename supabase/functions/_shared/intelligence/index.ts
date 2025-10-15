/**
 * Intelligence Layer - Central Export
 * 
 * This module exports all intelligence components for easy importing.
 * Creates a unified interface for the Universal Mega Mind system.
 */

export { MetaCognitiveAnalyzer, DeepUnderstandingAnalyzer, type QueryAnalysis, type DeepUnderstanding } from './metaCognitiveAnalyzer.ts';
export { NaturalCommunicator, type CommunicationContext, type GeneratedMessage } from './naturalCommunicator.ts';
export { AdaptiveExecutor, AutonomousExecutor, type ExecutionContext, type ExecutionResult } from './adaptiveExecutor.ts';

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
  private currentAnalysis?: QueryAnalysis;
  
  constructor(
    private supabase: SupabaseClient,
    private lovableApiKey: string
  ) {
    this.analyzer = new MetaCognitiveAnalyzer(lovableApiKey);
    this.communicator = new NaturalCommunicator(lovableApiKey);
    this.executor = new AdaptiveExecutor(supabase, this.communicator, lovableApiKey);
  }
  
  /**
   * Wire up broadcast callback for real-time status updates
   */
  setBroadcastCallback(callback: (status: any) => Promise<void>): void {
    this.executor.setBroadcastCallback(callback);
  }
  
  /**
   * Process user request with full AI autonomy
   * 
   * This is the main entry point that:
   * 1. Analyzes the query to understand intent and complexity
   * 2. Determines the optimal execution strategy
   * 3. Executes with natural AI-generated communication
   * 4. Returns results with generated summary
   */
  async processRequest(request: UniversalMindRequest): Promise<ExecutionResult & { analysis: DeepUnderstanding }> {
    console.log('🧠 Universal Mega Mind: Activating...');
    console.log(`📝 Request: "${request.userRequest.slice(0, 100)}..."`);
    
    try {
      // Reset communicator for new conversation thread
      this.communicator.resetContext();
      
      // PHASE 1: Deep Understanding Analysis
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
      
      // PHASE 2: Autonomous Execution
      console.log('🎯 Phase 2: Autonomous Execution...');
      console.log(`📋 Steps: ${this.currentAnalysis.actionPlan.executionSteps.length}`);
      
      const executionContext: ExecutionContext = {
        userRequest: request.userRequest,
        userId: request.userId,
        conversationId: request.conversationId,
        projectId: request.projectId,
        existingFiles: request.existingFiles,
        framework: request.framework,
        awashContext: request.context  // Pass full Awash context
      };
      
      // Execute based on autonomous understanding
      const result = await this.executor.execute(executionContext, this.currentAnalysis);
      
      console.log('✅ Execution Complete:', {
        success: result.success,
        duration: result.duration,
        filesGenerated: result.filesGenerated?.length || 0
      });
      
      return {
        ...result,
        analysis: this.currentAnalysis
      };
      
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
