/**
 * SELF-HEALING LOOP
 * Enterprise orchestrator for automatic error detection and correction
 * Validates → Detects Issues → Feeds Back to AI → Retries → Learns
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SchemaValidator, SchemaValidationError } from './schemaValidator.ts';
import { createLogger } from './logger.ts';
import { callAIWithFallback } from './aiHelpers.ts';

export interface HealingAttempt {
  attemptNumber: number;
  validationErrors: SchemaValidationError[];
  correctionApplied: boolean;
  correctionMethod: 'deterministic' | 'ai' | 'pattern';
  timestamp: string;
  durationMs: number;
}

export interface HealingResult {
  success: boolean;
  healed: boolean;
  originalData: any;
  healedData: any;
  attempts: HealingAttempt[];
  totalAttempts: number;
  errors: string[];
  learnedPattern: boolean;
}

/**
 * Self-Healing Loop Orchestrator
 */
export class SelfHealingLoop {
  private schemaValidator: SchemaValidator;
  private logger = createLogger();

  constructor(
    private supabase: SupabaseClient,
    private lovableApiKey: string
  ) {
    this.schemaValidator = new SchemaValidator(supabase, this.logger);
  }

  /**
   * Validate and auto-correct database operation
   */
  async validateAndHeal(
    operation: 'select' | 'insert' | 'update' | 'upsert',
    tableName: string,
    data: Record<string, any>,
    maxAttempts: number = 3
  ): Promise<HealingResult> {
    
    this.logger.info('🏥 Starting self-healing validation', { 
      operation, 
      tableName, 
      maxAttempts 
    });

    const result: HealingResult = {
      success: false,
      healed: false,
      originalData: { ...data },
      healedData: { ...data },
      attempts: [],
      totalAttempts: 0,
      errors: [],
      learnedPattern: false
    };

    let currentData = { ...data };
    let attemptNumber = 0;

    while (attemptNumber < maxAttempts) {
      attemptNumber++;
      result.totalAttempts = attemptNumber;
      const startTime = Date.now();

      this.logger.info('🔄 Healing attempt', { 
        attempt: attemptNumber, 
        tableName 
      });

      // Validate against schema
      const validation = await this.schemaValidator.validateOperation(
        operation,
        tableName,
        currentData
      );

      const durationMs = Date.now() - startTime;

      if (validation.valid) {
        // Success!
        this.logger.info('✅ Validation passed', { 
          attempt: attemptNumber, 
          tableName 
        });
        result.success = true;
        result.healedData = currentData;
        return result;
      }

      // Errors detected - attempt healing
      this.logger.warn('❌ Validation errors detected', { 
        errorCount: validation.errors.length,
        errors: validation.errors.map(e => e.message)
      });

      result.errors = validation.errors.map(e => e.message);

      const attempt: HealingAttempt = {
        attemptNumber,
        validationErrors: validation.errors,
        correctionApplied: false,
        correctionMethod: 'deterministic',
        timestamp: new Date().toISOString(),
        durationMs
      };

      try {
        // Step 1: Try deterministic fixes first (fastest)
        const deterministicFixed = this.applyDeterministicFixes(
          currentData,
          validation.errors,
          tableName
        );

        if (deterministicFixed && deterministicFixed !== currentData) {
          this.logger.info('🔧 Applied deterministic fix', { attempt: attemptNumber });
          currentData = deterministicFixed;
          result.healed = true;
          attempt.correctionApplied = true;
          attempt.correctionMethod = 'deterministic';
        } else {
          // Step 2: Try learned patterns
          const patternFixed = await this.applyLearnedPattern(
            currentData,
            validation.errors,
            tableName
          );

          if (patternFixed && patternFixed !== currentData) {
            this.logger.info('📚 Applied learned pattern', { attempt: attemptNumber });
            currentData = patternFixed;
            result.healed = true;
            attempt.correctionApplied = true;
            attempt.correctionMethod = 'pattern';
          } else {
            // Step 3: Use AI to fix (most expensive)
            const aiFixed = await this.applyAICorrection(
              currentData,
              validation.errors,
              tableName,
              operation
            );

            if (aiFixed && aiFixed !== currentData) {
              this.logger.info('🤖 Applied AI correction', { attempt: attemptNumber });
              currentData = aiFixed;
              result.healed = true;
              attempt.correctionApplied = true;
              attempt.correctionMethod = 'ai';

              // Learn from this fix
              await this.learnFromCorrection(
                tableName,
                validation.errors,
                data,
                aiFixed
              );
              result.learnedPattern = true;
            }
          }
        }

      } catch (error) {
        this.logger.error('Healing attempt failed', { attempt: attemptNumber }, error as Error);
        attempt.correctionApplied = false;
      }

      result.attempts.push(attempt);

      // If no correction was applied, break early
      if (!attempt.correctionApplied) {
        this.logger.warn('No correction could be applied, stopping', { 
          attempt: attemptNumber 
        });
        break;
      }
    }

    result.healedData = currentData;

    // Final validation check
    const finalValidation = await this.schemaValidator.validateOperation(
      operation,
      tableName,
      currentData
    );

    if (finalValidation.valid) {
      result.success = true;
      this.logger.info('✅ Self-healing successful', { 
        totalAttempts: attemptNumber,
        healed: result.healed
      });
    } else {
      result.success = false;
      result.errors = finalValidation.errors.map(e => e.message);
      this.logger.error('❌ Self-healing failed after all attempts', { 
        totalAttempts: attemptNumber,
        remainingErrors: result.errors
      });
    }

    return result;
  }

  /**
   * Apply deterministic fixes (fast, rule-based)
   */
  private applyDeterministicFixes(
    data: Record<string, any>,
    errors: SchemaValidationError[],
    tableName: string
  ): Record<string, any> | null {
    
    const fixed = { ...data };
    let madeChanges = false;

    for (const error of errors) {
      // Fix: generated_code.code → project_files.file_content
      if (error.type === 'column_mismatch' && error.column === 'code' && tableName === 'project_files') {
        if ('code' in fixed) {
          fixed['file_content'] = fixed['code'];
          delete fixed['code'];
          madeChanges = true;
          this.logger.debug('Fixed column mismatch: code → file_content');
        }
      }

      // Fix: projects.name → projects.title
      if (error.type === 'column_mismatch' && error.column === 'name' && tableName === 'projects') {
        if ('name' in fixed) {
          fixed['title'] = fixed['name'];
          delete fixed['name'];
          madeChanges = true;
          this.logger.debug('Fixed column mismatch: name → title');
        }
      }

      // Fix: project_files.content → project_files.file_content
      if (error.type === 'column_mismatch' && error.column === 'content' && tableName === 'project_files') {
        if ('content' in fixed) {
          fixed['file_content'] = fixed['content'];
          delete fixed['content'];
          madeChanges = true;
          this.logger.debug('Fixed column mismatch: content → file_content');
        }
      }

      // Fix: Missing required fields with sensible defaults
      if (error.type === 'constraint_violation' && error.column) {
        if (error.column === 'user_id' && !fixed['user_id']) {
          // Can't auto-fix user_id, but flag it
          this.logger.warn('Missing required user_id - cannot auto-fix');
        }
        if (error.column === 'created_at' && !fixed['created_at']) {
          fixed['created_at'] = new Date().toISOString();
          madeChanges = true;
        }
      }
    }

    return madeChanges ? fixed : null;
  }

  /**
   * Apply learned correction patterns
   */
  private async applyLearnedPattern(
    data: Record<string, any>,
    errors: SchemaValidationError[],
    tableName: string
  ): Promise<Record<string, any> | null> {
    
    try {
      // Query learned patterns
      const errorSignature = errors.map(e => `${e.type}:${e.table}.${e.column}`).join('|');
      
      const { data: patterns } = await this.supabase
        .from('schema_error_patterns')
        .select('*')
        .eq('table_name', tableName)
        .eq('error_signature', errorSignature)
        .gte('confidence_score', 0.7)
        .order('success_count', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (patterns && patterns.correction_template) {
        this.logger.info('📚 Found learned pattern', { 
          patternId: patterns.id,
          confidence: patterns.confidence_score
        });

        // Apply correction template
        const fixed = { ...data };
        const template = patterns.correction_template as Record<string, any>;

        for (const [key, value] of Object.entries(template)) {
          if (typeof value === 'string' && value.startsWith('$')) {
            // Template variable: $old_column → map to new column
            const oldColumn = value.slice(1);
            if (oldColumn in fixed) {
              fixed[key] = fixed[oldColumn];
              delete fixed[oldColumn];
            }
          }
        }

        // Update pattern usage
        await this.supabase
          .from('schema_error_patterns')
          .update({
            times_used: (patterns.times_used || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', patterns.id);

        return fixed;
      }

    } catch (error) {
      this.logger.error('Failed to apply learned pattern', {}, error as Error);
    }

    return null;
  }

  /**
   * Use AI to correct validation errors
   */
  private async applyAICorrection(
    data: Record<string, any>,
    errors: SchemaValidationError[],
    tableName: string,
    operation: string
  ): Promise<Record<string, any> | null> {
    
    this.logger.info('🤖 Requesting AI correction', { tableName, errorCount: errors.length });

    const prompt = `You are a database schema correction expert. Fix the following data validation errors.

TABLE: ${tableName}
OPERATION: ${operation}

VALIDATION ERRORS:
${errors.map((e, i) => `${i + 1}. ${e.message}
   Fix suggestion: ${e.fixSuggestion}`).join('\n')}

CURRENT DATA:
${JSON.stringify(data, null, 2)}

INSTRUCTIONS:
1. Fix ALL validation errors
2. Return ONLY the corrected data as valid JSON
3. Do NOT add new fields unless required
4. Preserve all other fields unchanged
5. Ensure the corrected data matches the table schema

CORRECTED DATA (JSON only):`;

    try {
      const result = await callAIWithFallback(
        [{ role: 'user', content: prompt }],
        {
          systemPrompt: 'You are a database schema expert. Return only valid JSON.',
          preferredModel: 'google/gemini-2.5-flash',
          maxTokens: 2000
        }
      );

      let correctedData = result.data.choices[0].message.content;

      // Extract JSON from markdown if present
      const jsonMatch = correctedData.match(/```(?:json)?\n?([\s\S]*?)```/);
      if (jsonMatch) {
        correctedData = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(correctedData);

      this.logger.info('✅ AI correction successful', { tableName });
      return parsed;

    } catch (error) {
      this.logger.error('AI correction failed', {}, error as Error);
      return null;
    }
  }

  /**
   * Learn from successful correction
   */
  private async learnFromCorrection(
    tableName: string,
    errors: SchemaValidationError[],
    originalData: Record<string, any>,
    correctedData: Record<string, any>
  ): Promise<void> {
    
    try {
      const errorSignature = errors.map(e => `${e.type}:${e.table}.${e.column}`).join('|');
      
      // Build correction template
      const template: Record<string, any> = {};
      for (const [key, value] of Object.entries(correctedData)) {
        if (!(key in originalData)) {
          // New field added
          template[key] = value;
        } else if (originalData[key] !== value) {
          // Field was transformed
          template[key] = `$${key}`;
        }
      }

      // Upsert pattern
      await this.supabase
        .from('schema_error_patterns')
        .upsert({
          table_name: tableName,
          error_signature: errorSignature,
          correction_template: template,
          times_used: 1,
          success_count: 1,
          confidence_score: 0.8,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'table_name,error_signature'
        });

      this.logger.info('📝 Learned new correction pattern', { 
        tableName, 
        errorSignature 
      });

    } catch (error) {
      this.logger.error('Failed to learn pattern', {}, error as Error);
    }
  }

  /**
   * Batch validation and healing
   */
  async validateAndHealBatch(
    operations: Array<{
      operation: 'select' | 'insert' | 'update' | 'upsert';
      tableName: string;
      data: Record<string, any>;
    }>,
    maxAttempts: number = 3
  ): Promise<HealingResult[]> {
    
    const results: HealingResult[] = [];

    for (const op of operations) {
      const result = await this.validateAndHeal(
        op.operation,
        op.tableName,
        op.data,
        maxAttempts
      );
      results.push(result);
    }

    return results;
  }
}
