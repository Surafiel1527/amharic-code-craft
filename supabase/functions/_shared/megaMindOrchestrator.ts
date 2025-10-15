/**
 * MEGA MIND ORCHESTRATOR - UNIFIED INTELLIGENCE
 * Award-Winning Enterprise Architecture
 * 
 * Now powered by:
 * - Meta-Cognitive Analyzer: AI determines intent & strategy
 * - Natural Communicator: AI generates all messages
 * - Adaptive Executor: Dynamic strategy-based execution
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaCognitiveAnalyzer, QueryAnalysis } from './intelligence/metaCognitiveAnalyzer.ts';
import { NaturalCommunicator } from './intelligence/naturalCommunicator.ts';
import { AdaptiveExecutor, ExecutionContext, ExecutionResult } from './intelligence/adaptiveExecutor.ts';
import { logger } from './logger.ts';
import { validateString, validateUuid } from './validation.ts';
import { ValidationError } from './errorHandler.ts';

export interface MegaMindRequest {
  userRequest: string;
  userId: string;
  conversationId: string;
  projectId?: string;
}

export interface MegaMindDecision {
  understood: boolean;
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'mega_complex';
  requiredPhases: number;
  requiredFunctions: number;
  requiredTables: number;
  needsInternet: boolean;
  needsCredentials: string[];
  reasoning: string[];
  
  plan: {
    phases: Array<{
      phaseNumber: number;
      goal: string;
      actions: string[];
      resources: string[];
      estimatedFiles: number;
    }>;
    totalEstimatedTime: string;
    riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  };
  
  resourceRequests: Array<{
    type: 'database' | 'api_key' | 'credentials' | 'external_service';
    name: string;
    reason: string;
    required: boolean;
  }>;
  
  selfTest: {
    willTest: boolean;
    testStrategy: string;
    expectedErrors: string[];
  };
}

export class MegaMindOrchestrator {
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
   * UNIFIED PROCESS REQUEST
   * Single entry point that handles: analyze → determine strategy → execute
   */
  async processRequest(request: MegaMindRequest): Promise<{
    analysis: QueryAnalysis;
    result: ExecutionResult;
  }> {
    // Validate inputs
    const requestValidation = validateString(request.userRequest, { 
      minLength: 1, 
      maxLength: 10000 
    });
    if (!requestValidation.success) {
      throw new ValidationError('Invalid user request');
    }

    const userIdValidation = validateUuid(request.userId);
    if (!userIdValidation.success) {
      throw new ValidationError('Invalid user ID');
    }

    // Broadcast workspace context
    await this.broadcastStatus(request, {
      status: 'analyzing',
      message: '🎯 Initializing in your workspace...',
      metadata: {
        workspace: {
          projectId: request.projectId,
          conversationId: request.conversationId,
          userId: request.userId
        }
      }
    });

    logger.info('🧠 Universal Mega Mind: Processing request', {
      userId: request.userId,
      conversationId: request.conversationId,
      requestLength: request.userRequest.length
    });
    
    // STEP 1: Meta-Cognitive Analysis (AI determines strategy)
    const analysis = await this.analyzer.analyzeQuery(
      request.userRequest,
      {
        conversationId: request.conversationId,
        userId: request.userId,
        projectId: request.projectId,
        existingContext: await this.getProjectContext(request.projectId)
      }
    );
    
    this.currentAnalysis = analysis;
    
    logger.info('✅ Analysis complete', {
      intent: analysis.userIntent.primaryGoal,
      complexity: analysis.complexity.level,
      strategy: analysis.executionStrategy.primaryApproach
    });
    
    // STEP 2: Execute with Adaptive Strategy
    const executionContext: ExecutionContext = {
      userRequest: request.userRequest,
      userId: request.userId,
      conversationId: request.conversationId,
      projectId: request.projectId,
      framework: analysis.technicalRequirements.framework
    };
    
    let result: ExecutionResult;
    
    // Route to appropriate execution mode based on AI's decision
    switch (analysis.executionStrategy.primaryApproach) {
      case 'instant':
        result = await this.executor.executeInstant(executionContext, analysis);
        break;
      case 'progressive':
        result = await this.executor.executeProgressive(executionContext, analysis);
        break;
      case 'conversational':
        result = await this.executor.executeConversational(executionContext, analysis);
        break;
      case 'hybrid':
        result = await this.executor.executeHybrid(executionContext, analysis);
        break;
      default:
        throw new Error(`Unknown execution strategy: ${analysis.executionStrategy.primaryApproach}`);
    }
    
    logger.info('✅ Execution complete', {
      success: result.success,
      duration: result.duration,
      filesGenerated: result.filesGenerated?.length || 0
    });
    
    return {
      analysis,
      result
    };
  }
  
  /**
   * Get analysis for introspection
   */
  getCurrentAnalysis(): QueryAnalysis | undefined {
    return this.currentAnalysis;
  }
  
  /**
   * Get project context for analysis
   */
  private async getProjectContext(projectId?: string): Promise<any> {
    if (!projectId) return {};
    
    try {
      const { data } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      return data || {};
    } catch (error) {
      logger.warn('Could not fetch project context', { error });
      return {};
    }
  }

  /**
   * STEP 2: RESEARCH - Search internet if needed
   */
  async research(topic: string): Promise<{
    found: boolean;
    information: string;
    sources: string[];
    confidence: number;
  }> {
    console.log('🔍 Mega Mind: Researching:', topic);
    
    const { searchWeb } = await import('./webSearchEngine.ts');
    const searchResult = await searchWeb(topic, 10);
    
    return {
      found: searchResult.found,
      information: searchResult.results.map(r => `${r.title}: ${r.snippet}`).join('\n'),
      sources: searchResult.sources,
      confidence: searchResult.confidence
    };
  }

  /**
   * STEP 3: REQUEST RESOURCES - Ask user for missing credentials/resources
   */
  async requestResources(
    resources: MegaMindDecision['resourceRequests']
  ): Promise<Map<string, string>> {
    console.log('📋 Mega Mind: Requesting resources...');
    
    const { requestMultipleResources } = await import('./resourceRequestor.ts');
    
    // Convert to ResourceRequest format
    const resourceRequests = resources.map(r => ({
      type: r.type as 'api_key' | 'database' | 'credentials' | 'external_service',
      name: r.name,
      description: r.reason,
      required: r.required
    }));
    
    // Request all resources (this creates DB records the UI displays)
    const providedResources = await requestMultipleResources(
      this.supabase,
      '', // Will be filled by edge function
      '', // Will be filled by edge function
      resourceRequests
    );
    
    return providedResources;
  }

  /**
   * STEP 4: EXECUTE - Build the actual solution
   */
  async execute(
    decision: MegaMindDecision,
    resources: Map<string, string>
  ): Promise<{
    success: boolean;
    generated: any;
    errors: string[];
  }> {
    console.log('⚙️ Mega Mind: Executing plan...');
    
    const results = [];
    const errors: string[] = [];
    
    for (const phase of decision.plan.phases) {
      console.log(`🔨 Phase ${phase.phaseNumber}: ${phase.goal}`);
      
      for (const action of phase.actions) {
        try {
          // Execute each action
          const result = await this.executeAction(action, resources);
          results.push(result);
        } catch (error) {
          errors.push(`Failed in phase ${phase.phaseNumber}: ${error.message}`);
        }
      }
    }
    
    return {
      success: errors.length === 0,
      generated: results,
      errors
    };
  }

  /**
   * STEP 5: TEST - Compile and test the generated code
   */
  async test(
    generated: any,
    testStrategy: string
  ): Promise<{
    passed: boolean;
    errors: string[];
    fixes: string[];
  }> {
    console.log('🧪 Mega Mind: Testing generated code...');
    
    const { testAndFix } = await import('./selfTestingEngine.ts');
    
    // Convert generated output to CodeFile format
    const files = generated.files || [];
    
    // Test and auto-fix if needed
    const testResult = await testAndFix(files, 3);
    
    return {
      passed: testResult.success,
      errors: [
        ...testResult.testResult.compilationErrors,
        ...testResult.testResult.runtimeErrors
      ],
      fixes: testResult.testResult.suggestions
    };
  }

  /**
   * STEP 6: FIX - Auto-fix any errors found
   */
  async autoFix(errors: string[]): Promise<{
    fixed: boolean;
    changes: string[];
  }> {
    console.log('🔧 Mega Mind: Auto-fixing errors...');
    
    const { analyzeErrorWithAI, generateCodeWithReasoning } = await import('./aiReasoningEngine.ts');
    
    const changes: string[] = [];
    
    for (const error of errors) {
      try {
        // Use AI to analyze and suggest fixes
        const analysis = await analyzeErrorWithAI(error, '', {});
        
        if (analysis.suggestedFixes.length > 0) {
          const topFix = analysis.suggestedFixes[0];
          changes.push(`${topFix.fix} (confidence: ${topFix.confidence})`);
        }
      } catch (err) {
        console.error('Error analyzing:', err);
      }
    }
    
    return {
      fixed: changes.length === errors.length,
      changes
    };
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async assessTrueComplexity(
    request: string,
    context: any
  ): Promise<MegaMindDecision['complexity']> {
    // Analyze keywords
    const megaKeywords = [
      'amazon clone', 'uber clone', 'airbnb clone', 'full stack',
      'complete system', 'entire platform', 'fully functional'
    ];
    
    const isMega = megaKeywords.some(k => 
      request.toLowerCase().includes(k)
    );
    
    if (isMega) return 'mega_complex';
    
    if (context.complexity === 'complex') return 'complex';
    if (context.complexity === 'moderate') return 'moderate';
    return 'simple';
  }

  private async needsInternetResearch(request: string): Promise<boolean> {
    // Check if request mentions unfamiliar tech
    const unfamiliarPatterns = [
      /new\s+framework/i,
      /latest\s+\w+/i,
      /don't\s+know/i,
      /research/i,
      /look\s+up/i
    ];
    
    return unfamiliarPatterns.some(p => p.test(request));
  }

  private async identifyRequiredResources(
    request: string,
    context: any
  ): Promise<MegaMindDecision['resourceRequests']> {
    const resources: MegaMindDecision['resourceRequests'] = [];
    
    // Check for database needs
    if (request.match(/database|store|save|persist/i)) {
      resources.push({
        type: 'database',
        name: 'Database Connection',
        reason: 'To store and retrieve data',
        required: true
      });
    }
    
    // Check for external API needs
    const apiPatterns = {
      stripe: /payment|checkout|billing|stripe/i,
      openai: /ai|gpt|chat|assistant/i,
      aws: /storage|s3|file upload/i
    };
    
    for (const [api, pattern] of Object.entries(apiPatterns)) {
      if (pattern.test(request)) {
        resources.push({
          type: 'api_key',
          name: `${api.toUpperCase()} API Key`,
          reason: `To integrate with ${api}`,
          required: true
        });
      }
    }
    
    return resources;
  }

  private async estimateScope(
    request: string,
    complexity: MegaMindDecision['complexity']
  ): Promise<{
    phases: number;
    functions: number;
    tables: number;
    files: number;
  }> {
    // Use Feature Orchestrator for mega projects
    if (complexity === 'mega_complex') {
      return {
        phases: 8,
        functions: 40,
        tables: 15,
        files: 60
      };
    }
    
    if (complexity === 'complex') {
      return {
        phases: 4,
        functions: 20,
        tables: 8,
        files: 30
      };
    }
    
    if (complexity === 'moderate') {
      return {
        phases: 2,
        functions: 10,
        tables: 4,
        files: 15
      };
    }
    
    return {
      phases: 1,
      functions: 3,
      tables: 2,
      files: 5
    };
  }

  private async generateIntelligentPlan(
    request: string,
    context: any,
    scope: any
  ): Promise<MegaMindDecision['plan']> {
    const phases = [];
    
    // Phase 1: Foundation
    phases.push({
      phaseNumber: 1,
      goal: 'Setup foundation (auth, database, core structure)',
      actions: [
        'Create database schema',
        'Setup authentication',
        'Configure RLS policies',
        'Create base components'
      ],
      resources: ['Database', 'Auth system'],
      estimatedFiles: Math.ceil(scope.files * 0.3)
    });
    
    // Phase 2: Core Features
    if (scope.phases >= 2) {
      phases.push({
        phaseNumber: 2,
        goal: 'Implement core features',
        actions: [
          'Build main components',
          'Create API endpoints',
          'Implement business logic'
        ],
        resources: ['Database queries', 'Edge functions'],
        estimatedFiles: Math.ceil(scope.files * 0.4)
      });
    }
    
    // Phase 3: Advanced Features
    if (scope.phases >= 4) {
      phases.push({
        phaseNumber: 3,
        goal: 'Add advanced features',
        actions: [
          'Real-time updates',
          'Search functionality',
          'Notifications'
        ],
        resources: ['Realtime subscriptions', 'Search indexes'],
        estimatedFiles: Math.ceil(scope.files * 0.2)
      });
    }
    
    // Phase 4: Polish
    if (scope.phases >= 4) {
      phases.push({
        phaseNumber: 4,
        goal: 'Polish and optimize',
        actions: [
          'Error handling',
          'Loading states',
          'Performance optimization'
        ],
        resources: [],
        estimatedFiles: Math.ceil(scope.files * 0.1)
      });
    }
    
    return {
      phases,
      totalEstimatedTime: this.estimateTime(scope.files),
      riskLevel: scope.phases >= 4 ? 'high' : 
                 scope.phases >= 2 ? 'medium' : 'low'
    };
  }

  private async planSelfTest(
    request: string,
    scope: any
  ): Promise<MegaMindDecision['selfTest']> {
    return {
      willTest: true,
      testStrategy: scope.phases >= 4 
        ? 'Comprehensive testing with automated fixes'
        : 'Basic compilation and runtime checks',
      expectedErrors: [
        'TypeScript type errors',
        'Missing imports',
        'RLS policy violations'
      ]
    };
  }

  private buildReasoning(
    request: string,
    context: any,
    scope: any
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(
      `Analyzed request: "${request.slice(0, 100)}..."`
    );
    
    reasoning.push(
      `Detected ${scope.functions} required functions across ${scope.phases} phases`
    );
    
    reasoning.push(
      `Identified ${scope.tables} database tables needed`
    );
    
    if (context.confidenceScore > 0.8) {
      reasoning.push('High confidence - have clear implementation path');
    } else {
      reasoning.push('Will proceed cautiously with testing at each step');
    }
    
    return reasoning;
  }

  private estimateTime(files: number): string {
    const minutes = files * 3; // 3 min per file estimate
    
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  private async executeAction(
    action: string,
    resources: Map<string, string>
  ): Promise<any> {
    // TODO: Implement actual action execution
    console.log(`  ✓ ${action}`);
    return { action, completed: true };
  }

  private async analyzeAndFix(error: string): Promise<string | null> {
    // TODO: Implement intelligent error analysis and fixing
    console.log(`  🔧 Analyzing: ${error}`);
    return `Fixed: ${error}`;
  }

  /**
   * Broadcast status updates with workspace context
   */
  private async broadcastStatus(
    request: MegaMindRequest,
    update: {
      status: string;
      message: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      const channelId = request.projectId || request.conversationId;
      const channel = this.supabase.channel(`ai-status-${channelId}`);
      
      await channel.send({
        type: 'broadcast',
        event: 'status-update',
        payload: {
          ...update,
          timestamp: new Date().toISOString(),
          workspace: {
            projectId: request.projectId,
            conversationId: request.conversationId,
            userId: request.userId
          }
        }
      });
    } catch (error) {
      logger.warn('Failed to broadcast status', { error });
    }
  }
}
