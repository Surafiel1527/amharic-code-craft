/**
 * Intelligence Layer - Central Export
 * 
 * This module exports all intelligence components for easy importing.
 * Creates a unified interface for the Universal Mega Mind system.
 */

export { MetaCognitiveAnalyzer, type QueryAnalysis } from './metaCognitiveAnalyzer.ts';
export { NaturalCommunicator, type CommunicationContext, type GeneratedMessage } from './naturalCommunicator.ts';
export { AdaptiveExecutor, type ExecutionContext, type ExecutionResult } from './adaptiveExecutor.ts';

/**
 * Universal Mega Mind - Main Intelligence Controller
 * 
 * This is the primary interface for the award-winning AI system.
 * It orchestrates all intelligence layers to provide true AI autonomy.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MetaCognitiveAnalyzer, QueryAnalysis } from './metaCognitiveAnalyzer.ts';
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
   * Process user request with full AI autonomy
   * 
   * This is the main entry point that:
   * 1. Analyzes the query to understand intent and complexity
   * 2. Determines the optimal execution strategy
   * 3. Executes with natural AI-generated communication
   * 4. Returns results with generated summary
   */
  async processRequest(request: UniversalMindRequest): Promise<ExecutionResult & { analysis: QueryAnalysis }> {
    console.log('🧠 Universal Mega Mind: Activating...');
    console.log(`📝 Request: "${request.userRequest.slice(0, 100)}..."`);
    
    try {
      // Reset communicator for new conversation thread
      this.communicator.resetContext();
      
      // PHASE 1: Meta-Cognitive Analysis
      console.log('🔍 Phase 1: Deep Analysis...');
      
      this.currentAnalysis = await this.analyzer.analyzeQuery(
        request.userRequest,
        {
          conversationHistory: request.context?.conversationHistory,
          projectContext: request.context,
          existingFiles: request.existingFiles,
          framework: request.framework
        }
      );
      
      console.log('✅ Analysis Complete:', {
        intent: this.currentAnalysis.userIntent.primaryGoal,
        complexity: this.currentAnalysis.complexity.level,
        mode: this.currentAnalysis.executionStrategy.mode,
        confidence: this.currentAnalysis.confidence
      });
      
      // PHASE 2: Adaptive Execution
      console.log('🎯 Phase 2: Adaptive Execution...');
      console.log(`🔀 Mode: ${this.currentAnalysis.executionStrategy.mode}`);
      
      const executionContext: ExecutionContext = {
        userRequest: request.userRequest,
        userId: request.userId,
        conversationId: request.conversationId,
        projectId: request.projectId,
        existingFiles: request.existingFiles,
        framework: request.framework
      };
      
      let result: ExecutionResult;
      
      switch (this.currentAnalysis.executionStrategy.mode) {
        case 'instant':
          result = await this.executor.executeInstant(executionContext, this.currentAnalysis);
          break;
          
        case 'progressive':
          result = await this.executor.executeProgressive(executionContext, this.currentAnalysis);
          break;
          
        case 'conversational':
          result = await this.executor.executeConversational(executionContext, this.currentAnalysis);
          break;
          
        case 'hybrid':
          result = await this.executor.executeHybrid(executionContext, this.currentAnalysis);
          break;
          
        default:
          throw new Error(`Unknown execution mode: ${this.currentAnalysis.executionStrategy.mode}`);
      }
      
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
   * Get the current analysis (for debugging/monitoring)
   */
  getCurrentAnalysis(): QueryAnalysis | undefined {
    return this.currentAnalysis;
  }
}
