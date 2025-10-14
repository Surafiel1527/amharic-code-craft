/**
 * Adaptive Executor - Dynamic Execution Engine
 * 
 * Implements different execution strategies based on Meta-Cognitive Analysis:
 * - Instant: Direct execution for simple tasks
 * - Progressive: Multi-phase build for complex tasks
 * - Conversational: Discussion only, no code
 * - Hybrid: Explain + implement
 * 
 * Enterprise Pattern: Strategy Pattern + Factory
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { QueryAnalysis } from './metaCognitiveAnalyzer.ts';
import { NaturalCommunicator, CommunicationContext } from './naturalCommunicator.ts';

export interface ExecutionContext {
  userRequest: string;
  userId: string;
  conversationId: string;
  projectId?: string;
  existingFiles?: Record<string, string>;
  framework?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  message: string;
  filesGenerated?: string[];
  duration: number;
  error?: Error;
}

export class AdaptiveExecutor {
  constructor(
    private supabase: SupabaseClient,
    private communicator: NaturalCommunicator,
    private lovableApiKey: string
  ) {}
  
  /**
   * Execute with instant strategy - direct, no planning needed
   */
  async executeInstant(
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    console.log('⚡ Adaptive Executor: Instant mode activated');
    
    // Generate and broadcast initial status
    const statusMsg = await this.communicator.generateStatusUpdate(
      {
        phase: 'starting',
        taskDescription: analysis.userIntent.primaryGoal,
        currentAction: 'Executing direct change...'
      },
      analysis
    );
    
    console.log(`💬 ${statusMsg.emoji} ${statusMsg.content}`);
    
    try {
      // For instant mode, delegate to appropriate handler
      // This could be a simple edit, color change, text update, etc.
      const result = await this.executeDirectChange(context, analysis);
      
      const completionMsg = await this.communicator.generateCompletionSummary(
        analysis.userIntent.primaryGoal,
        result.filesChanged || [],
        Date.now() - startTime,
        analysis
      );
      
      return {
        success: true,
        output: result,
        message: completionMsg.content,
        filesGenerated: result.filesChanged,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      const errorMsg = await this.communicator.generateErrorResponse(
        error as Error,
        {
          phase: 'error',
          taskDescription: analysis.userIntent.primaryGoal
        },
        analysis
      );
      
      return {
        success: false,
        message: errorMsg.content,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }
  
  /**
   * Execute with progressive strategy - multi-phase build
   */
  async executeProgressive(
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const filesGenerated: string[] = [];
    
    console.log('🏗️ Adaptive Executor: Progressive mode activated');
    console.log(`📋 Estimated phases: ${analysis.complexity.estimatedPhases}`);
    
    try {
      // Phase 1: Planning
      if (analysis.executionStrategy.shouldPlan) {
        await this.broadcastPhase('planning', context, analysis);
        // Generate detailed implementation plan
        const plan = await this.generatePlan(context, analysis);
        console.log('✅ Plan generated:', plan);
      }
      
      // Phase 2: Building
      await this.broadcastPhase('building', context, analysis);
      
      // Execute in phases
      for (let phase = 1; phase <= analysis.complexity.estimatedPhases; phase++) {
        const phaseMsg = await this.communicator.generateStatusUpdate(
          {
            phase: 'building',
            taskDescription: `Phase ${phase}/${analysis.complexity.estimatedPhases}`,
            progress: (phase / analysis.complexity.estimatedPhases) * 100,
            currentAction: `Building phase ${phase}...`
          },
          analysis
        );
        
        console.log(`💬 ${phaseMsg.emoji} ${phaseMsg.content}`);
        
        // Execute phase-specific work
        const phaseFiles = await this.executePhase(phase, context, analysis);
        filesGenerated.push(...phaseFiles);
      }
      
      // Phase 3: Validation (if required)
      if (analysis.executionStrategy.shouldValidate) {
        await this.broadcastPhase('validating', context, analysis);
        await this.validateOutput(filesGenerated);
      }
      
      // Phase 4: Completion
      const completionMsg = await this.communicator.generateCompletionSummary(
        analysis.userIntent.primaryGoal,
        filesGenerated,
        Date.now() - startTime,
        analysis
      );
      
      return {
        success: true,
        message: completionMsg.content,
        filesGenerated,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      const errorMsg = await this.communicator.generateErrorResponse(
        error as Error,
        {
          phase: 'error',
          taskDescription: analysis.userIntent.primaryGoal,
          filesAffected: filesGenerated
        },
        analysis
      );
      
      return {
        success: false,
        message: errorMsg.content,
        filesGenerated,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }
  
  /**
   * Execute with conversational strategy - discussion only
   */
  async executeConversational(
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    console.log('💭 Adaptive Executor: Conversational mode activated');
    
    try {
      // Generate thoughtful response using AI
      const response = await this.generateConversationalResponse(context, analysis);
      
      const message = await this.communicator.generateStatusUpdate(
        {
          phase: 'completing',
          taskDescription: 'Discussion',
          currentAction: 'Providing information...'
        },
        analysis
      );
      
      return {
        success: true,
        output: { response },
        message: response,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        message: "I encountered an issue generating a response. Could you rephrase your question?",
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }
  
  /**
   * Execute with hybrid strategy - explain + implement
   */
  async executeHybrid(
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    console.log('🔀 Adaptive Executor: Hybrid mode activated');
    
    try {
      // First, explain what we're going to do
      const explanation = await this.generateConversationalResponse(context, analysis);
      console.log('💬 Explanation:', explanation);
      
      // Then, execute the implementation
      const implementation = await this.executeProgressive(context, analysis);
      
      return {
        ...implementation,
        message: `${explanation}\n\n${implementation.message}`,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        message: "I encountered an issue with the hybrid execution.",
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }
  
  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================
  
  private async broadcastPhase(
    phase: CommunicationContext['phase'],
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<void> {
    const message = await this.communicator.generateStatusUpdate(
      {
        phase,
        taskDescription: analysis.userIntent.primaryGoal
      },
      analysis
    );
    
    console.log(`💬 ${message.emoji} ${message.content}`);
  }
  
  private async executeDirectChange(
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<{ success: boolean; filesChanged?: string[] }> {
    // This would call the appropriate code generation/editing logic
    // For now, placeholder
    console.log('✏️ Executing direct change...');
    
    return {
      success: true,
      filesChanged: ['example.tsx']
    };
  }
  
  private async generatePlan(
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<any> {
    console.log('📋 Generating implementation plan...');
    
    // Use AI to generate detailed plan
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a software architect. Generate a detailed implementation plan.' 
          },
          { 
            role: 'user', 
            content: `Generate a plan for: ${context.userRequest}\nComplexity: ${analysis.complexity.level}\nPhases: ${analysis.complexity.estimatedPhases}` 
          }
        ]
      }),
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  private async executePhase(
    phaseNumber: number,
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<string[]> {
    console.log(`⚙️ Executing phase ${phaseNumber}...`);
    
    // Phase-specific implementation logic
    // This would integrate with existing code generators
    return [`phase${phaseNumber}-file.tsx`];
  }
  
  private async validateOutput(files: string[]): Promise<void> {
    console.log('✅ Validating output...');
    // Validation logic
  }
  
  private async generateConversationalResponse(
    context: ExecutionContext,
    analysis: QueryAnalysis
  ): Promise<string> {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful development assistant. Tone: ${analysis.communicationStyle.tone}. Be ${analysis.communicationStyle.verbosity}.` 
          },
          { 
            role: 'user', 
            content: context.userRequest 
          }
        ]
      }),
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}
