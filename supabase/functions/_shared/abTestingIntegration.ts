import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface FixExperiment {
  id: string;
  error_pattern_id: string;
  fix_variant_a: any;
  fix_variant_b: any;
  experiment_status: 'running' | 'completed' | 'cancelled';
  winning_variant?: 'A' | 'B';
  sample_size: number;
  variant_a_success_rate: number;
  variant_b_success_rate: number;
}

export interface ExperimentResult {
  experiment_id: string;
  variant_used: 'A' | 'B';
  error_id: string;
  success: boolean;
  execution_time_ms?: number;
  error_message?: string;
}

/**
 * Create a new A/B test experiment for two fix variants
 */
export async function createFixExperiment(
  supabase: SupabaseClient,
  errorPatternId: string,
  fixVariantA: any,
  fixVariantB: any,
  metadata: any = {}
): Promise<FixExperiment | null> {
  try {
    const { data, error } = await supabase
      .from('fix_experiments')
      .insert({
        error_pattern_id: errorPatternId,
        fix_variant_a: fixVariantA,
        fix_variant_b: fixVariantB,
        experiment_status: 'running',
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating experiment:', error);
      return null;
    }

    console.log(`✅ Created A/B test experiment: ${data.id}`);
    return data;
  } catch (error) {
    console.error('Exception creating experiment:', error);
    return null;
  }
}

/**
 * Get active experiment for an error pattern
 */
export async function getActiveExperiment(
  supabase: SupabaseClient,
  errorPatternId: string
): Promise<FixExperiment | null> {
  try {
    const { data, error } = await supabase
      .from('fix_experiments')
      .select('*')
      .eq('error_pattern_id', errorPatternId)
      .eq('experiment_status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching experiment:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching experiment:', error);
    return null;
  }
}

/**
 * Route to a variant using 50/50 random split
 */
export function routeToVariant(): 'A' | 'B' {
  return Math.random() < 0.5 ? 'A' : 'B';
}

/**
 * Get the fix to use based on A/B test or winning variant
 */
export function getFixFromExperiment(
  experiment: FixExperiment,
  variant: 'A' | 'B'
): any {
  return variant === 'A' ? experiment.fix_variant_a : experiment.fix_variant_b;
}

/**
 * Record the result of applying a fix variant
 */
export async function recordExperimentResult(
  supabase: SupabaseClient,
  experimentId: string,
  variant: 'A' | 'B',
  errorId: string,
  success: boolean,
  executionTimeMs?: number,
  errorMessage?: string
): Promise<boolean> {
  try {
    // Insert result record
    const { error: insertError } = await supabase
      .from('experiment_results')
      .insert({
        experiment_id: experimentId,
        variant_used: variant,
        error_id: errorId,
        success,
        execution_time_ms: executionTimeMs,
        error_message: errorMessage
      });

    if (insertError) {
      console.error('Error recording experiment result:', insertError);
      return false;
    }

    // Update experiment counts
    await supabase.rpc('record_experiment_result', {
      p_experiment_id: experimentId,
      p_variant: variant,
      p_success: success
    });

    console.log(`📊 Recorded experiment result: ${variant} - ${success ? 'SUCCESS' : 'FAILURE'}`);
    return true;
  } catch (error) {
    console.error('Exception recording experiment result:', error);
    return false;
  }
}

/**
 * Get the winning fix from a completed experiment
 */
export async function getWinningFix(
  supabase: SupabaseClient,
  errorPatternId: string
): Promise<{ fix: any; variant: 'A' | 'B' } | null> {
  try {
    const { data, error } = await supabase
      .from('fix_experiments')
      .select('*')
      .eq('error_pattern_id', errorPatternId)
      .eq('experiment_status', 'completed')
      .not('winning_variant', 'is', null)
      .order('concluded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !data.winning_variant) {
      return null;
    }

    const fix = data.winning_variant === 'A' 
      ? data.fix_variant_a 
      : data.fix_variant_b;

    console.log(`🏆 Using winning fix from experiment: Variant ${data.winning_variant}`);
    return { fix, variant: data.winning_variant };
  } catch (error) {
    console.error('Exception getting winning fix:', error);
    return null;
  }
}

/**
 * Check if an experiment should use A/B testing or just apply best fix
 */
export async function shouldUseABTesting(
  supabase: SupabaseClient,
  errorPatternId: string
): Promise<boolean> {
  // Check if there's already a completed experiment with a winner
  const winner = await getWinningFix(supabase, errorPatternId);
  if (winner) {
    console.log('✅ Using proven winning fix, skipping A/B test');
    return false;
  }

  // Check if there's an active experiment
  const activeExperiment = await getActiveExperiment(supabase, errorPatternId);
  if (activeExperiment) {
    console.log('🔬 Active A/B test found, continuing experiment');
    return true;
  }

  // New error pattern - could start A/B test if we have multiple fix strategies
  return false;
}