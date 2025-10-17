/**
 * INTELLIGENT DECISION ENGINE
 * 
 * Autonomous decision-making system that:
 * 1. Evaluates multiple approaches/solutions
 * 2. Scores options based on context and preferences
 * 3. Makes confident recommendations
 * 4. Learns from user selections to improve future decisions
 * 
 * This solves the "Decision-Making" limitation.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface DecisionOption {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface DecisionContext {
  scenario: string;
  userGoal: string;
  constraints?: {
    time?: 'urgent' | 'normal' | 'flexible';
    budget?: 'low' | 'medium' | 'high';
    complexity?: 'simple' | 'moderate' | 'complex';
  };
  userPreferences?: {
    preferredApproach?: 'conservative' | 'balanced' | 'innovative';
    riskTolerance?: 'low' | 'medium' | 'high';
    speedVsQuality?: 'speed' | 'balanced' | 'quality';
  };
  historicalChoices?: Array<{
    scenario: string;
    chosenOption: string;
    success: boolean;
  }>;
}

export interface ScoredOption extends DecisionOption {
  overallScore: number;
  confidence: number;
  reasoning: string;
  recommendationLevel: 'highly_recommended' | 'recommended' | 'viable' | 'not_recommended';
}

export interface DecisionResult {
  bestOption: ScoredOption;
  allOptions: ScoredOption[];
  confidence: number;
  reasoning: string;
  requiresUserInput: boolean;
  userInputReason?: string;
}

export class IntelligentDecisionEngine {
  private learningEnabled = true;
  
  constructor(
    private supabase: SupabaseClient,
    private lovableApiKey: string
  ) {}

  /**
   * Main decision-making method
   */
  async makeDecision(
    options: DecisionOption[],
    context: DecisionContext
  ): Promise<DecisionResult> {
    console.log(`[DecisionEngine] 🤔 Evaluating ${options.length} options for: ${context.scenario}`);

    // PHASE 1: Load historical decision patterns
    const historicalWeights = await this.loadHistoricalWeights(context);

    // PHASE 2: Score each option
    const scoredOptions: ScoredOption[] = await Promise.all(
      options.map(option => this.scoreOption(option, context, historicalWeights))
    );

    // PHASE 3: Rank options
    const rankedOptions = scoredOptions.sort((a, b) => b.overallScore - a.overallScore);
    const bestOption = rankedOptions[0];

    // PHASE 4: Determine if we're confident enough to recommend
    const overallConfidence = this.calculateOverallConfidence(rankedOptions);
    const requiresUserInput = overallConfidence < 0.75 || 
                             (rankedOptions[0].overallScore - rankedOptions[1].overallScore) < 0.1;

    let userInputReason: string | undefined;
    if (requiresUserInput) {
      if (overallConfidence < 0.75) {
        userInputReason = 'Multiple viable approaches - your input would help choose the best fit';
      } else {
        userInputReason = 'Options are very close in score - your preference matters';
      }
    }

    const result: DecisionResult = {
      bestOption,
      allOptions: rankedOptions,
      confidence: overallConfidence,
      reasoning: this.buildDecisionReasoning(bestOption, rankedOptions, context),
      requiresUserInput,
      userInputReason
    };

    // PHASE 5: Log decision for future learning
    await this.logDecision(result, context);

    console.log(`[DecisionEngine] ✅ Decision complete: ${bestOption.name} (confidence: ${(overallConfidence * 100).toFixed(1)}%)`);

    return result;
  }

  /**
   * Record user's choice to improve future decisions
   */
  async recordUserChoice(
    decisionId: string,
    chosenOptionId: string,
    wasSuccessful: boolean,
    feedback?: string
  ): Promise<void> {
    await this.supabase.from('decision_logs').update({
      user_choice: chosenOptionId,
      was_correct: wasSuccessful,
      user_feedback: feedback,
      updated_at: new Date().toISOString()
    }).eq('id', decisionId);

    // Update decision patterns for learning
    if (this.learningEnabled) {
      await this.updateDecisionPatterns(decisionId, chosenOptionId, wasSuccessful);
    }
  }

  /**
   * Score individual option based on context
   */
  private async scoreOption(
    option: DecisionOption,
    context: DecisionContext,
    historicalWeights: Map<string, number>
  ): Promise<ScoredOption> {
    const scores = {
      contextFit: 0,
      historical: 0,
      risk: 0,
      effort: 0,
      outcome: 0
    };

    // Context fit score (40% weight)
    scores.contextFit = this.scoreContextFit(option, context);

    // Historical success score (30% weight)
    scores.historical = historicalWeights.get(option.id) || 0.5;

    // Risk score (15% weight) - lower risk = higher score
    scores.risk = this.scoreRisk(option.riskLevel, context.userPreferences?.riskTolerance);

    // Effort score (10% weight) - less effort = higher score
    scores.effort = this.scoreEffort(option.estimatedEffort, context.constraints?.time);

    // Use AI for outcome prediction (5% weight)
    scores.outcome = await this.predictOutcome(option, context);

    // Calculate weighted overall score
    const overallScore = 
      scores.contextFit * 0.40 +
      scores.historical * 0.30 +
      scores.risk * 0.15 +
      scores.effort * 0.10 +
      scores.outcome * 0.05;

    // Calculate confidence based on score consistency
    const scoreVariance = this.calculateVariance(Object.values(scores));
    const confidence = Math.max(0, 1 - scoreVariance);

    return {
      ...option,
      overallScore,
      confidence,
      reasoning: this.buildOptionReasoning(option, scores, context),
      recommendationLevel: this.getRecommendationLevel(overallScore, confidence)
    };
  }

  /**
   * Score how well option fits the context
   */
  private scoreContextFit(option: DecisionOption, context: DecisionContext): number {
    let score = 0.5; // Baseline

    // Match user's preferred approach
    if (context.userPreferences?.preferredApproach) {
      const approach = context.userPreferences.preferredApproach;
      
      if (approach === 'conservative' && option.riskLevel === 'low') score += 0.2;
      if (approach === 'innovative' && option.riskLevel === 'high') score += 0.2;
      if (approach === 'balanced') score += 0.1;
    }

    // Match complexity constraints
    if (context.constraints?.complexity) {
      const complexity = context.constraints.complexity;
      
      if (complexity === 'simple' && option.estimatedEffort === 'low') score += 0.15;
      if (complexity === 'complex' && option.estimatedEffort === 'high') score += 0.1;
    }

    // Match speed vs quality preference
    if (context.userPreferences?.speedVsQuality) {
      const pref = context.userPreferences.speedVsQuality;
      
      if (pref === 'speed' && option.estimatedEffort === 'low') score += 0.15;
      if (pref === 'quality' && option.pros.some(p => p.toLowerCase().includes('quality'))) score += 0.15;
    }

    return Math.min(1, score);
  }

  /**
   * Score risk level relative to tolerance
   */
  private scoreRisk(riskLevel: string, tolerance?: string): number {
    const riskScores = {
      low: { low: 1.0, medium: 0.8, high: 0.6 },
      medium: { low: 0.7, medium: 1.0, high: 0.8 },
      high: { low: 0.4, medium: 0.7, high: 1.0 }
    };

    const effectiveTolerance = tolerance || 'medium';
    return riskScores[riskLevel as keyof typeof riskScores][effectiveTolerance as keyof typeof riskScores.low];
  }

  /**
   * Score effort relative to time constraint
   */
  private scoreEffort(effort: string, timeConstraint?: string): number {
    const effortScores = {
      low: { urgent: 1.0, normal: 0.9, flexible: 0.8 },
      medium: { urgent: 0.5, normal: 1.0, flexible: 0.9 },
      high: { urgent: 0.2, normal: 0.7, flexible: 1.0 }
    };

    const effectiveTime = timeConstraint || 'normal';
    return effortScores[effort as keyof typeof effortScores][effectiveTime as keyof typeof effortScores.low];
  }

  /**
   * Predict outcome using AI
   */
  private async predictOutcome(option: DecisionOption, context: DecisionContext): Promise<number> {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Predict success probability (0.0-1.0) for this option:
            
Option: ${option.name}
Description: ${option.description}
Pros: ${option.pros.join(', ')}
Cons: ${option.cons.join(', ')}

Context:
User Goal: ${context.userGoal}
Scenario: ${context.scenario}

Return only a number between 0.0 and 1.0.`
          }],
          temperature: 0.3,
          max_tokens: 50
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const prediction = parseFloat(data.choices[0].message.content.trim());
        return isNaN(prediction) ? 0.5 : Math.max(0, Math.min(1, prediction));
      }
    } catch (error) {
      console.warn('[DecisionEngine] AI prediction failed, using default:', error);
    }

    return 0.5; // Default neutral score
  }

  /**
   * Load historical decision weights
   */
  private async loadHistoricalWeights(context: DecisionContext): Promise<Map<string, number>> {
    const weights = new Map<string, number>();

    // Load from database
    const { data: decisions } = await this.supabase
      .from('decision_logs')
      .select('*')
      .eq('scenario_type', this.categorizeScenario(context.scenario))
      .not('user_choice', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (decisions) {
      const successCounts: Record<string, { success: number; total: number }> = {};

      decisions.forEach(decision => {
        const choice = decision.user_choice;
        if (!successCounts[choice]) {
          successCounts[choice] = { success: 0, total: 0 };
        }
        
        successCounts[choice].total++;
        if (decision.was_correct) {
          successCounts[choice].success++;
        }
      });

      // Calculate success rates
      Object.entries(successCounts).forEach(([choice, counts]) => {
        weights.set(choice, counts.success / counts.total);
      });
    }

    return weights;
  }

  /**
   * Build reasoning for option score
   */
  private buildOptionReasoning(
    option: DecisionOption,
    scores: Record<string, number>,
    context: DecisionContext
  ): string {
    const reasons: string[] = [];

    if (scores.contextFit > 0.7) {
      reasons.push('Excellent fit for your requirements');
    } else if (scores.contextFit < 0.4) {
      reasons.push('May not fully align with your needs');
    }

    if (scores.historical > 0.7) {
      reasons.push('Strong track record in similar scenarios');
    }

    if (option.riskLevel === 'low') {
      reasons.push('Low risk approach');
    } else if (option.riskLevel === 'high') {
      reasons.push('Higher risk but potentially higher reward');
    }

    if (option.estimatedEffort === 'low') {
      reasons.push('Quick to implement');
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Build overall decision reasoning
   */
  private buildDecisionReasoning(
    best: ScoredOption,
    all: ScoredOption[],
    context: DecisionContext
  ): string {
    let reasoning = `${best.name} scores highest (${(best.overallScore * 100).toFixed(1)}%) because: ${best.reasoning}`;

    if (all.length > 1 && (best.overallScore - all[1].overallScore) < 0.1) {
      reasoning += ` Note: ${all[1].name} is a close alternative with similar viability.`;
    }

    return reasoning;
  }

  /**
   * Calculate overall confidence from ranked options
   */
  private calculateOverallConfidence(rankedOptions: ScoredOption[]): number {
    if (rankedOptions.length === 0) return 0;
    if (rankedOptions.length === 1) return rankedOptions[0].confidence;

    const topScore = rankedOptions[0].overallScore;
    const secondScore = rankedOptions[1].overallScore;
    const scoreSeparation = topScore - secondScore;

    // Higher confidence if clear winner
    const separationConfidence = Math.min(1, scoreSeparation * 5);
    const avgOptionConfidence = rankedOptions[0].confidence;

    return (separationConfidence * 0.6) + (avgOptionConfidence * 0.4);
  }

  /**
   * Get recommendation level based on score and confidence
   */
  private getRecommendationLevel(
    score: number,
    confidence: number
  ): 'highly_recommended' | 'recommended' | 'viable' | 'not_recommended' {
    const weighted = score * confidence;

    if (weighted > 0.8) return 'highly_recommended';
    if (weighted > 0.6) return 'recommended';
    if (weighted > 0.4) return 'viable';
    return 'not_recommended';
  }

  /**
   * Calculate variance of scores
   */
  private calculateVariance(scores: number[]): number {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  /**
   * Categorize scenario for pattern matching
   */
  private categorizeScenario(scenario: string): string {
    const lower = scenario.toLowerCase();
    
    if (lower.includes('auth')) return 'authentication';
    if (lower.includes('database') || lower.includes('data')) return 'data_management';
    if (lower.includes('ui') || lower.includes('design')) return 'user_interface';
    if (lower.includes('api')) return 'api_integration';
    if (lower.includes('performance')) return 'optimization';
    
    return 'general';
  }

  /**
   * Log decision for future analysis
   */
  private async logDecision(result: DecisionResult, context: DecisionContext): Promise<void> {
    await this.supabase.from('decision_logs').insert({
      scenario_type: this.categorizeScenario(context.scenario),
      scenario_description: context.scenario,
      user_goal: context.userGoal,
      recommended_option: result.bestOption.id,
      all_options: result.allOptions.map(o => ({ id: o.id, score: o.overallScore })),
      confidence_score: result.confidence,
      reasoning: result.reasoning,
      requires_user_input: result.requiresUserInput,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Update decision patterns based on outcome
   */
  private async updateDecisionPatterns(
    decisionId: string,
    chosenOptionId: string,
    wasSuccessful: boolean
  ): Promise<void> {
    // This will be picked up by the update_decision_confidence trigger
    await this.supabase
      .from('decision_feedback')
      .insert({
        decision_id: decisionId,
        chosen_option: chosenOptionId,
        was_correct: wasSuccessful,
        created_at: new Date().toISOString()
      });
  }
}
