/**
 * Ensemble Learning System
 * 
 * Combines multiple fix strategies using voting, confidence-weighted
 * selection, and consensus mechanisms for maximum reliability.
 * 
 * Enterprise-grade features:
 * - Multi-strategy voting (best-of-3, best-of-5)
 * - Confidence-weighted selection
 * - Bayesian consensus building
 * - Automatic strategy performance tracking
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface FixStrategy {
  name: string;
  fix: any;
  confidence: number;
  executionTime?: number;
  source: 'deterministic' | 'ai' | 'pattern' | 'experiment';
}

interface EnsembleResult {
  selectedFix: any;
  strategy: string;
  confidence: number;
  votingMethod: 'weighted' | 'majority' | 'unanimous' | 'best-confidence';
  strategies: FixStrategy[];
  reasoning: string;
}

interface EnsembleConfig {
  minStrategies: number;
  confidenceThreshold: number;
  useWeightedVoting: boolean;
  requireConsensus: boolean;
}

export class EnsembleLearning {
  private supabase: SupabaseClient;
  private config: EnsembleConfig;

  constructor(
    supabase: SupabaseClient,
    config: Partial<EnsembleConfig> = {}
  ) {
    this.supabase = supabase;
    this.config = {
      minStrategies: 2,
      confidenceThreshold: 0.7,
      useWeightedVoting: true,
      requireConsensus: false,
      ...config
    };
  }

  /**
   * Combine multiple fix strategies and select the best one
   */
  async combineFixes(
    strategies: FixStrategy[],
    errorContext: any
  ): Promise<EnsembleResult> {
    console.log(`🎯 [Ensemble] Combining ${strategies.length} fix strategies`);

    // Validate we have enough strategies
    if (strategies.length < this.config.minStrategies) {
      console.warn(`⚠️ [Ensemble] Only ${strategies.length} strategies available, need ${this.config.minStrategies}`);
      // Return best single strategy
      return this.selectBestStrategy(strategies);
    }

    // Sort strategies by confidence
    const sortedStrategies = strategies.sort((a, b) => b.confidence - a.confidence);

    // Try different voting methods based on strategy count and confidence
    if (this.config.requireConsensus && strategies.length >= 3) {
      return this.unanimousVoting(sortedStrategies, errorContext);
    }

    if (this.config.useWeightedVoting) {
      return this.weightedVoting(sortedStrategies, errorContext);
    }

    return this.majorityVoting(sortedStrategies, errorContext);
  }

  /**
   * Weighted voting: Strategies with higher confidence have more influence
   */
  private async weightedVoting(
    strategies: FixStrategy[],
    errorContext: any
  ): Promise<EnsembleResult> {
    console.log('📊 [Ensemble] Using weighted voting');

    // Group identical fixes
    const fixGroups = new Map<string, FixStrategy[]>();
    
    for (const strategy of strategies) {
      const fixKey = JSON.stringify(strategy.fix);
      if (!fixGroups.has(fixKey)) {
        fixGroups.set(fixKey, []);
      }
      fixGroups.get(fixKey)!.push(strategy);
    }

    // Calculate weighted scores for each fix
    let bestFix: any = null;
    let bestScore = -1;
    let bestStrategies: FixStrategy[] = [];

    for (const [fixKey, group] of fixGroups.entries()) {
      // Weighted score = sum of (confidence * source_weight)
      const score = group.reduce((sum, s) => {
        const sourceWeight = this.getSourceWeight(s.source);
        return sum + (s.confidence * sourceWeight);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestFix = group[0].fix;
        bestStrategies = group;
      }
    }

    const avgConfidence = bestStrategies.reduce((sum, s) => sum + s.confidence, 0) / bestStrategies.length;

    return {
      selectedFix: bestFix,
      strategy: bestStrategies[0].name,
      confidence: Math.min(1, avgConfidence * 1.2), // Boost confidence for consensus
      votingMethod: 'weighted',
      strategies: bestStrategies,
      reasoning: `Selected based on weighted voting (score: ${bestScore.toFixed(2)}) from ${bestStrategies.length} strategies`
    };
  }

  /**
   * Majority voting: Most common fix wins
   */
  private async majorityVoting(
    strategies: FixStrategy[],
    errorContext: any
  ): Promise<EnsembleResult> {
    console.log('🗳️ [Ensemble] Using majority voting');

    // Count occurrences of each fix
    const fixCounts = new Map<string, { count: number; strategies: FixStrategy[] }>();
    
    for (const strategy of strategies) {
      const fixKey = JSON.stringify(strategy.fix);
      if (!fixCounts.has(fixKey)) {
        fixCounts.set(fixKey, { count: 0, strategies: [] });
      }
      const entry = fixCounts.get(fixKey)!;
      entry.count++;
      entry.strategies.push(strategy);
    }

    // Find majority winner
    let winner: { count: number; strategies: FixStrategy[] } | null = null;
    let maxCount = 0;

    for (const entry of fixCounts.values()) {
      if (entry.count > maxCount) {
        maxCount = entry.count;
        winner = entry;
      }
    }

    if (!winner) {
      return this.selectBestStrategy(strategies);
    }

    const avgConfidence = winner.strategies.reduce((sum, s) => sum + s.confidence, 0) / winner.strategies.length;

    return {
      selectedFix: winner.strategies[0].fix,
      strategy: winner.strategies[0].name,
      confidence: Math.min(1, avgConfidence * (1 + maxCount * 0.1)), // Boost for agreement
      votingMethod: 'majority',
      strategies: winner.strategies,
      reasoning: `Selected by majority vote: ${maxCount}/${strategies.length} strategies agreed`
    };
  }

  /**
   * Unanimous voting: Require all strategies to agree
   */
  private async unanimousVoting(
    strategies: FixStrategy[],
    errorContext: any
  ): Promise<EnsembleResult> {
    console.log('✅ [Ensemble] Checking for unanimous consensus');

    // Check if all strategies produce the same fix
    const firstFix = JSON.stringify(strategies[0].fix);
    const unanimous = strategies.every(s => JSON.stringify(s.fix) === firstFix);

    if (unanimous) {
      const avgConfidence = strategies.reduce((sum, s) => sum + s.confidence, 0) / strategies.length;
      
      return {
        selectedFix: strategies[0].fix,
        strategy: 'unanimous-consensus',
        confidence: Math.min(1, avgConfidence * 1.5), // High boost for unanimous
        votingMethod: 'unanimous',
        strategies,
        reasoning: `All ${strategies.length} strategies reached unanimous consensus`
      };
    }

    // No consensus, fall back to weighted voting
    console.log('⚠️ [Ensemble] No unanimous consensus, falling back to weighted voting');
    return this.weightedVoting(strategies, errorContext);
  }

  /**
   * Select best single strategy (fallback)
   */
  private selectBestStrategy(strategies: FixStrategy[]): EnsembleResult {
    const best = strategies.reduce((prev, curr) => 
      curr.confidence > prev.confidence ? curr : prev
    );

    return {
      selectedFix: best.fix,
      strategy: best.name,
      confidence: best.confidence,
      votingMethod: 'best-confidence',
      strategies: [best],
      reasoning: `Selected highest confidence strategy (${(best.confidence * 100).toFixed(1)}%)`
    };
  }

  /**
   * Get weight multiplier based on strategy source
   */
  private getSourceWeight(source: string): number {
    switch (source) {
      case 'deterministic': return 1.5; // Highest trust
      case 'pattern': return 1.2;
      case 'experiment': return 1.1;
      case 'ai': return 1.0;
      default: return 1.0;
    }
  }

  /**
   * Record ensemble decision for learning
   */
  async recordEnsembleDecision(
    result: EnsembleResult,
    errorId: string,
    success: boolean
  ): Promise<void> {
    try {
      await this.supabase
        .from('ensemble_decisions')
        .insert({
          error_id: errorId,
          voting_method: result.votingMethod,
          selected_strategy: result.strategy,
          confidence: result.confidence,
          strategies_count: result.strategies.length,
          success,
          reasoning: result.reasoning,
          strategies_data: result.strategies
        });

      console.log(`📝 [Ensemble] Recorded decision: ${result.votingMethod} - ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error('Error recording ensemble decision:', error);
    }
  }

  /**
   * Get ensemble statistics
   */
  async getEnsembleStats(): Promise<any> {
    const { data, error } = await this.supabase
      .from('ensemble_decisions')
      .select('voting_method, success, confidence')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      return null;
    }

    const stats = {
      totalDecisions: data.length,
      byMethod: {} as Record<string, { count: number; successRate: number }>,
      avgConfidence: 0
    };

    // Group by voting method
    for (const decision of data) {
      if (!stats.byMethod[decision.voting_method]) {
        stats.byMethod[decision.voting_method] = { count: 0, successRate: 0 };
      }
      stats.byMethod[decision.voting_method].count++;
      if (decision.success) {
        stats.byMethod[decision.voting_method].successRate++;
      }
    }

    // Calculate success rates
    for (const method in stats.byMethod) {
      const methodStats = stats.byMethod[method];
      methodStats.successRate = (methodStats.successRate / methodStats.count) * 100;
    }

    stats.avgConfidence = data.reduce((sum, d) => sum + d.confidence, 0) / data.length;

    return stats;
  }
}

/**
 * Create an ensemble learning instance
 */
export function createEnsembleLearning(
  supabase: SupabaseClient,
  config?: Partial<EnsembleConfig>
): EnsembleLearning {
  return new EnsembleLearning(supabase, config);
}
