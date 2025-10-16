import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SchemaValidator, SchemaValidationError } from './schemaValidator.ts';
import { SelfHealingLoop } from './selfHealingLoop.ts';
import { TransactionManager } from './transactionManager.ts';
import { safeLog } from './fallbackLogger.ts';

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
  partialSuccess?: boolean;
  failedRecords?: any[];
}

export class ResilientDbWrapper {
  private validator: SchemaValidator;
  private healingLoop: SelfHealingLoop;
  private supabase: SupabaseClient;
  private transactionManager: TransactionManager;
  private logger: any;
  
  constructor(supabase: SupabaseClient, lovableApiKey: string) {
    this.supabase = supabase;
    this.logger = { info: console.log, warn: console.warn, error: console.error, debug: console.debug };
    this.validator = new SchemaValidator(supabase, this.logger);
    this.healingLoop = new SelfHealingLoop(supabase, lovableApiKey);
    this.transactionManager = new TransactionManager(supabase);
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
   * Resilient INSERT with self-healing and smart batch processing
   */
  async insert<T = any>(
    tableName: string,
    data: Record<string, any> | Record<string, any>[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const dataArray = Array.isArray(data) ? data : [data];
    const healedRecords: any[] = [];
    const failedRecords: Array<{ record: any; errors: string[] }> = [];
    let totalAttempts = 0;
    let anyHealed = false;
    
    // Heal each record individually - CONTINUE on failures for batch operations
    for (let i = 0; i < dataArray.length; i++) {
      const record = dataArray[i];
      const healingResult = await this.healingLoop.validateAndHeal(
        'insert',
        tableName,
        record,
        options.maxAttempts || 3
      );

      totalAttempts += healingResult.totalAttempts;

      if (!healingResult.success) {
        this.logger.warn(`Record ${i + 1}/${dataArray.length} failed healing`, {
          tableName,
          errors: healingResult.errors
        });
        
        failedRecords.push({ record, errors: healingResult.errors });
        
        // For single record, fail immediately. For batch, continue processing
        if (dataArray.length === 1) {
          return {
            data: null,
            error: new Error(`Failed to insert into ${tableName}: ${healingResult.errors.join(', ')}`),
            healed: anyHealed,
            attempts: totalAttempts,
            originalOperation: `INSERT INTO ${tableName}`
          };
        }
        continue; // Skip this record, continue with others
      }

      if (healingResult.healed) {
        anyHealed = true;
      }

      healedRecords.push(healingResult.healedData);
    }

    // If we have any records to insert, proceed with transaction support
    if (healedRecords.length > 0) {
      // Use transaction for batch operations to enable rollback on failure
      const transactionId = await this.transactionManager.begin();
      
      try {
        const txResult = await this.transactionManager.execute(
          transactionId,
          tableName,
          'insert',
          healedRecords
        );

        if (!txResult.success) {
          await this.transactionManager.rollback(transactionId);
          await this.logFailedOperation('insert', tableName, healedRecords, new Error(txResult.error || 'Transaction failed'));
          
          return {
            data: null,
            error: new Error(txResult.error || 'Insert transaction failed'),
            healed: anyHealed,
            attempts: totalAttempts,
            originalOperation: `INSERT INTO ${tableName}`
          };
        }

        // Commit transaction
        const commitResult = await this.transactionManager.commit(transactionId);
        if (!commitResult.success) {
          await this.transactionManager.rollback(transactionId);
          return {
            data: null,
            error: new Error(commitResult.error || 'Transaction commit failed'),
            healed: anyHealed,
            attempts: totalAttempts,
            originalOperation: `INSERT INTO ${tableName}`
          };
        }

        const insertedData = txResult.data;


        const duration = Date.now() - startTime;
        const successMessage = failedRecords.length > 0
          ? `⚠️  Partial INSERT: ${healedRecords.length} succeeded, ${failedRecords.length} failed`
          : '✅ Resilient INSERT completed';
        
        this.logger.info(successMessage, {
          tableName,
          succeeded: healedRecords.length,
          failed: failedRecords.length,
          healed: anyHealed,
          attempts: totalAttempts,
          duration
        });

        return {
          data: insertedData as T,
          error: failedRecords.length > 0 
            ? new Error(`Partial success: ${failedRecords.length} records failed`)
            : null,
          healed: anyHealed,
          attempts: totalAttempts,
          originalOperation: `INSERT INTO ${tableName}`,
          partialSuccess: failedRecords.length > 0,
          failedRecords: failedRecords.map(f => f.record)
        };
      } catch (error) {
        if (options.logErrors) {
          console.error(`[ResilientDB] INSERT error on ${tableName}:`, error);
        }
        
        return {
          data: null,
          error: error as Error,
          healed: anyHealed,
          attempts: totalAttempts
        };
      }
    }

    // All records failed
    return {
      data: null,
      error: new Error(`All ${dataArray.length} records failed healing`),
      healed: false,
      attempts: totalAttempts,
      originalOperation: `INSERT INTO ${tableName}`,
      failedRecords: failedRecords.map(f => f.record)
    };

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
   * Log failed operations for pattern learning with fallback
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
      // Database unavailable - use fallback file logging
      console.error('[ResilientDB] Database logging failed, using fallback:', logError);
      await safeLog('error', `Database operation failed: ${operation} on ${tableName}`, {
        operation,
        tableName,
        errorMessage: error.message
      }, error);
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
