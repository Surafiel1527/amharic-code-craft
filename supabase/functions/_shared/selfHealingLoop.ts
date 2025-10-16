/**
 * SELF-HEALING LOOP
 * Enterprise orchestrator for automatic error detection and correction
 * Validates → Detects Issues → Feeds Back to AI → Retries → Learns
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SchemaValidator, SchemaValidationError } from './schemaValidator.ts';
import { createLogger } from './logger.ts';
import { callAIWithFallback } from './aiHelpers.ts';
import { applyDeterministicPatterns, DETERMINISTIC_FIX_PATTERNS } from './deterministicFixPatterns.ts';
import { safeLog } from './fallbackLogger.ts';

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
        // Step 1: Try deterministic fixes first (fastest) - NOW WITH 15+ PATTERNS
        const deterministicResult = applyDeterministicPatterns(
          currentData,
          validation.errors,
          tableName
        );

        if (deterministicResult.fixed && deterministicResult.fixed !== currentData) {
          this.logger.info('🔧 Applied deterministic fixes', { 
            attempt: attemptNumber,
            patterns: deterministicResult.patternsApplied,
            confidence: deterministicResult.confidence 
          });
          currentData = deterministicResult.fixed;
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

              // RE-VALIDATE: Verify AI fix actually works before saving as pattern
              const revalidation = await this.schemaValidator.validateOperation(
                operation,
                tableName,
                aiFixed
              );

              if (revalidation.valid) {
                this.logger.info('✅ AI correction re-validated successfully');
                // Learn from this VERIFIED fix
                await this.learnFromCorrection(
                  tableName,
                  validation.errors,
                  data,
                  aiFixed
                );
                result.learnedPattern = true;
              } else {
                this.logger.warn('⚠️  AI correction failed re-validation', {
                  errors: revalidation.errors.map(e => e.message)
                });
                // Don't save this pattern - it doesn't work
                result.learnedPattern = false;
              }
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
   * DEPRECATED: Old deterministic fixes (replaced by deterministicFixPatterns.ts)
   * Keeping for backward compatibility only
   */
  private applyDeterministicFixes(
    data: Record<string, any>,
    errors: SchemaValidationError[],
    tableName: string
  ): Record<string, any> | null {
    // Use new comprehensive pattern library
    const result = applyDeterministicPatterns(data, errors, tableName);
    return result.fixed;
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

    // Retry up to 2 times with increasing wait
    const maxRetries = 2;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const result = await callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are a database schema expert. Return ONLY valid JSON, no markdown.',
            preferredModel: 'google/gemini-2.5-flash',
            maxTokens: 2000
          }
        );

        let correctedData = result.data.choices[0].message.content.trim();

        // Clean markdown code blocks if present
        if (correctedData.startsWith('```json')) {
          correctedData = correctedData.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (correctedData.startsWith('```')) {
          correctedData = correctedData.replace(/```\n?/g, '');
        }

        // Parse with validation
        const parsed = JSON.parse(correctedData);
        
        // Verify it's a valid object
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('AI returned non-object data');
        }

        this.logger.info('✅ AI correction successful', { tableName, retry });
        return parsed;

      } catch (error) {
        this.logger.warn({ error, tableName, retry }, `⚠️  AI correction attempt ${retry + 1} failed`);
        
        if (retry === maxRetries - 1) {
          this.logger.error('AI correction failed after all retries', {}, error as Error);
          return null;
        }
        
        // Wait before retry (1s, then 2s)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
      }
    }
    
    return null;
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

      // Validate template before saving
      const isValid = await this.validateCorrectionTemplate(tableName, correctedData);
      if (!isValid) {
        this.logger.warn({ tableName, errorSignature }, '⚠️  Skipping invalid correction template');
        return;
      }

      // Upsert pattern with LOW initial confidence - will increase with proven success
      await this.supabase
        .from('schema_error_patterns')
        .upsert({
          table_name: tableName,
          error_signature: errorSignature,
          correction_template: template,
          times_used: 1,
          success_count: 0, // Not proven yet - needs validation
          confidence_score: 0.5, // Start low, increase with success
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

  /**
   * Validate correction template against actual table schema
   */
  private async validateCorrectionTemplate(
    tableName: string,
    template: Record<string, any>
  ): Promise<boolean> {
    try {
      const schema = await this.schemaValidator.getTableSchema(tableName);
      if (!schema) {
        this.logger.warn({ tableName }, '❌ Schema not found for validation');
        return false;
      }

      // Check that all required columns exist in template
      const requiredColumns = schema.columns
        .filter(col => !col.isNullable && !col.hasDefault)
        .map(col => col.name);

      const templateKeys = Object.keys(template);
      const missingRequired = requiredColumns.filter(col => !templateKeys.includes(col));

      if (missingRequired.length > 0) {
        this.logger.warn({ tableName, missingRequired }, '❌ Template missing required columns');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error({ error, tableName }, '❌ Failed to validate correction template');
      return false;
    }
  }
}
