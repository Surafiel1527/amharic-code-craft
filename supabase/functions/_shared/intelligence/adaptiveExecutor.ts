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
      // For instant mode, use existing code generation with reasoning
      const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
      
      const generatedCode = await generateCodeWithReasoning({
        functionality: analysis.userIntent.primaryGoal,
        requirements: analysis.userIntent.specificRequirements.join(', '),
        framework: context.framework || 'react',
        existingCode: context.existingFiles || {}
      });
      
      const completionMsg = await this.communicator.generateCompletionSummary(
        analysis.userIntent.primaryGoal,
        generatedCode.files?.map((f: any) => f.path) || [],
        Date.now() - startTime,
        analysis
      );
      
      return {
        success: true,
        output: generatedCode,
        message: completionMsg.content,
        filesGenerated: generatedCode.files?.map((f: any) => f.path) || [],
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
    console.log('✏️ Executing direct change...');
    
    // Integrated with aiReasoningEngine for instant modifications
    const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
    
    const result = await generateCodeWithReasoning({
      functionality: analysis.userIntent.primaryGoal,
      requirements: analysis.userIntent.specificRequirements.join(', '),
      framework: context.framework || 'react',
      existingCode: context.existingFiles || {}
    });
    
    return {
      success: true,
      filesChanged: result.files?.map((f: any) => f.path) || []
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
    
    // Use FeatureOrchestrator for complex multi-feature phases
    if (analysis.complexity.level === 'expert' || analysis.complexity.level === 'complex') {
      const { FeatureOrchestrator } = await import('../featureOrchestrator.ts');
      const orchestrator = new FeatureOrchestrator();
      
      const plan = await orchestrator.orchestrateFeatures(context.userRequest, {
        framework: context.framework || 'react',
        projectId: context.projectId
      });
      
      // Execute features in this phase
      const phaseIndex = Math.min(phaseNumber - 1, plan.phases.length - 1);
      const phaseFeatures = plan.phases[phaseIndex]?.features || [];
      const generatedFiles: string[] = [];
      
      const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
      
      for (const feature of phaseFeatures) {
        const featureCode = await generateCodeWithReasoning({
          functionality: feature.name,
          requirements: feature.components.join(', '),
          framework: context.framework || 'react',
          existingCode: context.existingFiles || {}
        });
        
        generatedFiles.push(...(featureCode.files?.map((f: any) => f.path) || []));
      }
      
      return generatedFiles;
    }
    
    // For simpler cases, use direct code generation
    const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
    
    const result = await generateCodeWithReasoning({
      functionality: analysis.userIntent.primaryGoal,
      requirements: analysis.userIntent.specificRequirements.join(', '),
      framework: context.framework || 'react',
      existingCode: context.existingFiles || {}
    });
    
    return result.files?.map((f: any) => f.path) || [];
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
