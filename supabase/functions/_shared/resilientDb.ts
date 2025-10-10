/**
 * Resilient Database Wrapper
 * 
 * Wraps all database insert/update operations with:
 * - Automatic schema validation
 * - Smart field removal for missing columns
 * - Graceful degradation
 * - Auto-fix triggering for safe operations
 */

import { getTableSchema, validateColumns } from './schemaIntrospection.ts';
import { autoFixMissingColumn } from './schemaAutoFixer.ts';

interface InsertOptions {
  tableName: string;
  data: Record<string, any> | Record<string, any>[];
  autoFix?: boolean; // Whether to attempt auto-fixing missing columns
  critical?: boolean; // Whether missing columns should throw errors
}

interface InsertResult {
  success: boolean;
  data?: any;
  error?: any;
  warning?: string;
  removedFields?: string[];
  autoFixedColumns?: string[];
}

/**
 * Resilient insert that handles schema mismatches
 */
export async function resilientInsert(
  supabase: any,
  options: InsertOptions
): Promise<InsertResult> {
  const { tableName, autoFix = true, critical = false } = options;
  let { data } = options;

  try {
    // Normalize data to array
    const dataArray = Array.isArray(data) ? data : [data];
    if (dataArray.length === 0) {
      return { success: false, error: 'No data to insert' };
    }

    // Get all unique column names from the data
    const columnNames = new Set<string>();
    dataArray.forEach(row => {
      Object.keys(row).forEach(key => columnNames.add(key));
    });

    // Validate columns exist in table
    const validation = await validateColumns(
      supabase,
      tableName,
      Array.from(columnNames)
    );

    if (!validation.valid) {
      console.warn(`⚠️ Schema mismatch in ${tableName}:`);
      console.warn(`  Missing columns: ${validation.missingColumns.join(', ')}`);

      // Attempt auto-fix for nullable columns if enabled
      const autoFixedColumns: string[] = [];
      if (autoFix) {
        for (const missingCol of validation.missingColumns) {
          const fixed = await autoFixMissingColumn(
            supabase,
            tableName,
            missingCol,
            dataArray[0][missingCol] // Sample value
          );
          if (fixed) {
            autoFixedColumns.push(missingCol);
            validation.existingColumns.push(missingCol);
          }
        }
      }

      // If critical and still have missing columns, fail
      const stillMissing = validation.missingColumns.filter(
        col => !autoFixedColumns.includes(col)
      );

      if (critical && stillMissing.length > 0) {
        return {
          success: false,
          error: `Critical columns missing: ${stillMissing.join(', ')}`,
          removedFields: stillMissing,
          autoFixedColumns
        };
      }

      // Remove missing columns from data (graceful degradation)
      const cleanedData = dataArray.map(row => {
        const cleaned: Record<string, any> = {};
        validation.existingColumns.forEach(col => {
          if (row[col] !== undefined) {
            cleaned[col] = row[col];
          }
        });
        return cleaned;
      });

      // Log the schema issue for review
      await logSchemaIssue(supabase, {
        tableName,
        missingColumns: stillMissing,
        autoFixedColumns,
        context: 'insert operation',
        severity: critical ? 'high' : 'medium'
      });

      // Attempt insert with cleaned data
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(cleanedData)
        .select();

      if (error) {
        console.error(`❌ Insert failed even after cleanup:`, error);
        return {
          success: false,
          error,
          removedFields: stillMissing,
          autoFixedColumns
        };
      }

      return {
        success: true,
        data: Array.isArray(data) ? result : result[0],
        warning: `Removed missing columns: ${stillMissing.join(', ')}`,
        removedFields: stillMissing,
        autoFixedColumns
      };
    }

    // No schema issues, proceed with normal insert
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(dataArray)
      .select();

    if (error) {
      return { success: false, error };
    }

    return {
      success: true,
      data: Array.isArray(data) ? result : result[0]
    };
  } catch (error) {
    console.error(`❌ Resilient insert error in ${tableName}:`, error);
    return { success: false, error };
  }
}

/**
 * Resilient update that handles schema mismatches
 */
export async function resilientUpdate(
  supabase: any,
  tableName: string,
  updates: Record<string, any>,
  match: Record<string, any>,
  options: { autoFix?: boolean; critical?: boolean } = {}
): Promise<InsertResult> {
  const { autoFix = true, critical = false } = options;

  try {
    // Validate columns exist
    const columnNames = Object.keys(updates);
    const validation = await validateColumns(supabase, tableName, columnNames);

    if (!validation.valid) {
      console.warn(`⚠️ Schema mismatch in ${tableName} update:`);
      console.warn(`  Missing columns: ${validation.missingColumns.join(', ')}`);

      // Attempt auto-fix
      const autoFixedColumns: string[] = [];
      if (autoFix) {
        for (const missingCol of validation.missingColumns) {
          const fixed = await autoFixMissingColumn(
            supabase,
            tableName,
            missingCol,
            updates[missingCol]
          );
          if (fixed) {
            autoFixedColumns.push(missingCol);
            validation.existingColumns.push(missingCol);
          }
        }
      }

      const stillMissing = validation.missingColumns.filter(
        col => !autoFixedColumns.includes(col)
      );

      if (critical && stillMissing.length > 0) {
        return {
          success: false,
          error: `Critical columns missing: ${stillMissing.join(', ')}`,
          removedFields: stillMissing,
          autoFixedColumns
        };
      }

      // Remove missing columns
      const cleanedUpdates: Record<string, any> = {};
      validation.existingColumns.forEach(col => {
        if (updates[col] !== undefined) {
          cleanedUpdates[col] = updates[col];
        }
      });

      await logSchemaIssue(supabase, {
        tableName,
        missingColumns: stillMissing,
        autoFixedColumns,
        context: 'update operation',
        severity: critical ? 'high' : 'medium'
      });

      // Attempt update with cleaned data
      let query = supabase.from(tableName).update(cleanedUpdates);
      Object.keys(match).forEach(key => {
        query = query.eq(key, match[key]);
      });
      const { data: result, error } = await query.select();

      if (error) {
        return {
          success: false,
          error,
          removedFields: stillMissing,
          autoFixedColumns
        };
      }

      return {
        success: true,
        data: result,
        warning: `Removed missing columns: ${stillMissing.join(', ')}`,
        removedFields: stillMissing,
        autoFixedColumns
      };
    }

    // No issues, proceed normally
    let query = supabase.from(tableName).update(updates);
    Object.keys(match).forEach(key => {
      query = query.eq(key, match[key]);
    });
    const { data: result, error } = await query.select();

    if (error) {
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error(`❌ Resilient update error in ${tableName}:`, error);
    return { success: false, error };
  }
}

/**
 * Log schema issues for monitoring and review
 */
async function logSchemaIssue(
  supabase: any,
  issue: {
    tableName: string;
    missingColumns: string[];
    autoFixedColumns?: string[];
    context: string;
    severity: 'low' | 'medium' | 'high';
  }
): Promise<void> {
  try {
    await supabase.from('detected_errors').insert({
      error_type: 'schema_mismatch',
      error_message: `Missing columns in ${issue.tableName}: ${issue.missingColumns.join(', ')}`,
      severity: issue.severity,
      status: issue.autoFixedColumns?.length ? 'auto_fixed' : 'pending',
      context: {
        tableName: issue.tableName,
        missingColumns: issue.missingColumns,
        autoFixedColumns: issue.autoFixedColumns || [],
        operationContext: issue.context,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`📝 Logged schema issue for ${issue.tableName}`);
  } catch (error) {
    // Don't let logging errors break the flow
    console.error('⚠️ Failed to log schema issue:', error);
  }
}
