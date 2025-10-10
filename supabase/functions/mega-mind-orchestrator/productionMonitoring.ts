/**
 * Production Monitoring - Logs failures and triggers auto-test generation
 */

export interface FailureLog {
  errorType: string;
  errorMessage: string;
  userRequest: string;
  context: any;
  stackTrace?: string;
  framework: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ai_timeout' | 'validation_error' | 'dependency_error' | 'syntax_error' | 'rate_limit' | 'unknown';
}

/**
 * Logs a generation failure to the database for monitoring and auto-test generation
 */
export async function logGenerationFailure(
  supabase: any,
  failure: FailureLog
): Promise<void> {
  try {
    console.log('📊 Logging generation failure:', failure.errorType);
    
    // Check if this error type already exists
    const { data: existingFailure } = await supabase
      .from('generation_failures')
      .select('id, occurrence_count')
      .eq('error_type', failure.errorType)
      .eq('user_request', failure.userRequest)
      .maybeSingle();

    if (existingFailure) {
      // Update existing failure
      await supabase
        .from('generation_failures')
        .update({
          occurrence_count: existingFailure.occurrence_count + 1,
          last_occurred_at: new Date().toISOString()
        })
        .eq('id', existingFailure.id);
      
      console.log(`📈 Updated failure count to ${existingFailure.occurrence_count + 1}`);
    } else {
      // Insert new failure
      const { error } = await supabase
        .from('generation_failures')
        .insert({
          error_type: failure.errorType,
          error_message: failure.errorMessage,
          user_request: failure.userRequest,
          request_context: failure.context,
          stack_trace: failure.stackTrace,
          framework: failure.framework,
          user_id: failure.userId,
          severity: failure.severity,
          failure_category: failure.category
        });

      if (error) {
        console.error('❌ Failed to log failure:', error);
      } else {
        console.log('✅ Failure logged successfully');
      }
    }
  } catch (error) {
    // Don't let monitoring errors break generation
    console.error('⚠️ Production monitoring error:', error);
  }
}

/**
 * Logs a successful generation to the database for monitoring
 */
export async function logGenerationSuccess(
  supabase: any,
  details: {
    projectId: string;
    userRequest: string;
    framework: string;
    fileCount?: number;
    duration?: number;
    phases?: any[];
    userId?: string;
  }
): Promise<void> {
  try {
    console.log('📊 Logging generation success:', details.projectId);
    
    const { error } = await supabase
      .from('generation_analytics')
      .insert({
        project_id: details.projectId,
        user_id: details.userId,
        user_request: details.userRequest,
        success: true,
        framework: details.framework,
        metadata: {
          fileCount: details.fileCount,
          duration: details.duration,
          phases: details.phases,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('❌ Failed to log generation success:', error);
    } else {
      console.log('✅ Generation success logged successfully');
    }
  } catch (error) {
    // Don't let monitoring errors break generation
    console.error('⚠️ Production monitoring error:', error);
  }
}

/**
 * Checks overall system health metrics
 */
export async function checkHealthMetrics(supabase: any): Promise<{
  failureRate: number;
  totalAttempts: number;
  failures: number;
  successes: number;
} | null> {
  try {
    console.log('🏥 Checking system health metrics...');
    
    // Get failure rate for last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentFailures, error: failError } = await supabase
      .from('generation_failures')
      .select('id')
      .gte('created_at', oneHourAgo);

    const { data: recentSuccesses, error: successError } = await supabase
      .from('generation_analytics')
      .select('id')
      .eq('success', true)
      .gte('created_at', oneHourAgo);

    if (failError || successError) {
      console.error('❌ Failed to check health metrics');
      return null;
    }

    const totalAttempts = (recentFailures?.length || 0) + (recentSuccesses?.length || 0);
    const failureRate = totalAttempts > 0 
      ? ((recentFailures?.length || 0) / totalAttempts) * 100 
      : 0;

    console.log(`📈 Health metrics - Failure rate: ${failureRate.toFixed(2)}% (${recentFailures?.length}/${totalAttempts})`);

    // Alert if failure rate is high
    if (failureRate > 50 && totalAttempts >= 5) {
      console.warn(`⚠️ HIGH FAILURE RATE DETECTED: ${failureRate.toFixed(2)}%`);
    }

    return {
      failureRate,
      totalAttempts,
      failures: recentFailures?.length || 0,
      successes: recentSuccesses?.length || 0
    };
  } catch (error) {
    console.error('❌ Exception checking health metrics:', error);
    return null;
  }
}

/**
 * Classifies error type for categorization
 */
export function classifyError(error: any): { 
  category: FailureLog['category']; 
  severity: FailureLog['severity'] 
} {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorString = String(error).toLowerCase();
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return { category: 'ai_timeout', severity: 'high' };
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return { category: 'rate_limit', severity: 'medium' };
  }
  
  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid') || 
      errorMessage.includes('dependency') || errorString.includes('depends on missing')) {
    return { category: 'validation_error', severity: 'high' };
  }
  
  // Syntax errors
  if (errorMessage.includes('syntax') || errorMessage.includes('parse')) {
    return { category: 'syntax_error', severity: 'medium' };
  }
  
  return { category: 'unknown', severity: 'medium' };
}

/**
 * Extracts stack trace from error
 */
export function extractStackTrace(error: any): string | undefined {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return undefined;
}
