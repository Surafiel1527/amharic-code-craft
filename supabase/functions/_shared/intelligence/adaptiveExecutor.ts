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
  supervisorFeedback?: string;  // Feedback from supervisor for refinement
  generatedFiles?: Array<{
    path: string;
    content: string;
    language: string;
  }>;
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
   * Log telemetry for monitoring (enterprise observability)
   */
  private async logTelemetry(data: any): Promise<void> {
    try {
      await this.supabase
        .from('orchestration_metrics')
        .insert({
          ...data,
          timestamp: new Date().toISOString()
        });
    } catch (e) {
      console.warn('Failed to log telemetry:', e.message);
    }
  }
  
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
    
    // CRITICAL: If supervisor provided feedback, re-analyze with that feedback to adjust plan
    let workingUnderstanding = understanding;
    if (context.supervisorFeedback) {
      console.log('🔄 Supervisor Feedback Detected - Re-analyzing to incorporate feedback...');
      console.log(`📋 Feedback: ${context.supervisorFeedback.substring(0, 300)}...`);
      
      const { MetaCognitiveAnalyzer } = await import('./metaCognitiveAnalyzer.ts');
      const analyzer = new MetaCognitiveAnalyzer(this.lovableApiKey);
      
      // Re-analyze with supervisor feedback integrated
      workingUnderstanding = await analyzer.analyzeRequest(
        context.userRequest,
        {
          conversationHistory: context.awashContext?.conversationHistory,
          projectContext: context.awashContext,
          existingFiles: context.existingFiles,
          framework: context.framework,
          currentRoute: context.awashContext?.currentRoute,
          recentErrors: context.awashContext?.recentErrors,
          supervisorFeedback: context.supervisorFeedback
        }
      );
      
      console.log('✅ Re-analysis complete:', {
        newStepsCount: workingUnderstanding.actionPlan.executionSteps.length,
        confidence: workingUnderstanding.meta.confidence,
        adjustedPlan: workingUnderstanding.understanding.userGoal
      });
    }
    
    try {
      // Broadcast initial status with working understanding
      await this.broadcastStatus('starting', workingUnderstanding);
      
      // Execute based on what AI decided is needed (using potentially adjusted plan)
      if (workingUnderstanding.actionPlan.requiresCodeGeneration) {
        return await this.executeCodeGeneration(context, workingUnderstanding, startTime);
      } else if (workingUnderstanding.actionPlan.requiresExplanation) {
        return await this.executeExplanation(context, workingUnderstanding, startTime);
      } else if (workingUnderstanding.actionPlan.requiresClarification) {
        return await this.executeClarification(context, workingUnderstanding, startTime);
      } else {
        // Fallback - execute the steps as planned
        return await this.executeAutonomousPlan(context, workingUnderstanding, startTime);
      }
      
    } catch (error) {
      console.error('❌ Autonomous Executor error:', error);
      
      const errorMsg = await this.communicator.generateErrorResponse(
        error as Error,
        {
          phase: 'error',
          taskDescription: workingUnderstanding.understanding.userGoal
        },
        workingUnderstanding as any // Type compatibility
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
    
    // Initialize generatedFiles array in context if not exists
    if (!context.generatedFiles) {
      context.generatedFiles = [];
    }
    
    // ✅ CRITICAL FIX: Ensure at least one step has code_generator
    // ENTERPRISE FIX: Validate tool inclusion BEFORE execution
    const hasCodeGeneratorStep = understanding.actionPlan.executionSteps.some(
      step => step.toolsNeeded.includes('code_generator')
    );
    
    if (!hasCodeGeneratorStep) {
      console.error('🚨 CRITICAL: No code_generator tool in plan! This will fail.');
      // Log to telemetry for monitoring
      await this.logTelemetry({
        event: 'missing_tool_enforcement',
        steps: understanding.actionPlan.executionSteps.length,
        confidence: understanding.meta.confidence
      });
      
      // Add code_generator as FIRST step (not last) for proper execution flow
      understanding.actionPlan.executionSteps.unshift({
        step: 0,
        action: 'Generate code files using code_generator tool',
        reason: 'CRITICAL: Code generation requires explicit tool usage',
        toolsNeeded: ['code_generator']
      });
      
      // Re-number steps
      understanding.actionPlan.executionSteps.forEach((step, i) => step.step = i + 1);
      
      console.log('✅ Injected code_generator tool as primary step');
    }
    
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
    
    // Log what we're returning
    console.log('📦 Code generation complete:', {
      filesGeneratedCount: context.generatedFiles.length,
      filePaths: filesGenerated,
      filesStructure: context.generatedFiles.map(f => ({ path: f.path, hasContent: !!f.content }))
    });
    
    // Generate completion message
    const completionMsg = await this.communicator.generateCompletionSummary(
      understanding.understanding.userGoal,
      filesGenerated,
      Date.now() - startTime,
      understanding as any
    );
    
    // Return files in output for intelligentFileOperations
    return {
      success: true,
      output: {
        files: context.generatedFiles  // Don't use || [] fallback to see if it's actually undefined
      },
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
    console.log('🔧 Tool: code_generator - Starting...');
    
    const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
    
    const result = await generateCodeWithReasoning({
      functionality: understanding.understanding.userGoal,
      requirements: understanding.understanding.implicitRequirements.join(', '),
      framework: context.framework || 'react',
      existingCode: context.existingFiles || {},
      awashContext: context.awashContext  // Pass full platform context
    });
    
    console.log('🔧 Tool: code_generator - AI returned:', {
      filesCount: result.files?.length || 0,
      hasFiles: !!result.files,
      filesSample: result.files?.slice(0, 2).map(f => ({ path: f.path, contentLength: f.content?.length }))
    });
    
    // Validate that we got files
    if (!result.files || !Array.isArray(result.files) || result.files.length === 0) {
      console.error('❌ AI generated NO files! This should never happen.');
      throw new Error('AI code generation failed: No files returned');
    }
    
    // Store generated files for later database save
    if (!context.generatedFiles) {
      context.generatedFiles = [];
    }
    
    // Push files and log it
    const beforeCount = context.generatedFiles.length;
    context.generatedFiles.push(...result.files);
    console.log(`📁 Stored ${result.files.length} files in context (${beforeCount} -> ${context.generatedFiles.length})`);
    
    // Return file paths for tracking
    const filePaths = result.files.map((f: any) => f.path);
    return filePaths;
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
