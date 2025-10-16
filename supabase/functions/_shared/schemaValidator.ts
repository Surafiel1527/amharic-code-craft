/**
 * SCHEMA VALIDATOR
 * Enterprise-grade validation against actual database schema
 * Prevents errors before they reach the database
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from './logger.ts';

export interface SchemaValidationError {
  type: 'column_mismatch' | 'table_not_found' | 'constraint_violation' | 'type_mismatch';
  table: string;
  column?: string;
  expected?: string;
  actual?: string;
  message: string;
  fixSuggestion: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: string[];
}

export interface TableSchema {
  tableName: string;
  columns: ColumnSchema[];
  primaryKeys: string[];
  foreignKeys: ForeignKeySchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

export interface ForeignKeySchema {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

/**
 * Schema Validator - validates operations against actual DB schema
 */
export class SchemaValidator {
  private schemaCache: Map<string, TableSchema> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private supabase: SupabaseClient,
    private logger = createLogger()
  ) {}

  /**
   * Validate database operation before execution
   */
  async validateOperation(
    operation: 'select' | 'insert' | 'update' | 'upsert',
    tableName: string,
    data?: Record<string, any>
  ): Promise<SchemaValidationResult> {
    this.logger.info('🔍 Validating schema operation', { operation, tableName });

    const result: SchemaValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      // Get table schema
      const schema = await this.getTableSchema(tableName);
      
      if (!schema) {
        result.valid = false;
        result.errors.push({
          type: 'table_not_found',
          table: tableName,
          message: `Table '${tableName}' does not exist in database`,
          fixSuggestion: `Check if table name is correct. Common tables: project_files, projects, conversations, messages`
        });
        return result;
      }

      // Validate data if provided (for insert/update/upsert)
      if (data && (operation === 'insert' || operation === 'update' || operation === 'upsert')) {
        const dataErrors = this.validateDataAgainstSchema(data, schema);
        result.errors.push(...dataErrors);
        
        if (dataErrors.length > 0) {
          result.valid = false;
        }
      }

      this.logger.info('✅ Schema validation complete', { 
        valid: result.valid, 
        errorCount: result.errors.length 
      });

      return result;

    } catch (error) {
      this.logger.error('❌ Schema validation failed', {}, error as Error);
      result.valid = false;
      result.errors.push({
        type: 'constraint_violation',
        table: tableName,
        message: `Validation error: ${(error as Error).message}`,
        fixSuggestion: 'Check database connection and permissions'
      });
      return result;
    }
  }

  /**
   * Validate data against table schema
   */
  private validateDataAgainstSchema(
    data: Record<string, any>,
    schema: TableSchema
  ): SchemaValidationError[] {
    const errors: SchemaValidationError[] = [];
    const columnNames = new Set(schema.columns.map(c => c.name));

    // Check for columns that don't exist in schema
    for (const [key, value] of Object.entries(data)) {
      if (!columnNames.has(key)) {
        errors.push({
          type: 'column_mismatch',
          table: schema.tableName,
          column: key,
          message: `Column '${key}' does not exist in table '${schema.tableName}'`,
          fixSuggestion: `Available columns: ${Array.from(columnNames).join(', ')}`
        });
      }
    }

    // Check required columns (non-nullable without defaults)
    for (const column of schema.columns) {
      if (!column.nullable && !column.defaultValue && !(column.name in data)) {
        errors.push({
          type: 'constraint_violation',
          table: schema.tableName,
          column: column.name,
          message: `Required column '${column.name}' is missing`,
          fixSuggestion: `Add '${column.name}' to your data object`
        });
      }
    }

    // Type validation (basic)
    for (const [key, value] of Object.entries(data)) {
      const column = schema.columns.find(c => c.name === key);
      if (column && value !== null && value !== undefined) {
        const typeError = this.validateColumnType(key, value, column);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }

    return errors;
  }

  /**
   * Validate column type
   */
  private validateColumnType(
    columnName: string,
    value: any,
    column: ColumnSchema
  ): SchemaValidationError | null {
    const type = column.type.toLowerCase();
    const valueType = typeof value;

    // UUID validation
    if (type.includes('uuid')) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof value === 'string' && !uuidRegex.test(value)) {
        return {
          type: 'type_mismatch',
          table: '',
          column: columnName,
          expected: 'uuid',
          actual: valueType,
          message: `Column '${columnName}' expects UUID format`,
          fixSuggestion: `Use a valid UUID or gen_random_uuid()`
        };
      }
    }

    // Text validation
    if ((type.includes('text') || type.includes('varchar')) && valueType !== 'string') {
      return {
        type: 'type_mismatch',
        table: '',
        column: columnName,
        expected: 'string',
        actual: valueType,
        message: `Column '${columnName}' expects string, got ${valueType}`,
        fixSuggestion: `Convert value to string`
      };
    }

    // Integer validation
    if (type.includes('integer') && !Number.isInteger(value)) {
      return {
        type: 'type_mismatch',
        table: '',
        column: columnName,
        expected: 'integer',
        actual: valueType,
        message: `Column '${columnName}' expects integer, got ${valueType}`,
        fixSuggestion: `Convert value to integer or use correct numeric type`
      };
    }

    // JSON validation
    if (type.includes('jsonb') || type.includes('json')) {
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        } else if (typeof value !== 'object') {
          return {
            type: 'type_mismatch',
            table: '',
            column: columnName,
            expected: 'object/json',
            actual: valueType,
            message: `Column '${columnName}' expects JSON, got ${valueType}`,
            fixSuggestion: `Provide a valid JSON object`
          };
        }
      } catch {
        return {
          type: 'type_mismatch',
          table: '',
          column: columnName,
          expected: 'valid json',
          actual: 'invalid json',
          message: `Column '${columnName}' contains invalid JSON`,
          fixSuggestion: `Check JSON syntax`
        };
      }
    }

    return null;
  }

  /**
   * Get table schema (with caching)
   */
  private async getTableSchema(tableName: string): Promise<TableSchema | null> {
    // Check cache
    const now = Date.now();
    if (this.schemaCache.has(tableName) && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
      return this.schemaCache.get(tableName)!;
    }

    try {
      // Query information_schema for column details
      const { data: columns, error } = await this.supabase
        .rpc('get_table_columns', { 
          p_table_name: tableName 
        });

      if (error || !columns || columns.length === 0) {
        // Fallback: Try to query the table with limit 0 to get column info
        const { data, error: queryError } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (queryError) {
          this.logger.warn(`Table '${tableName}' not found or inaccessible`);
          return null;
        }

        // Table exists but we don't have detailed schema info
        // Return basic schema info
        const schema: TableSchema = {
          tableName,
          columns: Object.keys(data || {}).map(name => ({
            name,
            type: 'unknown',
            nullable: true
          })),
          primaryKeys: [],
          foreignKeys: []
        };

        this.schemaCache.set(tableName, schema);
        this.lastCacheUpdate = now;
        return schema;
      }

      // Build schema from columns
      const schema: TableSchema = {
        tableName,
        columns: columns.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default
        })),
        primaryKeys: columns
          .filter((col: any) => col.is_primary_key)
          .map((col: any) => col.column_name),
        foreignKeys: []
      };

      this.schemaCache.set(tableName, schema);
      this.lastCacheUpdate = now;
      return schema;

    } catch (error) {
      this.logger.error(`Failed to get schema for '${tableName}'`, {}, error as Error);
      return null;
    }
  }

  /**
   * Clear schema cache (useful for testing or after migrations)
   */
  clearCache(): void {
    this.schemaCache.clear();
    this.lastCacheUpdate = 0;
    this.logger.info('Schema cache cleared');
  }

  /**
   * Validate multiple operations at once
   */
  async validateBatch(
    operations: Array<{
      operation: 'select' | 'insert' | 'update' | 'upsert';
      tableName: string;
      data?: Record<string, any>;
    }>
  ): Promise<SchemaValidationResult> {
    const allErrors: SchemaValidationError[] = [];
    const allWarnings: string[] = [];

    for (const op of operations) {
      const result = await this.validateOperation(op.operation, op.tableName, op.data);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}

/**
 * Common schema fixes based on known patterns
 */
export const COMMON_SCHEMA_FIXES: Record<string, string> = {
  'generated_code.code': 'Use project_files.file_content instead',
  'projects.name': 'Use projects.title instead',
  'project_files.content': 'Use project_files.file_content instead',
  'conversations.name': 'Use conversations.title instead',
};

/**
 * Get fix suggestion for common schema errors
 */
export function getSchemaFixSuggestion(error: SchemaValidationError): string {
  const key = `${error.table}.${error.column}`;
  return COMMON_SCHEMA_FIXES[key] || error.fixSuggestion;
}
