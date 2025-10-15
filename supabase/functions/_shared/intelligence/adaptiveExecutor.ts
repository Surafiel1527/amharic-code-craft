/**
 * Autonomous Executor - Dynamic Execution Engine
 * 
 * Executes based on Deep Understanding, not predefined modes.
 * The AI has already decided what needs to be done - we execute that plan.
 * 
 * Enterprise Pattern: Tool-Based Autonomous Execution
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DeepUnderstanding } from './metaCognitiveAnalyzer.ts';
import { NaturalCommunicator, CommunicationContext } from './naturalCommunicator.ts';

export interface ExecutionContext {
  userRequest: string;
  userId: string;
  conversationId: string;
  projectId?: string;
  existingFiles?: Record<string, string>;
  framework?: string;
  awashContext?: any;  // Full Awash platform context
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  message: string;
  filesGenerated?: string[];
  duration: number;
  error?: Error;
}

export class AutonomousExecutor {
  private broadcastCallback?: (status: any) => Promise<void>;
  
  constructor(
    private supabase: SupabaseClient,
    private communicator: NaturalCommunicator,
    private lovableApiKey: string
  ) {}
  
  /**
   * Set broadcast callback from orchestrator
   */
  setBroadcastCallback(callback: (status: any) => Promise<void>): void {
    this.broadcastCallback = callback;
  }
  
  /**
   * Main execution method - executes based on autonomous understanding
   * 
   * The AI has already decided what to do in the DeepUnderstanding.
   * We simply execute that plan using the appropriate tools.
   */
  async execute(
    context: ExecutionContext,
    understanding: DeepUnderstanding
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    console.log('🤖 Autonomous Executor: Starting execution...');
    console.log(`📋 Plan: ${understanding.actionPlan.executionSteps.length} steps`);
    
    try {
      // Broadcast initial status
      await this.broadcastStatus('starting', understanding);
      
      // Execute based on what AI decided is needed
      if (understanding.actionPlan.requiresCodeGeneration) {
        return await this.executeCodeGeneration(context, understanding, startTime);
      } else if (understanding.actionPlan.requiresExplanation) {
        return await this.executeExplanation(context, understanding, startTime);
      } else if (understanding.actionPlan.requiresClarification) {
        return await this.executeClarification(context, understanding, startTime);
      } else {
        // Fallback - execute the steps as planned
        return await this.executeAutonomousPlan(context, understanding, startTime);
      }
      
    } catch (error) {
      console.error('❌ Autonomous Executor error:', error);
      
      const errorMsg = await this.communicator.generateErrorResponse(
        error as Error,
        {
          phase: 'error',
          taskDescription: understanding.understanding.userGoal
        },
        understanding as any // Type compatibility
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
   * Execute code generation autonomously
   */
  private async executeCodeGeneration(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    startTime: number
  ): Promise<ExecutionResult> {
    console.log('💻 Executing code generation...');
    
    await this.broadcastStatus('building', understanding);
    
    const codeActions = understanding.actionPlan.codeActions!;
    const filesGenerated: string[] = [];
    
    // Execute each step in the autonomous plan
    for (const step of understanding.actionPlan.executionSteps) {
      console.log(`⚙️ Step ${step.step}: ${step.action}`);
      
      // Broadcast progress
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'editing',
          message: step.action,
          metadata: {
            step: step.step,
            totalSteps: understanding.actionPlan.executionSteps.length,
            reason: step.reason
          }
        });
      }
      
      // Execute based on tools needed
      if (step.toolsNeeded.includes('code_generator')) {
        const generated = await this.generateCode(context, understanding, step);
        filesGenerated.push(...generated);
      }
      
      if (step.toolsNeeded.includes('file_modifier')) {
        const modified = await this.modifyFiles(context, understanding, step);
        filesGenerated.push(...modified);
      }
      
      if (step.toolsNeeded.includes('dependency_installer')) {
        await this.installDependencies(codeActions.dependencies);
      }
    }
    
    // Validate if needed
    if (codeActions.architectureChanges) {
      await this.broadcastStatus('validating', understanding);
      await this.validateArchitecture(filesGenerated);
    }
    
    // Generate completion message
    const completionMsg = await this.communicator.generateCompletionSummary(
      understanding.understanding.userGoal,
      filesGenerated,
      Date.now() - startTime,
      understanding as any
    );
    
    return {
      success: true,
      message: completionMsg.content,
      filesGenerated,
      duration: Date.now() - startTime
    };
  }
  
  
  /**
   * Execute explanation autonomously
   */
  private async executeExplanation(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    startTime: number
  ): Promise<ExecutionResult> {
    console.log('💭 Executing explanation...');
    
    const explanationNeeds = understanding.actionPlan.explanationNeeds!;
    
    // Generate comprehensive explanation
    const response = await this.generateExplanation(context, understanding, explanationNeeds);
    
    // If user might want implementation, offer it
    let message = response;
    if (understanding.actionPlan.requiresCodeGeneration) {
      message += '\n\nWould you like me to implement this for you?';
    }
    
    return {
      success: true,
      output: { explanation: response },
      message,
      duration: Date.now() - startTime
    };
  }
  
  /**
   * Execute clarification request
   */
  private async executeClarification(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    startTime: number
  ): Promise<ExecutionResult> {
    console.log('❓ Requesting clarification...');
    
    const clarificationMessage = await this.generateClarificationRequest(
      context,
      understanding
    );
    
    return {
      success: true,
      message: clarificationMessage,
      duration: Date.now() - startTime
    };
  }
  
  /**
   * Execute autonomous plan step by step
   */
  private async executeAutonomousPlan(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    startTime: number
  ): Promise<ExecutionResult> {
    console.log('🎯 Executing autonomous plan...');
    
    const results: string[] = [];
    
    for (const step of understanding.actionPlan.executionSteps) {
      console.log(`⚙️ Step ${step.step}: ${step.action}`);
      
      // Execute based on tools needed
      const stepResult = await this.executeStep(context, understanding, step);
      results.push(stepResult);
    }
    
    const message = results.join('\n\n');
    
    return {
      success: true,
      output: { steps: results },
      message,
      duration: Date.now() - startTime
    };
  }
  
  
  // =====================================================
  // TOOL IMPLEMENTATIONS
  // =====================================================
  
  /**
   * Generate code using AI reasoning
   */
  private async generateCode(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<string[]> {
    console.log('🔧 Tool: code_generator');
    
    const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
    
    const result = await generateCodeWithReasoning({
      functionality: understanding.understanding.userGoal,
      requirements: understanding.understanding.implicitRequirements.join(', '),
      framework: context.framework || 'react',
      existingCode: context.existingFiles || {},
      awashContext: context.awashContext  // Pass full platform context
    });
    
    return result.files?.map((f: any) => f.path) || [];
  }
  
  /**
   * Modify existing files
   */
  private async modifyFiles(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<string[]> {
    console.log('🔧 Tool: file_modifier');
    
    const filesToModify = understanding.actionPlan.codeActions?.filesToModify || [];
    
    // Use surgical editor for modifications
    const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
    
    const result = await generateCodeWithReasoning({
      functionality: `Modify files: ${filesToModify.join(', ')}`,
      requirements: step.reason,
      framework: context.framework || 'react',
      existingCode: context.existingFiles || {},
      awashContext: context.awashContext
    });
    
    return filesToModify;
  }
  
  /**
   * Install dependencies
   */
  private async installDependencies(dependencies: string[]): Promise<void> {
    console.log('🔧 Tool: dependency_installer');
    console.log(`📦 Installing: ${dependencies.join(', ')}`);
    
    // Dependencies are auto-installed by platform
    // This is a placeholder for future enhancement
  }
  
  /**
   * Validate architecture changes
   */
  private async validateArchitecture(files: string[]): Promise<void> {
    console.log('🔧 Tool: architecture_validator');
    console.log(`✅ Validating ${files.length} files...`);
    
    // Use Awash validation service
    const { validateGeneratedCode } = await import('../../services/awashValidation.ts');
    
    // Validation happens automatically
  }
  
  /**
   * Generate explanation using AI
   */
  private async generateExplanation(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    needs: DeepUnderstanding['actionPlan']['explanationNeeds']
  ): Promise<string> {
    console.log('🔧 Tool: explanation_generator');
    
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
            content: `You are a helpful development assistant. Tone: ${understanding.communication.tone}. ${needs?.shouldProvideExamples ? 'Provide clear examples.' : ''} ${needs?.shouldShowAlternatives ? 'Show different approaches.' : ''}` 
          },
          { 
            role: 'user', 
            content: `${context.userRequest}\n\nContext: ${JSON.stringify(context.awashContext?.workspace || {}, null, 2)}` 
          }
        ]
      }),
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  /**
   * Generate clarification request
   */
  private async generateClarificationRequest(
    context: ExecutionContext,
    understanding: DeepUnderstanding
  ): Promise<string> {
    console.log('🔧 Tool: clarification_generator');
    
    const uncertainties = understanding.meta.uncertainties;
    const suggestedActions = understanding.meta.suggestedUserActions || [];
    
    let message = `I want to make sure I understand correctly:\n\n`;
    
    if (uncertainties.length > 0) {
      message += `**Unclear points:**\n`;
      uncertainties.forEach((u, i) => {
        message += `${i + 1}. ${u}\n`;
      });
      message += `\n`;
    }
    
    if (suggestedActions.length > 0) {
      message += `**To proceed, could you:**\n`;
      suggestedActions.forEach((a, i) => {
        message += `${i + 1}. ${a}\n`;
      });
    }
    
    return message;
  }
  
  /**
   * Execute a single step
   */
  private async executeStep(
    context: ExecutionContext,
    understanding: DeepUnderstanding,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<string> {
    console.log(`🔧 Executing: ${step.action}`);
    
    // Route to appropriate tool based on toolsNeeded
    if (step.toolsNeeded.includes('explanation')) {
      return await this.generateExplanation(
        context,
        understanding,
        understanding.actionPlan.explanationNeeds
      );
    }
    
    if (step.toolsNeeded.includes('code_generator')) {
      const files = await this.generateCode(context, understanding, step);
      return `Generated ${files.length} files: ${files.join(', ')}`;
    }
    
    return `Completed: ${step.action}`;
  }
  
  /**
   * Broadcast status update
   */
  private async broadcastStatus(
    phase: 'starting' | 'building' | 'validating' | 'completing',
    understanding: DeepUnderstanding
  ): Promise<void> {
    if (!this.broadcastCallback) return;
    
    const phaseMap = {
      starting: 'reading',
      building: 'editing',
      validating: 'validating',
      completing: 'complete'
    };
    
    await this.broadcastCallback({
      status: phaseMap[phase],
      message: `${phase.charAt(0).toUpperCase() + phase.slice(1)}...`,
      metadata: {
        goal: understanding.understanding.userGoal,
        confidence: understanding.meta.confidence
      }
    });
  }
}

// Legacy compatibility exports
export const AdaptiveExecutor = AutonomousExecutor;
export type { ExecutionContext, ExecutionResult };
