/**
 * Schema Auto-Fixer
 * 
 * Automatically fixes safe schema issues like:
 * - Adding nullable JSONB columns (safe default: {})
 * - Adding nullable TEXT columns (safe default: null)
 * - Adding nullable TIMESTAMP columns (safe default: now())
 * 
 * Will NOT auto-fix:
 * - Non-nullable columns (requires explicit defaults)
 * - Primary keys or unique constraints
 * - Columns that could break existing queries
 */

interface AutoFixDecision {
  canAutoFix: boolean;
  reason: string;
  suggestedType?: string;
  suggestedDefault?: string;
}

/**
 * Determine if a missing column can be safely auto-fixed
 */
function canAutoFixColumn(
  columnName: string,
  sampleValue: any
): AutoFixDecision {
  // Never auto-fix these critical columns
  const criticalColumns = ['id', 'user_id', 'created_at'];
  if (criticalColumns.includes(columnName)) {
    return {
      canAutoFix: false,
      reason: `Critical column ${columnName} requires manual review`
    };
  }

  // Determine type from sample value
  const valueType = typeof sampleValue;
  let suggestedType = 'jsonb';
  let suggestedDefault = "'{}'::jsonb";

  if (valueType === 'string') {
    suggestedType = 'text';
    suggestedDefault = 'null';
  } else if (valueType === 'number') {
    suggestedType = 'integer';
    suggestedDefault = 'null';
  } else if (valueType === 'boolean') {
    suggestedType = 'boolean';
    suggestedDefault = 'false';
  } else if (sampleValue instanceof Date || 
             (typeof sampleValue === 'string' && !isNaN(Date.parse(sampleValue)))) {
    suggestedType = 'timestamp with time zone';
    suggestedDefault = 'now()';
  } else if (typeof sampleValue === 'object') {
    suggestedType = 'jsonb';
    suggestedDefault = "'{}'::jsonb";
  }

  return {
    canAutoFix: true,
    reason: 'Safe nullable column',
    suggestedType,
    suggestedDefault
  };
}

/**
 * Attempt to auto-fix a missing column
 */
export async function autoFixMissingColumn(
  supabase: any,
  tableName: string,
  columnName: string,
  sampleValue: any
): Promise<boolean> {
  try {
    console.log(`🔧 Evaluating auto-fix for ${tableName}.${columnName}`);

    const decision = canAutoFixColumn(columnName, sampleValue);

    if (!decision.canAutoFix) {
      console.warn(`⚠️ Cannot auto-fix: ${decision.reason}`);
      return false;
    }

    console.log(`✅ Would auto-fix ${tableName}.${columnName} as ${decision.suggestedType}`);

    // Log that auto-fix is needed (but can't be executed from edge functions)
    console.warn(`⚠️ Auto-fix requires migration: ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${decision.suggestedType} DEFAULT ${decision.suggestedDefault};`);
    
    // Log the auto-fix suggestion
    await logAutoFixAttempt(supabase, {
      tableName,
      columnName,
      success: false,
      suggestedType: decision.suggestedType,
      error: 'Auto-fix requires manual migration (edge functions cannot ALTER tables)'
    });

    // Return false since we can't actually execute ALTER TABLE from edge functions
    return false;
  } catch (error) {
    console.error(`❌ Auto-fix exception for ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Log auto-fix attempts for monitoring
 */
async function logAutoFixAttempt(
  supabase: any,
  details: {
    tableName: string;
    columnName: string;
    success: boolean;
    suggestedType?: string;
    appliedDefault?: string;
    error?: string;
  }
): Promise<void> {
  try {
    await supabase.from('build_events').insert({
      event_type: 'schema_auto_fix',
      status: details.success ? 'success' : 'failed',
      title: `Auto-fix ${details.tableName}.${details.columnName}`,
      details: {
        tableName: details.tableName,
        columnName: details.columnName,
        suggestedType: details.suggestedType,
        appliedDefault: details.appliedDefault,
        error: details.error,
        timestamp: new Date().toISOString()
      },
      user_id: '00000000-0000-0000-0000-000000000000' // System user
    });
  } catch (error) {
    // Don't let logging errors break the flow
    console.error('⚠️ Failed to log auto-fix attempt:', error);
  }
}

/**
 * Batch auto-fix multiple missing columns
 */
export async function batchAutoFix(
  supabase: any,
  tableName: string,
  missingColumns: Array<{ name: string; sampleValue: any }>
): Promise<{ fixed: string[]; failed: string[] }> {
  const fixed: string[] = [];
  const failed: string[] = [];

  for (const col of missingColumns) {
    const success = await autoFixMissingColumn(
      supabase,
      tableName,
      col.name,
      col.sampleValue
    );

    if (success) {
      fixed.push(col.name);
    } else {
      failed.push(col.name);
    }
  }

  console.log(`🔧 Batch auto-fix results: ${fixed.length} fixed, ${failed.length} failed`);
  return { fixed, failed };
}
