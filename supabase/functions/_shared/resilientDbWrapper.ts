import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SchemaValidator, SchemaValidationError } from './schemaValidator.ts';
import { SelfHealingLoop } from './selfHealingLoop.ts';

/**
 * Universal Database Wrapper with Self-Healing Capabilities
 * 
 * Enterprise-grade wrapper that intercepts ALL database operations,
 * validates them against the actual schema, and automatically fixes
 * mismatches before they cause errors.
 * 
 * Features:
 * - Pre-execution validation for all CRUD operations
 * - Automatic schema mismatch correction
 * - Learning from successful fixes
 * - Graceful degradation with detailed error reporting
 * - Zero-downtime error recovery
 */

interface QueryOptions {
  skipHealing?: boolean;
  maxAttempts?: number;
  logErrors?: boolean;
}

interface QueryResult<T = any> {
  data: T | null;
  error: Error | null;
  healed: boolean;
  attempts: number;
  originalOperation?: string;
}

export class ResilientDbWrapper {
  private validator: SchemaValidator;
  private healingLoop: SelfHealingLoop;
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient, lovableApiKey: string) {
    this.supabase = supabase;
    this.validator = new SchemaValidator(supabase);
    this.healingLoop = new SelfHealingLoop(supabase, lovableApiKey);
  }

  /**
   * Resilient SELECT with schema validation
   */
  async select<T = any>(
    tableName: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<T[]>> {
    const startTime = Date.now();
    
    try {
      // Validate table exists
      const validation = await this.validator.validateOperation('select', tableName);
      
      if (!validation.valid && !options.skipHealing) {
        console.warn(`[ResilientDB] Table ${tableName} validation failed:`, validation.errors);
        
        // Attempt to find similar table or suggest fix
        const suggestion = this.suggestTableFix(tableName, validation.errors);
        
        return {
          data: null,
          error: new Error(`Table ${tableName} not found. Suggestion: ${suggestion}`),
          healed: false,
          attempts: 1,
          originalOperation: `SELECT * FROM ${tableName}`
        };
      }

      // Execute query
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*');

      return {
        data: data as T[],
        error,
        healed: false,
        attempts: 1
      };
    } catch (error) {
      if (options.logErrors) {
        console.error(`[ResilientDB] SELECT error on ${tableName}:`, error);
      }
      
      return {
        data: null,
        error: error as Error,
        healed: false,
        attempts: 1
      };
    }
  }

  /**
   * Resilient INSERT with self-healing
   */
  async insert<T = any>(
    tableName: string,
    data: Record<string, any> | Record<string, any>[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const dataArray = Array.isArray(data) ? data : [data];
    const maxAttempts = options.maxAttempts || 3;
    
    for (const record of dataArray) {
      // Validate and heal each record
      const healingResult = await this.healingLoop.validateAndHeal(
        'insert',
        tableName,
        record,
        maxAttempts
      );

      if (!healingResult.success) {
        return {
          data: null,
          error: new Error(healingResult.finalError || 'Insert failed after healing attempts'),
          healed: healingResult.healed,
          attempts: healingResult.attempts.length,
          originalOperation: `INSERT INTO ${tableName}`
        };
      }

      // Use healed data if available
      const finalData = healingResult.correctedData || record;

      try {
        const { data: insertedData, error } = await this.supabase
          .from(tableName)
          .insert(finalData)
          .select()
          .single();

        if (error) {
          // If insert still fails, log for pattern learning
          await this.logFailedOperation('insert', tableName, finalData, error);
          
          return {
            data: null,
            error,
            healed: healingResult.healed,
            attempts: healingResult.attempts.length
          };
        }

        return {
          data: insertedData as T,
          error: null,
          healed: healingResult.healed,
          attempts: healingResult.attempts.length
        };
      } catch (error) {
        if (options.logErrors) {
          console.error(`[ResilientDB] INSERT error on ${tableName}:`, error);
        }
        
        return {
          data: null,
          error: error as Error,
          healed: healingResult.healed,
          attempts: healingResult.attempts.length
        };
      }
    }

    // Should never reach here, but TypeScript needs it
    return {
      data: null,
      error: new Error('Unexpected end of insert operation'),
      healed: false,
      attempts: 0
    };
  }

  /**
   * Resilient UPDATE with self-healing
   */
  async update<T = any>(
    tableName: string,
    data: Record<string, any>,
    matchConditions: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const maxAttempts = options.maxAttempts || 3;

    // Validate and heal the update data
    const healingResult = await this.healingLoop.validateAndHeal(
      'update',
      tableName,
      data,
      maxAttempts
    );

    if (!healingResult.success) {
      return {
        data: null,
        error: new Error(healingResult.finalError || 'Update failed after healing attempts'),
        healed: healingResult.healed,
        attempts: healingResult.attempts.length,
        originalOperation: `UPDATE ${tableName}`
      };
    }

    const finalData = healingResult.correctedData || data;

    try {
      // Build the update query with match conditions
      let query = this.supabase.from(tableName).update(finalData);
      
      // Apply match conditions
      for (const [key, value] of Object.entries(matchConditions)) {
        query = query.eq(key, value);
      }

      const { data: updatedData, error } = await query.select().single();

      if (error) {
        await this.logFailedOperation('update', tableName, finalData, error);
        
        return {
          data: null,
          error,
          healed: healingResult.healed,
          attempts: healingResult.attempts.length
        };
      }

      return {
        data: updatedData as T,
        error: null,
        healed: healingResult.healed,
        attempts: healingResult.attempts.length
      };
    } catch (error) {
      if (options.logErrors) {
        console.error(`[ResilientDB] UPDATE error on ${tableName}:`, error);
      }
      
      return {
        data: null,
        error: error as Error,
        healed: healingResult.healed,
        attempts: healingResult.attempts.length
      };
    }
  }

  /**
   * Resilient UPSERT with self-healing
   */
  async upsert<T = any>(
    tableName: string,
    data: Record<string, any> | Record<string, any>[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const dataArray = Array.isArray(data) ? data : [data];
    const maxAttempts = options.maxAttempts || 3;
    
    const healedRecords: Record<string, any>[] = [];

    for (const record of dataArray) {
      // Validate and heal each record
      const healingResult = await this.healingLoop.validateAndHeal(
        'upsert',
        tableName,
        record,
        maxAttempts
      );

      if (!healingResult.success) {
        return {
          data: null,
          error: new Error(healingResult.finalError || 'Upsert failed after healing attempts'),
          healed: healingResult.healed,
          attempts: healingResult.attempts.length,
          originalOperation: `UPSERT INTO ${tableName}`
        };
      }

      healedRecords.push(healingResult.correctedData || record);
    }

    try {
      const { data: upsertedData, error } = await this.supabase
        .from(tableName)
        .upsert(healedRecords)
        .select();

      if (error) {
        await this.logFailedOperation('upsert', tableName, healedRecords, error);
        
        return {
          data: null,
          error,
          healed: true,
          attempts: maxAttempts
        };
      }

      return {
        data: upsertedData as T,
        error: null,
        healed: true,
        attempts: 1
      };
    } catch (error) {
      if (options.logErrors) {
        console.error(`[ResilientDB] UPSERT error on ${tableName}:`, error);
      }
      
      return {
        data: null,
        error: error as Error,
        healed: false,
        attempts: maxAttempts
      };
    }
  }

  /**
   * Resilient DELETE with validation
   */
  async delete(
    tableName: string,
    matchConditions: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<QueryResult<void>> {
    try {
      // Validate table exists
      const validation = await this.validator.validateOperation('select', tableName);
      
      if (!validation.valid) {
        return {
          data: null,
          error: new Error(`Cannot delete from non-existent table: ${tableName}`),
          healed: false,
          attempts: 1,
          originalOperation: `DELETE FROM ${tableName}`
        };
      }

      // Build delete query with match conditions
      let query = this.supabase.from(tableName).delete();
      
      for (const [key, value] of Object.entries(matchConditions)) {
        query = query.eq(key, value);
      }

      const { error } = await query;

      return {
        data: null,
        error,
        healed: false,
        attempts: 1
      };
    } catch (error) {
      if (options.logErrors) {
        console.error(`[ResilientDB] DELETE error on ${tableName}:`, error);
      }
      
      return {
        data: null,
        error: error as Error,
        healed: false,
        attempts: 1
      };
    }
  }

  /**
   * Suggest fix for table name mismatches
   */
  private suggestTableFix(tableName: string, errors: SchemaValidationError[]): string {
    // Common table name patterns
    const commonTables = [
      'projects', 'conversations', 'project_files', 'users', 'profiles',
      'ai_generation_jobs', 'architecture_plans', 'messages'
    ];

    // Find closest match using Levenshtein-like distance
    let closestMatch = '';
    let minDistance = Infinity;

    for (const validTable of commonTables) {
      const distance = this.levenshteinDistance(tableName.toLowerCase(), validTable.toLowerCase());
      if (distance < minDistance) {
        minDistance = distance;
        closestMatch = validTable;
      }
    }

    return minDistance <= 3 ? `Use '${closestMatch}' instead?` : 'Check table name spelling';
  }

  /**
   * Simple Levenshtein distance for string similarity
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Log failed operations for pattern learning
   */
  private async logFailedOperation(
    operation: string,
    tableName: string,
    data: any,
    error: any
  ): Promise<void> {
    try {
      await this.supabase.from('detected_errors').insert({
        error_type: 'database_operation_failed',
        severity: 'medium',
        error_message: error.message,
        stack_trace: error.stack,
        context: {
          operation,
          tableName,
          data,
          timestamp: new Date().toISOString()
        },
        auto_fixed: false
      });
    } catch (logError) {
      console.error('[ResilientDB] Failed to log error:', logError);
    }
  }

  /**
   * Clear validation cache (useful after schema changes)
   */
  clearCache(): void {
    this.validator.clearCache();
  }
}

/**
 * Factory function to create a resilient database wrapper
 */
export function createResilientDb(
  supabase: SupabaseClient,
  lovableApiKey: string
): ResilientDbWrapper {
  return new ResilientDbWrapper(supabase, lovableApiKey);
}
