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
      
      // ✅ NEW DIAGNOSTIC TOOLS
      if (step.toolsNeeded.includes('database_introspector')) {
        await this.runDatabaseIntrospection(context, step);
      }
      
      if (step.toolsNeeded.includes('storage_verifier')) {
        await this.runStorageVerification(context, filesGenerated, step);
      }
      
      if (step.toolsNeeded.includes('issue_detector')) {
        await this.runIssueDetection(context, step);
      }
      
      // ✅ NEW: Failure analysis tools
      if (step.toolsNeeded.includes('failure_analyzer')) {
        await this.runFailureAnalyzer(context, step);
      }
      
      if (step.toolsNeeded.includes('error_explainer')) {
        await this.runErrorExplainer(context, step);
      }
      
      if (step.toolsNeeded.includes('json_validator')) {
        await this.runJsonValidator(context, step);
      }
      
      if (step.toolsNeeded.includes('recovery_engine')) {
        await this.runRecovery(context, filesGenerated, step);
      }
      
      // ✅ NEW: Universal error detection tools
      if (step.toolsNeeded.includes('universal_error_detector')) {
        await this.runUniversalErrorDetector(context, step);
      }
      
      if (step.toolsNeeded.includes('runtime_error_analyzer')) {
        await this.runRuntimeErrorAnalyzer(context, step);
      }
      
      if (step.toolsNeeded.includes('auth_error_detector')) {
        await this.runAuthErrorDetector(context, step);
      }
      
      if (step.toolsNeeded.includes('build_error_analyzer')) {
        await this.runBuildErrorAnalyzer(context, step);
      }
      
      if (step.toolsNeeded.includes('edge_function_monitor')) {
        await this.runEdgeFunctionMonitor(context, step);
      }
      
      if (step.toolsNeeded.includes('performance_analyzer')) {
        await this.runPerformanceAnalyzer(context, step);
      }
      
      if (step.toolsNeeded.includes('dependency_checker')) {
        await this.runDependencyChecker(context, step);
      }
    }
    
    // Log what we're returning
    console.log('📦 Code generation complete:', {
      filesGeneratedCount: context.generatedFiles.length,
      filePaths: filesGenerated,
      filesStructure: context.generatedFiles.map(f => ({ path: f.path, hasContent: !!f.content }))
    });
    
    // ✅ LAYER 3: POST-OPERATION VERIFICATION (Self-Aware Agent)
    console.log('🔍 [Layer 3] POST-OPERATION VERIFICATION: Checking if files actually exist in database...');
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId!);
    
    // Wait a moment for database writes to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const verification = await introspector.verifyFilesExist(filesGenerated);
    
    console.log('📊 [Layer 3] Verification Result:', {
      expectedFiles: filesGenerated.length,
      foundFiles: verification.fileCount,
      missing: verification.missingFiles.length,
      healthy: verification.storageHealthy,
      issues: verification.issues
    });
    
    // ✅ LAYER 4: RECOVERY PROTOCOL
    if (!verification.storageHealthy || verification.missingFiles.length > 0) {
      console.warn('⚠️ [Layer 4] RECOVERY PROTOCOL: Files missing or storage unhealthy!');
      console.warn('Missing files:', verification.missingFiles);
      console.warn('Issues:', verification.issues);
      
      // Broadcast recovery status
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'fixing',
          message: `🔧 Detected ${verification.missingFiles.length} missing files. Auto-recovering...`,
          metadata: {
            missingFiles: verification.missingFiles,
            issues: verification.issues
          }
        });
      }
      
      // TODO: Implement automatic file recovery
      // For now, log the issue and inform user
      console.error('🚨 [Layer 4] CRITICAL: Files did not persist to database!');
      console.error('This should trigger automatic recovery in future implementation');
    } else {
      console.log('✅ [Layer 3] VERIFICATION PASSED: All files exist in database');
      
      // Broadcast success
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'complete',
          message: `✅ Verified ${verification.fileCount} files saved successfully`,
          metadata: {
            fileCount: verification.fileCount,
            filePaths: verification.filePaths
          }
        });
      }
    }
    
    // Generate completion message WITH verification info
    let completionMsg = await this.communicator.generateCompletionSummary(
      understanding.understanding.userGoal,
      filesGenerated,
      Date.now() - startTime,
      understanding as any
    );
    
    // Append verification status to message
    if (!verification.storageHealthy) {
      completionMsg = {
        ...completionMsg,
        content: completionMsg.content + `\n\n⚠️ Note: Detected ${verification.missingFiles.length} files that didn't persist properly. Working on recovery...`
      };
    } else {
      completionMsg = {
        ...completionMsg,
        content: completionMsg.content + `\n\n✅ Verified: All ${verification.fileCount} files saved successfully.`
      };
    }
    
    // Return files in output for intelligentFileOperations + verification results
    return {
      success: true,
      output: {
        files: context.generatedFiles,
        verification // Include verification results
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
   * ✅ NEW TOOL: Database Introspection
   * Agent can query database to understand storage state
   */
  private async runDatabaseIntrospection(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🔍 Tool: database_introspector - Agent checking storage...');
    
    if (!context.projectId) {
      console.warn('⚠️ No projectId available for introspection');
      return;
    }
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId);
    
    const storageState = await introspector.getProjectStorageState();
    
    console.log('📊 Database Introspection Result:', {
      totalFiles: storageState.totalFiles,
      healthScore: storageState.healthScore,
      fileTypes: storageState.filesByType
    });
    
    // Broadcast findings to user
    if (this.broadcastCallback) {
      await this.broadcastCallback({
        status: 'analyzing',
        message: `📊 Checked database: ${storageState.totalFiles} files found (Health: ${storageState.healthScore}%)`,
        metadata: { storageState }
      });
    }
    
    // Store in context for later use
    if (!context.awashContext) context.awashContext = {};
    context.awashContext.introspectionResult = storageState;
  }
  
  /**
   * ✅ NEW TOOL: Storage Verification
   * Agent verifies files actually exist
   */
  private async runStorageVerification(
    context: ExecutionContext,
    expectedFiles: string[],
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🔬 Tool: storage_verifier - Verifying file existence...');
    
    if (!context.projectId) {
      console.warn('⚠️ No projectId available for verification');
      return;
    }
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId);
    
    const verification = await introspector.verifyFilesExist(expectedFiles);
    
    console.log('✅ Storage Verification Result:', {
      expected: expectedFiles.length,
      found: verification.fileCount,
      missing: verification.missingFiles.length,
      healthy: verification.storageHealthy
    });
    
    // Broadcast verification status
    if (this.broadcastCallback) {
      const message = verification.storageHealthy
        ? `✅ Verified: All ${verification.fileCount} files exist`
        : `⚠️ Warning: ${verification.missingFiles.length} files missing`;
        
      await this.broadcastCallback({
        status: verification.storageHealthy ? 'complete' : 'fixing',
        message,
        metadata: { verification }
      });
    }
    
    // Store in context
    if (!context.awashContext) context.awashContext = {};
    context.awashContext.verificationResult = verification;
  }
  
  /**
   * ✅ NEW TOOL: Issue Detection
   * Agent proactively detects storage issues
   */
  private async runIssueDetection(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🔬 Tool: issue_detector - Scanning for problems...');
    
    if (!context.projectId) {
      console.warn('⚠️ No projectId available for issue detection');
      return;
    }
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId);
    
    const issues = await introspector.detectStorageIssues();
    
    console.log('🔍 Issue Detection Result:', {
      hasIssues: issues.hasIssues,
      issueCount: issues.issues.length,
      recommendations: issues.recommendations.length
    });
    
    if (issues.hasIssues) {
      console.warn('⚠️ Issues detected:', issues.issues);
      console.warn('📋 Recommendations:', issues.recommendations);
      
      // Broadcast issues to user
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `🔍 Detected ${issues.issues.length} storage issues. Preparing fixes...`,
          metadata: { issues }
        });
      }
    }
    
    // Store in context
    if (!context.awashContext) context.awashContext = {};
    context.awashContext.detectedIssues = issues;
  }
  
  /**
   * ✅ COMPLETE RECOVERY ENGINE
   * Agent automatically fixes storage issues with full regeneration capability
   */
  private async runRecovery(
    context: ExecutionContext,
    filesExpected: string[],
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🏥 Tool: recovery_engine - Auto-fixing issues...');
    
    if (!context.projectId) {
      console.warn('⚠️ No projectId available for recovery');
      return;
    }
    
    // Broadcast recovery start
    if (this.broadcastCallback) {
      await this.broadcastCallback({
        status: 'fixing',
        message: '🏥 Running automatic recovery protocol...',
        metadata: { expectedFiles: filesExpected }
      });
    }
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId);
    
    // STEP 1: Verify current state
    const verification = await introspector.verifyFilesExist(filesExpected);
    
    if (verification.storageHealthy) {
      console.log('✅ Storage healthy - no recovery needed');
      return;
    }
    
    console.log('🏥 Recovery needed:', {
      missingFiles: verification.missingFiles.length,
      issues: verification.issues
    });
    
    // STEP 2: Get failure context to understand WHY files are missing
    const failureContext = await introspector.getGenerationFailureContext(10);
    console.log('📊 Failure Analysis:', {
      totalFailures: failureContext.totalFailures,
      hasJsonErrors: failureContext.hasJsonErrors,
      topErrors: failureContext.commonErrors.slice(0, 3).map(e => e.type)
    });
    
    // STEP 3: Get recovery suggestions
    const recoverySuggestions = await introspector.getRecoverySuggestions(
      verification.missingFiles,
      verification.issues
    );
    
    console.log('💡 Recovery Plan:', {
      suggestions: recoverySuggestions.suggestions.length,
      estimatedTime: recoverySuggestions.estimatedRecoveryTime
    });
    
    // STEP 4: Execute recovery actions
    let recoveredFiles: string[] = [];
    
    // Action 1: Regenerate missing files
    if (verification.missingFiles.length > 0) {
      console.log('🔄 Regenerating', verification.missingFiles.length, 'missing files...');
      
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'fixing',
          message: `🔄 Regenerating ${verification.missingFiles.length} missing files...`,
          metadata: { 
            files: verification.missingFiles,
            reason: failureContext.explanation
          }
        });
      }
      
      try {
        // Use the understanding to regenerate with context
        const understanding = context.awashContext?.understanding || {
          userGoal: 'Recover missing files',
          implicitRequirements: ['Regenerate with proper database persistence']
        };
        
        // Generate code specifically for missing files
        const { generateCodeWithReasoning } = await import('../aiReasoningEngine.ts');
        
        const recoveryPrompt = `
🆘 RECOVERY MODE - Regenerating Missing Files

CONTEXT:
${verification.missingFiles.length} files were generated but not saved to database.

FAILURE ANALYSIS:
${failureContext.explanation}

${failureContext.hasJsonErrors ? '⚠️ Previous attempts had JSON errors - ensure valid JSON output!' : ''}

FILES TO REGENERATE:
${verification.missingFiles.map(f => `- ${f}`).join('\n')}

REQUIREMENTS:
1. Generate complete, working code for each missing file
2. Ensure proper imports and exports
3. Maintain consistency with existing project structure
4. Use TypeScript for type safety
5. Include all necessary dependencies

CRITICAL: Output must be valid JSON with this structure:
{
  "files": [
    { "path": "...", "content": "...", "language": "..." }
  ],
  "explanation": "...",
  "reasoning": ["..."]
}`;

        const result = await generateCodeWithReasoning({
          functionality: recoveryPrompt,
          framework: context.framework || 'react',
          requirements: 'Regenerate missing files with proper structure',
          existingCode: context.existingFiles || {},
          awashContext: {
            ...context.awashContext,
            recoveryMode: true,
            missingFiles: verification.missingFiles,
            failureContext: failureContext
          }
        });
        
        if (result.files && result.files.length > 0) {
          console.log('✅ Regenerated', result.files.length, 'files');
          
          // Store regenerated files
          if (!context.generatedFiles) {
            context.generatedFiles = [];
          }
          context.generatedFiles.push(...result.files);
          recoveredFiles = result.files.map(f => f.path);
          
          if (this.broadcastCallback) {
            await this.broadcastCallback({
              status: 'complete',
              message: `✅ Successfully regenerated ${result.files.length} files`,
              metadata: { recoveredFiles }
            });
          }
        } else {
          console.error('❌ Recovery generation returned no files');
          
          if (this.broadcastCallback) {
            await this.broadcastCallback({
              status: 'error',
              message: '❌ Recovery failed - no files generated',
              metadata: { originalIssues: verification.issues }
            });
          }
        }
        
      } catch (recoveryError) {
        console.error('❌ Recovery generation failed:', recoveryError);
        
        if (this.broadcastCallback) {
          await this.broadcastCallback({
            status: 'error',
            message: `❌ Recovery failed: ${recoveryError.message}`,
            metadata: { 
              error: recoveryError.message,
              suggestions: recoverySuggestions.suggestions
            }
          });
        }
      }
    }
    
    // Action 2: Fix empty content files
    const emptyFileIssue = verification.issues.find(i => i.includes('empty content'));
    if (emptyFileIssue) {
      console.log('🔧 Fixing files with empty content...');
      
      // Query files with empty content
      const { data: emptyFiles } = await this.supabase
        .from('project_files')
        .select('file_path')
        .eq('project_id', context.projectId)
        .or('file_content.is.null,file_content.eq.');
      
      if (emptyFiles && emptyFiles.length > 0) {
        console.log('📝 Found', emptyFiles.length, 'empty files to regenerate');
        // These would be regenerated using same logic as missing files
      }
    }
    
    // Action 3: Handle duplicates
    const duplicateIssue = verification.issues.find(i => i.includes('Duplicate'));
    if (duplicateIssue) {
      console.log('🔧 Removing duplicate files...');
      
      // Query and remove duplicates (keep most recent)
      const { data: files } = await this.supabase
        .from('project_files')
        .select('id, file_path, updated_at')
        .eq('project_id', context.projectId)
        .order('file_path')
        .order('updated_at', { ascending: false });
      
      if (files) {
        const seen = new Set<string>();
        const toDelete: string[] = [];
        
        for (const file of files) {
          if (seen.has(file.file_path)) {
            toDelete.push(file.id);
          } else {
            seen.add(file.file_path);
          }
        }
        
        if (toDelete.length > 0) {
          await this.supabase
            .from('project_files')
            .delete()
            .in('id', toDelete);
          
          console.log('✅ Removed', toDelete.length, 'duplicate files');
        }
      }
    }
    
    // STEP 5: Final verification
    console.log('🔍 Running final verification...');
    const finalVerification = await introspector.verifyFilesExist(filesExpected);
    
    if (finalVerification.storageHealthy) {
      console.log('✅ RECOVERY SUCCESSFUL! All files now exist and are healthy');
      
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'complete',
          message: '✅ Recovery complete - all files restored successfully',
          metadata: { 
            recoveredCount: recoveredFiles.length,
            finalHealth: finalVerification.healthScore,
            totalFiles: finalVerification.fileCount
          }
        });
      }
    } else {
      console.warn('⚠️ Recovery partially successful:', {
        stillMissing: finalVerification.missingFiles.length,
        issues: finalVerification.issues
      });
      
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'fixing',
          message: `⚠️ Recovery partial: ${finalVerification.missingFiles.length} files still missing`,
          metadata: { 
            recoveredCount: recoveredFiles.length,
            stillMissing: finalVerification.missingFiles,
            suggestions: recoverySuggestions.suggestions
          }
        });
      }
    }
  }
  
  /**
   * ✅ NEW TOOL: Failure Analyzer
   * Query and analyze past generation failures
   */
  private async runFailureAnalyzer(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🔍 Tool: failure_analyzer - Analyzing past failures...');
    
    if (!context.projectId) {
      console.warn('⚠️ No projectId available for failure analysis');
      return;
    }
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId);
    
    const failureContext = await introspector.getGenerationFailureContext(15);
    
    console.log('📊 Failure Analysis:', {
      totalFailures: failureContext.totalFailures,
      uniqueErrorTypes: failureContext.commonErrors.length,
      hasJsonErrors: failureContext.hasJsonErrors
    });
    
    // Broadcast findings to user
    if (this.broadcastCallback) {
      await this.broadcastCallback({
        status: 'analyzing',
        message: `📊 Analyzed ${failureContext.totalFailures} past failures`,
        metadata: { 
          failureContext,
          topErrors: failureContext.commonErrors.slice(0, 3)
        }
      });
    }
    
    // Store in context for recovery use
    if (!context.awashContext) context.awashContext = {};
    context.awashContext.failureContext = failureContext;
  }
  
  /**
   * ✅ NEW TOOL: Error Explainer
   * Generate human-readable explanation of what went wrong
   */
  private async runErrorExplainer(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('💬 Tool: error_explainer - Explaining errors to user...');
    
    if (!context.projectId) {
      console.warn('⚠️ No projectId available for error explanation');
      return;
    }
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId);
    
    // Get failure context
    const failureContext = await introspector.getGenerationFailureContext(10);
    
    // Generate user-friendly explanation
    let explanation = '🔍 Here\'s what happened:\n\n';
    
    if (failureContext.totalFailures === 0) {
      explanation += '✅ Good news - no recent failures detected. The storage is healthy.';
    } else {
      explanation += failureContext.explanation;
      
      // Add specific recommendations
      if (failureContext.hasJsonErrors) {
        explanation += '\n\n💡 What this means:\n';
        explanation += 'The AI generated code, but the response format was invalid. ';
        explanation += 'I can fix this by regenerating with stricter validation.';
      }
      
      if (failureContext.commonErrors.length > 0) {
        explanation += '\n\n📋 Most Common Issue:\n';
        const topError = failureContext.commonErrors[0];
        explanation += `${topError.type} (${topError.count} times)\n`;
        if (topError.examples.length > 0) {
          explanation += `Example: ${topError.examples[0]}`;
        }
      }
    }
    
    console.log('✅ Generated explanation for user');
    
    // Broadcast explanation
    if (this.broadcastCallback) {
      await this.broadcastCallback({
        status: 'analyzing',
        message: explanation,
        metadata: { failureContext }
      });
    }
    
    // Store explanation
    if (!context.awashContext) context.awashContext = {};
    context.awashContext.errorExplanation = explanation;
  }
  
  /**
   * ✅ NEW TOOL: JSON Validator
   * Check for JSON parsing errors specifically
   */
  private async runJsonValidator(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🔬 Tool: json_validator - Checking for JSON errors...');
    
    if (!context.projectId) {
      console.warn('⚠️ No projectId available for JSON validation');
      return;
    }
    
    const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
    const introspector = new DatabaseIntrospector(this.supabase, context.projectId);
    
    const jsonCheck = await introspector.detectJsonErrors();
    
    console.log('🔍 JSON Validation Result:', {
      hasJsonErrors: jsonCheck.hasJsonErrors,
      errorCount: jsonCheck.errorCount
    });
    
    if (jsonCheck.hasJsonErrors) {
      console.warn('⚠️ JSON errors detected:', jsonCheck.examples);
      
      // Broadcast warning
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `⚠️ Detected ${jsonCheck.errorCount} JSON parsing errors`,
          metadata: { 
            jsonErrors: jsonCheck.examples,
            recommendation: jsonCheck.recommendation
          }
        });
      }
    } else {
      console.log('✅ No JSON errors found');
      
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: '✅ No JSON errors detected',
          metadata: { jsonCheck }
        });
      }
    }
    
    // Store in context
    if (!context.awashContext) context.awashContext = {};
    context.awashContext.jsonValidation = jsonCheck;
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

  /**
   * ✅ NEW: Universal Error Detector
   * Runs comprehensive error detection across ALL categories
   */
  private async runUniversalErrorDetector(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🌍 [UniversalErrorDetector] Running comprehensive error detection...');
    
    try {
      const { DatabaseIntrospector } = await import('./databaseIntrospector.ts');
      const introspector = new DatabaseIntrospector(
        this.supabase,
        context.projectId || '',
        context.userId
      );
      
      const detection = await introspector.runUniversalErrorDetection();
      const errorContext = await introspector.getComprehensiveErrorContext();
      
      // Broadcast results to user
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `🔍 Universal Error Detection Complete`,
          metadata: {
            totalErrors: detection.summary.totalErrors,
            criticalCount: detection.summary.criticalCount,
            categoryCounts: detection.summary.categoryCounts,
            analysisDetails: errorContext
          }
        });
      }
      
      console.log('✅ [UniversalErrorDetector] Detection complete:', {
        totalErrors: detection.summary.totalErrors,
        criticalCount: detection.summary.criticalCount
      });
      
      // Store in context for AI to use
      if (!context.awashContext) context.awashContext = {};
      context.awashContext.universalErrorDetection = detection;
      context.awashContext.errorAnalysis = errorContext;
      
    } catch (e) {
      console.error('❌ [UniversalErrorDetector] Failed:', e);
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'error',
          message: `Failed to run universal error detection: ${e.message}`
        });
      }
    }
  }
  
  /**
   * ✅ NEW: Runtime Error Analyzer
   */
  private async runRuntimeErrorAnalyzer(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🔍 [RuntimeErrorAnalyzer] Analyzing runtime errors...');
    
    try {
      const { UniversalErrorDetector } = await import('./universalErrorDetector.ts');
      const detector = new UniversalErrorDetector(
        this.supabase,
        context.projectId,
        context.userId
      );
      
      const result = await detector.detectRuntimeErrors();
      
      if (this.broadcastCallback) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `🐛 Found ${result.errorCount} runtime errors`,
          metadata: { runtimeErrors: result }
        });
      }
      
    } catch (e) {
      console.error('❌ [RuntimeErrorAnalyzer] Failed:', e);
    }
  }
  
  /**
   * ✅ NEW: Auth Error Detector
   */
  private async runAuthErrorDetector(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🔒 [AuthErrorDetector] Detecting auth/RLS errors...');
    
    try {
      const { UniversalErrorDetector } = await import('./universalErrorDetector.ts');
      const detector = new UniversalErrorDetector(
        this.supabase,
        context.projectId,
        context.userId
      );
      
      const result = await detector.detectAuthErrors();
      
      if (this.broadcastCallback && result.errorCount > 0) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `🔑 Found ${result.errorCount} auth/RLS errors`,
          metadata: { authErrors: result }
        });
      }
      
    } catch (e) {
      console.error('❌ [AuthErrorDetector] Failed:', e);
    }
  }
  
  /**
   * ✅ NEW: Build Error Analyzer
   */
  private async runBuildErrorAnalyzer(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('📘 [BuildErrorAnalyzer] Analyzing build/TypeScript errors...');
    
    try {
      const { UniversalErrorDetector } = await import('./universalErrorDetector.ts');
      const detector = new UniversalErrorDetector(
        this.supabase,
        context.projectId,
        context.userId
      );
      
      const result = await detector.detectBuildErrors();
      
      if (this.broadcastCallback && result.errorCount > 0) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `⚠️ Found ${result.errorCount} build errors`,
          metadata: { buildErrors: result }
        });
      }
      
    } catch (e) {
      console.error('❌ [BuildErrorAnalyzer] Failed:', e);
    }
  }
  
  /**
   * ✅ NEW: Edge Function Monitor
   */
  private async runEdgeFunctionMonitor(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('⚡ [EdgeFunctionMonitor] Monitoring edge functions...');
    
    try {
      const { UniversalErrorDetector } = await import('./universalErrorDetector.ts');
      const detector = new UniversalErrorDetector(
        this.supabase,
        context.projectId,
        context.userId
      );
      
      const result = await detector.detectEdgeFunctionErrors();
      
      if (this.broadcastCallback && result.errorCount > 0) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `💥 Found ${result.errorCount} edge function errors`,
          metadata: { edgeFunctionErrors: result }
        });
      }
      
    } catch (e) {
      console.error('❌ [EdgeFunctionMonitor] Failed:', e);
    }
  }
  
  /**
   * ✅ NEW: Performance Analyzer
   */
  private async runPerformanceAnalyzer(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('🚀 [PerformanceAnalyzer] Analyzing performance issues...');
    
    try {
      const { UniversalErrorDetector } = await import('./universalErrorDetector.ts');
      const detector = new UniversalErrorDetector(
        this.supabase,
        context.projectId,
        context.userId
      );
      
      const result = await detector.detectPerformanceIssues();
      
      if (this.broadcastCallback && result.errorCount > 0) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `🐌 Found ${result.errorCount} performance issues`,
          metadata: { performanceIssues: result }
        });
      }
      
    } catch (e) {
      console.error('❌ [PerformanceAnalyzer] Failed:', e);
    }
  }
  
  /**
   * ✅ NEW: Dependency Checker
   */
  private async runDependencyChecker(
    context: ExecutionContext,
    step: DeepUnderstanding['actionPlan']['executionSteps'][0]
  ): Promise<void> {
    console.log('📦 [DependencyChecker] Checking dependencies...');
    
    try {
      const { UniversalErrorDetector } = await import('./universalErrorDetector.ts');
      const detector = new UniversalErrorDetector(
        this.supabase,
        context.projectId,
        context.userId
      );
      
      const result = await detector.detectDependencyIssues();
      
      if (this.broadcastCallback && result.errorCount > 0) {
        await this.broadcastCallback({
          status: 'analyzing',
          message: `🔄 Found ${result.errorCount} dependency issues`,
          metadata: { dependencyIssues: result }
        });
      }
      
    } catch (e) {
      console.error('❌ [DependencyChecker] Failed:', e);
    }
  }
}

// Legacy compatibility exports
export const AdaptiveExecutor = AutonomousExecutor;
export type { ExecutionContext, ExecutionResult };
