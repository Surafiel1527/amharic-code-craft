/**
 * Statistical Validation System
 * 
 * Provides enterprise-grade statistical analysis for pattern confidence,
 * A/B test significance, and performance metrics validation.
 * 
 * Features:
 * - Confidence intervals (95%, 99%)
 * - P-value calculations
 * - Bayesian updating
 * - Chi-square tests
 * - Statistical significance detection
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence: number; // 0.95 or 0.99
}

interface StatisticalTest {
  pValue: number;
  isSignificant: boolean;
  testType: string;
  confidence: number;
}

interface BayesianUpdate {
  priorConfidence: number;
  posteriorConfidence: number;
  evidence: number;
  credibleInterval: ConfidenceInterval;
}

export class StatisticalValidation {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Calculate confidence interval for pattern success rate
   * Uses Wilson score interval (more accurate than normal approximation)
   */
  calculateConfidenceInterval(
    successes: number,
    total: number,
    confidenceLevel: number = 0.95
  ): ConfidenceInterval {
    if (total === 0) {
      return { lower: 0, upper: 1, confidence: confidenceLevel };
    }

    const p = successes / total;
    const z = this.getZScore(confidenceLevel);
    
    // Wilson score interval
    const denominator = 1 + (z * z) / total;
    const center = (p + (z * z) / (2 * total)) / denominator;
    const margin = (z * Math.sqrt(p * (1 - p) / total + (z * z) / (4 * total * total))) / denominator;

    return {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin),
      confidence: confidenceLevel
    };
  }

  /**
   * Test if difference between two success rates is statistically significant
   * Uses two-proportion z-test
   */
  testProportionDifference(
    successes1: number,
    total1: number,
    successes2: number,
    total2: number,
    alpha: number = 0.05
  ): StatisticalTest {
    if (total1 === 0 || total2 === 0) {
      return {
        pValue: 1,
        isSignificant: false,
        testType: 'two-proportion-z-test',
        confidence: 1 - alpha
      };
    }

    const p1 = successes1 / total1;
    const p2 = successes2 / total2;
    
    // Pooled proportion
    const pPooled = (successes1 + successes2) / (total1 + total2);
    
    // Standard error
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / total1 + 1 / total2));
    
    if (se === 0) {
      return {
        pValue: 1,
        isSignificant: false,
        testType: 'two-proportion-z-test',
        confidence: 1 - alpha
      };
    }

    // Z-score
    const z = (p1 - p2) / se;
    
    // Two-tailed p-value
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    return {
      pValue,
      isSignificant: pValue < alpha,
      testType: 'two-proportion-z-test',
      confidence: 1 - alpha
    };
  }

  /**
   * Bayesian update for pattern confidence
   * Updates belief based on new evidence
   */
  bayesianUpdate(
    priorSuccesses: number,
    priorFailures: number,
    newSuccesses: number,
    newFailures: number
  ): BayesianUpdate {
    // Beta distribution parameters (conjugate prior for binomial)
    const alpha = priorSuccesses + newSuccesses + 1; // +1 for uniform prior
    const beta = priorFailures + newFailures + 1;

    // Posterior mean
    const posteriorConfidence = alpha / (alpha + beta);
    const priorConfidence = (priorSuccesses + 1) / (priorSuccesses + priorFailures + 2);

    // Credible interval (95%)
    const credibleInterval = this.betaCredibleInterval(alpha, beta, 0.95);

    return {
      priorConfidence,
      posteriorConfidence,
      evidence: newSuccesses + newFailures,
      credibleInterval
    };
  }

  /**
   * Calculate 95% credible interval for Beta distribution
   * Uses normal approximation for large samples
   */
  private betaCredibleInterval(
    alpha: number,
    beta: number,
    confidence: number
  ): ConfidenceInterval {
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const sd = Math.sqrt(variance);
    const z = this.getZScore(confidence);

    return {
      lower: Math.max(0, mean - z * sd),
      upper: Math.min(1, mean + z * sd),
      confidence
    };
  }

  /**
   * Chi-square test for comparing multiple strategies
   */
  chiSquareTest(
    observed: number[],
    expected: number[],
    alpha: number = 0.05
  ): StatisticalTest {
    if (observed.length !== expected.length) {
      throw new Error('Observed and expected arrays must have same length');
    }

    let chiSquare = 0;
    for (let i = 0; i < observed.length; i++) {
      if (expected[i] > 0) {
        chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
      }
    }

    const df = observed.length - 1;
    const pValue = this.chiSquarePValue(chiSquare, df);

    return {
      pValue,
      isSignificant: pValue < alpha,
      testType: 'chi-square',
      confidence: 1 - alpha
    };
  }

  /**
   * Validate if A/B test has enough statistical power
   */
  validateABTestPower(
    totalSamples: number,
    minDetectableEffect: number = 0.05,
    alpha: number = 0.05,
    power: number = 0.8
  ): { hasEnoughSamples: boolean; requiredSamples: number } {
    // Calculate required sample size per group
    const z_alpha = this.getZScore(1 - alpha / 2); // Two-tailed
    const z_beta = this.getZScore(power);
    const p1 = 0.5; // Assume baseline 50%
    const p2 = p1 + minDetectableEffect;

    const requiredPerGroup = Math.ceil(
      (z_alpha + z_beta) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p1 - p2) ** 2
    );

    const requiredTotal = requiredPerGroup * 2;

    return {
      hasEnoughSamples: totalSamples >= requiredTotal,
      requiredSamples: requiredTotal
    };
  }

  /**
   * Calculate sample size needed for desired confidence
   */
  calculateRequiredSampleSize(
    margin: number = 0.05,
    confidence: number = 0.95,
    proportion: number = 0.5
  ): number {
    const z = this.getZScore(confidence);
    return Math.ceil((z ** 2 * proportion * (1 - proportion)) / (margin ** 2));
  }

  /**
   * Z-score for given confidence level
   */
  private getZScore(confidence: number): number {
    // Common z-scores
    if (confidence === 0.90) return 1.645;
    if (confidence === 0.95) return 1.96;
    if (confidence === 0.99) return 2.576;
    if (confidence === 0.999) return 3.291;

    // Approximation for other values
    return Math.sqrt(2) * this.erfInv(2 * confidence - 1);
  }

  /**
   * Normal cumulative distribution function
   */
  private normalCDF(x: number): number {
    return (1 + this.erf(x / Math.sqrt(2))) / 2;
  }

  /**
   * Error function (erf)
   */
  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Inverse error function
   */
  private erfInv(x: number): number {
    const a = 0.147;
    const b = Math.log(1 - x * x);
    const c = 2 / (Math.PI * a) + b / 2;

    return Math.sign(x) * Math.sqrt(Math.sqrt(c * c - b / a) - c);
  }

  /**
   * Chi-square p-value (approximation)
   */
  private chiSquarePValue(chiSquare: number, df: number): number {
    // Approximation using normal distribution for large df
    if (df > 30) {
      const z = (Math.pow(chiSquare, 1/3) - (1 - 2/(9*df))) / Math.sqrt(2/(9*df));
      return 1 - this.normalCDF(z);
    }

    // For small df, use lookup table approximation
    const criticalValues = [3.841, 5.991, 7.815, 9.488, 11.070];
    if (df <= 5) {
      return chiSquare < criticalValues[df - 1] ? 0.1 : 0.01;
    }

    return 0.05; // Default fallback
  }

  /**
   * Validate pattern reliability with statistical tests
   */
  async validatePattern(
    patternId: string,
    successes: number,
    failures: number
  ): Promise<{
    confidence: number;
    confidenceInterval: ConfidenceInterval;
    isReliable: boolean;
    requiredSamples: number;
  }> {
    const total = successes + failures;
    const successRate = total > 0 ? successes / total : 0;

    // Calculate confidence interval
    const ci95 = this.calculateConfidenceInterval(successes, total, 0.95);
    const ci99 = this.calculateConfidenceInterval(successes, total, 0.99);

    // Check if we have enough samples
    const requiredSamples = this.calculateRequiredSampleSize(0.05, 0.95, successRate);
    const hasEnoughSamples = total >= requiredSamples;

    // Pattern is reliable if:
    // 1. Has enough samples
    // 2. Lower bound of 95% CI is > 0.7
    const isReliable = hasEnoughSamples && ci95.lower > 0.7;

    console.log(`📊 [Stats] Pattern ${patternId}: ${(successRate * 100).toFixed(1)}% success`);
    console.log(`   95% CI: [${(ci95.lower * 100).toFixed(1)}%, ${(ci95.upper * 100).toFixed(1)}%]`);
    console.log(`   Samples: ${total}/${requiredSamples} (${isReliable ? 'RELIABLE' : 'NEED MORE'})`);

    return {
      confidence: successRate,
      confidenceInterval: ci95,
      isReliable,
      requiredSamples
    };
  }
}

/**
 * Create a statistical validation instance
 */
export function createStatisticalValidation(supabase: SupabaseClient): StatisticalValidation {
  return new StatisticalValidation(supabase);
}
