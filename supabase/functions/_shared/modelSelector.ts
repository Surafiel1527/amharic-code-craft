/**
 * Model Selector - Intelligent AI model selection
 * 
 * Selects optimal AI model based on:
 * - Task complexity
 * - Historical performance
 * - Cost constraints
 * - Speed requirements
 */

export interface ModelConfig {
  name: string;
  capabilities: {
    maxTokens: number;
    supportsImages: boolean;
    supportsStreaming: boolean;
    reasoningQuality: 'low' | 'medium' | 'high' | 'excellent';
  };
  performance: {
    avgLatency: number; // ms
    avgCost: number; // $ per request
    successRate: number; // 0-1
  };
  bestFor: string[];
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'google/gemini-2.5-pro': {
    name: 'google/gemini-2.5-pro',
    capabilities: {
      maxTokens: 8192,
      supportsImages: true,
      supportsStreaming: true,
      reasoningQuality: 'excellent'
    },
    performance: {
      avgLatency: 3000,
      avgCost: 0.15,
      successRate: 0.95
    },
    bestFor: ['complex-generation', 'refactoring', 'architecture']
  },
  'google/gemini-2.5-flash': {
    name: 'google/gemini-2.5-flash',
    capabilities: {
      maxTokens: 8192,
      supportsImages: true,
      supportsStreaming: true,
      reasoningQuality: 'high'
    },
    performance: {
      avgLatency: 1500,
      avgCost: 0.08,
      successRate: 0.92
    },
    bestFor: ['simple-generation', 'direct-edits', 'feature-build']
  },
  'google/gemini-2.5-flash-lite': {
    name: 'google/gemini-2.5-flash-lite',
    capabilities: {
      maxTokens: 4096,
      supportsImages: false,
      supportsStreaming: true,
      reasoningQuality: 'medium'
    },
    performance: {
      avgLatency: 800,
      avgCost: 0.03,
      successRate: 0.85
    },
    bestFor: ['simple-edits', 'quick-fixes', 'chat']
  }
};

export interface TaskProfile {
  complexity: 'low' | 'medium' | 'high';
  type: 'generation' | 'edit' | 'refactor' | 'chat';
  wordCount: number;
  requiresReasoning: boolean;
  speedPriority: 'low' | 'medium' | 'high';
  costSensitive: boolean;
}

/**
 * Analyze task to create profile
 */
export function profileTask(request: string, context: any): TaskProfile {
  const wordCount = request.split(/\s+/).length;
  const hasProject = !!context.projectId;
  
  // Determine complexity
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  if (wordCount < 20 && !hasProject) {
    complexity = 'low';
  } else if (wordCount > 50 || hasProject) {
    complexity = 'high';
  }
  
  // Determine type
  let type: 'generation' | 'edit' | 'refactor' | 'chat' = 'generation';
  const lowerRequest = request.toLowerCase();
  if (lowerRequest.includes('change') || lowerRequest.includes('update')) {
    type = 'edit';
  } else if (lowerRequest.includes('refactor') || lowerRequest.includes('optimize')) {
    type = 'refactor';
  } else if (lowerRequest.includes('?') || lowerRequest.startsWith('what') || lowerRequest.startsWith('how')) {
    type = 'chat';
  }
  
  // Determine requirements
  const requiresReasoning = complexity === 'high' || type === 'refactor';
  const speedPriority = type === 'edit' ? 'high' : complexity === 'low' ? 'high' : 'medium';
  const costSensitive = complexity === 'low' || type === 'chat';
  
  return {
    complexity,
    type,
    wordCount,
    requiresReasoning,
    speedPriority,
    costSensitive
  };
}

/**
 * Select optimal model based on task profile and historical data
 */
export function selectOptimalModel(
  taskProfile: TaskProfile,
  historicalPerformance?: Map<string, { avgScore: number; avgLatency: number }>
): string {
  const models = Object.values(MODEL_CONFIGS);
  
  // Score each model for this task
  const scores = models.map(model => {
    let score = 0;
    
    // Reasoning quality match (0-40 points)
    if (taskProfile.requiresReasoning) {
      if (model.capabilities.reasoningQuality === 'excellent') score += 40;
      else if (model.capabilities.reasoningQuality === 'high') score += 30;
      else if (model.capabilities.reasoningQuality === 'medium') score += 15;
    } else {
      // For non-reasoning tasks, simpler models are fine
      if (model.capabilities.reasoningQuality === 'medium') score += 30;
      if (model.capabilities.reasoningQuality === 'high') score += 35;
      if (model.capabilities.reasoningQuality === 'excellent') score += 25; // Overkill
    }
    
    // Speed match (0-30 points)
    if (taskProfile.speedPriority === 'high') {
      if (model.performance.avgLatency < 1000) score += 30;
      else if (model.performance.avgLatency < 2000) score += 20;
      else score += 10;
    } else {
      score += 20; // Speed less important
    }
    
    // Cost efficiency (0-20 points)
    if (taskProfile.costSensitive) {
      if (model.performance.avgCost < 0.05) score += 20;
      else if (model.performance.avgCost < 0.10) score += 15;
      else score += 5;
    } else {
      score += 10; // Cost less important
    }
    
    // Success rate (0-10 points)
    score += model.performance.successRate * 10;
    
    // Historical performance bonus (0-20 points)
    if (historicalPerformance?.has(model.name)) {
      const hist = historicalPerformance.get(model.name)!;
      score += (hist.avgScore / 100) * 20;
    }
    
    // Task type matching
    const isGoodMatch = model.bestFor.includes(taskProfile.type) || 
                       model.bestFor.includes(`${taskProfile.complexity}-${taskProfile.type}`);
    if (isGoodMatch) score += 15;
    
    return { model: model.name, score };
  });
  
  // Sort by score and return best
  scores.sort((a, b) => b.score - a.score);
  
  console.log('📊 Model selection scores:', scores);
  
  return scores[0].model;
}

/**
 * Get fallback models in priority order
 */
export function getFallbackModels(primaryModel: string): string[] {
  // Always have Gemini Flash as fallback
  const fallbacks = ['google/gemini-2.5-flash'];
  
  // Add Pro as second fallback if not primary
  if (primaryModel !== 'google/gemini-2.5-pro') {
    fallbacks.push('google/gemini-2.5-pro');
  }
  
  // Add Lite as last resort
  if (primaryModel !== 'google/gemini-2.5-flash-lite') {
    fallbacks.push('google/gemini-2.5-flash-lite');
  }
  
  return fallbacks.filter(m => m !== primaryModel);
}
