/**
 * Intelligence Layer - Central Export
 * 
 * This module exports all intelligence components for easy importing.
 * Creates a unified interface for the Universal Mega Mind system.
 */

// Legacy components (for backward compatibility)
export { MetaCognitiveAnalyzer, DeepUnderstandingAnalyzer, type QueryAnalysis, type DeepUnderstanding } from './metaCognitiveAnalyzer.ts';
export { NaturalCommunicator, type CommunicationContext, type GeneratedMessage } from './naturalCommunicator.ts';
export { AdaptiveExecutor, AutonomousExecutor, type ExecutionContext, type ExecutionResult } from './adaptiveExecutor.ts';
export { SupervisorAgent, type SupervisionResult } from './supervisorAgent.ts';
export { AutonomousHealingOrchestrator, type HealingResult, type HealingAttempt } from './autonomousHealingOrchestrator.ts';
export { IntelligentDecisionEngine, type DecisionResult, type DecisionOption, type DecisionContext } from './intelligentDecisionEngine.ts';
export { UniversalErrorDetector } from './universalErrorDetector.ts';

// NEW: Reasoning-based components (20% fix)
export { ReasoningEngine, type TranscendentContext, type AIDecision, type AIAction } from './reasoningEngine.ts';
export { CapabilityArsenal, type CapabilityResult } from './capabilityArsenal.ts';
export { ProactiveIntelligence, type GlobalInsights } from './proactiveIntelligence.ts';

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

// NEW: Reasoning-based components
import { ReasoningEngine, TranscendentContext, AIDecision } from './reasoningEngine.ts';
import { CapabilityArsenal } from './capabilityArsenal.ts';
import { ProactiveIntelligence, GlobalInsights } from './proactiveIntelligence.ts';

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
  // NEW: Reasoning components (20% fix)
  private reasoningEngine: ReasoningEngine;
  private capabilityArsenal: CapabilityArsenal;
  private proactiveIntel: ProactiveIntelligence;
  
  // Legacy components (keeping for gradual migration)
  private analyzer: MetaCognitiveAnalyzer;
  private communicator: NaturalCommunicator;
  private executor: AdaptiveExecutor;
  private supervisor: SupervisorAgent;
  private currentAnalysis?: QueryAnalysis;
  private readonly MAX_ITERATIONS = 3;
  
  private broadcastCallback?: (status: any) => Promise<void>;
  
  constructor(
    private supabase: SupabaseClient,
    private lovableApiKey: string
  ) {
    // Initialize NEW reasoning system
    this.reasoningEngine = new ReasoningEngine(lovableApiKey);
    this.capabilityArsenal = new CapabilityArsenal(supabase, lovableApiKey);
    this.proactiveIntel = new ProactiveIntelligence();
    
    // Keep legacy components for backward compatibility
    this.analyzer = new MetaCognitiveAnalyzer(lovableApiKey);
    this.communicator = new NaturalCommunicator(lovableApiKey);
    this.executor = new AdaptiveExecutor(supabase, this.communicator, lovableApiKey);
    this.supervisor = new SupervisorAgent(lovableApiKey);
  }
  
  /**
   * Wire up broadcast callback for real-time status updates
   */
  setBroadcastCallback(callback: (status: any) => Promise<void>): void {
    this.broadcastCallback = callback;
    this.executor.setBroadcastCallback(callback);
  }
  
  /**
   * Process user request with REASONING ENGINE (NEW 20% FIX)
   * 
   * This implements the Reasoning-Based approach:
   * 1. Load project knowledge (omniscient awareness)
   * 2. Retrieve relevant context (smart filtering)
   * 3. Run proactive intelligence (detect issues before asking)
   * 4. AI reasoning with full context (no templates!)
   * 5. Execute AI's chosen capabilities
   * 6. Return results with AI reasoning
   */
  async processRequest(request: UniversalMindRequest): Promise<ExecutionResult & { analysis: any; supervision?: SupervisionResult }> {
    console.log('🧠 Universal Mega Mind: Processing with REASONING ENGINE...');
    console.log(`📝 Request: "${request.userRequest.slice(0, 100)}..."`);
    
    const startTime = Date.now();
    
    try {
      // PHASE 1: Load Project Knowledge (KEEP - already working ✅)
      console.log('📚 Phase 1: Loading Project Knowledge...');
      const projectKnowledge = await this.loadProjectKnowledge(request);
      console.log(`✅ Loaded ${projectKnowledge.fileCount} files`);
      
      // PHASE 2: Smart Context Retrieval (KEEP - already working ✅)
      console.log('🔍 Phase 2: Retrieving Relevant Context...');
      const relevantContext = await this.retrieveRelevantContext(request, projectKnowledge);
      console.log(`✅ Retrieved ${relevantContext.relevantFiles.length} relevant files`);
      
      // PHASE 3: Proactive Intelligence (NEW ⭐)
      console.log('🔬 Phase 3: Running Proactive Analysis...');
      const proactiveInsights = await this.proactiveIntel.analyze(
        request.existingFiles || {},
        request.context
      );
      console.log(`✅ Proactive scan complete:`, {
        securityIssues: proactiveInsights.security_issues.length,
        optimizations: proactiveInsights.optimization_opportunities.length,
        codeSmells: proactiveInsights.code_smells.length
      });
      
      // PHASE 4: AI REASONING (NEW ⭐ - replaces analyzer + template routing)
      console.log('🧠 Phase 4: AI Reasoning with Full Context...');
      const transcendentContext: TranscendentContext = {
        projectKnowledge,
        relevantContext,
        userRequest: request.userRequest,
        capabilityArsenal: this.capabilityArsenal.list(),
        proactiveInsights,
        conversationHistory: request.context?.conversationHistory,
        existingFiles: request.existingFiles
      };
      
      const aiDecision = await this.reasoningEngine.reason(transcendentContext);
      console.log(`✅ AI Decision:`, {
        actions: aiDecision.actions.length,
        confidence: aiDecision.confidence,
        requiresConfirmation: aiDecision.requiresConfirmation
      });
      
      // PHASE 5: Execute AI's Decisions (NEW ⭐)
      console.log(`🎯 Phase 5: Executing ${aiDecision.actions.length} AI-decided actions...`);
      const executionOutput = await this.executeAIDecisions(
        aiDecision,
        request,
        transcendentContext
      );
      
      const duration = Date.now() - startTime;
      console.log(`✅ Execution Complete in ${duration}ms`);
      
      // Transform to ExecutionResult format
      return {
        success: true,
        message: executionOutput.message,
        output: executionOutput,
        filesGenerated: executionOutput.files || [],
        duration,
        analysis: {
          understanding: {
            userGoal: request.userRequest,
            proactiveInsights: proactiveInsights,
            aiReasoning: aiDecision.thought
          },
          actionPlan: {
            codeActions: {
              estimatedComplexity: aiDecision.confidence > 0.9 ? 'low' : aiDecision.confidence > 0.7 ? 'medium' : 'high'
            },
            requiresExplanation: false
          },
          meta: {
            confidence: aiDecision.confidence
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Universal Mega Mind Error:', error);
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        message: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your request.`,
        duration,
        error: error as Error,
        analysis: {
          understanding: {
            userGoal: request.userRequest,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      };
    }
  }
  
  /**
   * Helper: Load Project Knowledge
   */
  private async loadProjectKnowledge(request: UniversalMindRequest): Promise<any> {
    const files = request.existingFiles || {};
    const totalLines = Object.values(files).reduce((sum, content) => 
      sum + (typeof content === 'string' ? content.split('\n').length : 0), 0
    );
    
    return {
      files,
      fileCount: Object.keys(files).length,
      totalLines,
      components: [], // Could extract from files in the future
      routes: [],
      dependencies: [],
      framework: request.framework || 'react',
      hasBackend: request.context?.hasBackend || false,
      hasAuth: request.context?.hasAuth || false,
      storageState: request.context?.storageState || {
        totalFiles: 0,
        healthScore: 100,
        fileTypes: {}
      }
    };
  }
  
  /**
   * Helper: Retrieve Relevant Context
   */
  private async retrieveRelevantContext(
    request: UniversalMindRequest,
    projectKnowledge: any
  ): Promise<any> {
    // Simple keyword matching for now (could enhance with embeddings)
    const keywords = request.userRequest.toLowerCase().split(/\s+/);
    const relevantFiles = Object.keys(projectKnowledge.files)
      .filter(path => keywords.some(k => path.toLowerCase().includes(k)))
      .slice(0, 10);
    
    return {
      relevantFiles,
      relevantComponents: [],
      recentErrors: request.context?.recentErrors || []
    };
  }
  
  /**
   * Helper: Execute AI's Decisions
   */
  private async executeAIDecisions(
    aiDecision: AIDecision,
    request: UniversalMindRequest,
    context: TranscendentContext
  ): Promise<any> {
    const results = [];
    
    // Execute each capability AI decided to use
    for (const action of aiDecision.actions) {
      console.log(`🔧 Executing capability: ${action.capability}`);
      
      const result = await this.capabilityArsenal.execute(
        action.capability,
        action.parameters,
        {
          ...request,
          ...context
        }
      );
      
      results.push({
        capability: action.capability,
        result,
        reasoning: action.reasoning
      });
      
      // Broadcast progress
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'executing',
          message: result.message,
          metadata: { capability: action.capability }
        });
      }
    }
    
    // Transform results into output format
    return this.transformResults(results, aiDecision);
  }
  
  /**
   * Helper: Transform Results
   */
  private transformResults(results: any[], aiDecision: AIDecision): any {
    const files = [];
    
    for (const result of results) {
      if (result.capability === 'writeCode' && result.result.success) {
        // Get actual file content from the capability execution
        const fileContent = result.result.data?.fileContent || result.result.data?.content;
        const filePath = result.result.data?.filePath || result.result.data?.path;
        
        if (filePath && fileContent) {
          files.push({
            path: filePath,
            content: fileContent
          });
        }
      }
    }
    
    return {
      files,  // Array of {path, content}
      message: aiDecision.messageToUser,  // String message
      metadata: {
        aiReasoning: aiDecision.thought,
        capabilities: aiDecision.actions.map(a => a.capability),
        confidence: aiDecision.confidence,
        results: results.map(r => ({
          capability: r.capability,
          success: r.result.success,
          message: r.result.message
        }))
      }
    };
  }
  
  /**
   * Get the current understanding (for debugging/monitoring)
   */
  getCurrentAnalysis(): DeepUnderstanding | undefined {
    return this.currentAnalysis;
  }
}
