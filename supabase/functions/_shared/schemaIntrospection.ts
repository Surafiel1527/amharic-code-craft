/**
 * Schema Introspection Service
 * 
 * Queries and caches the actual database schema to detect mismatches
 * between what the code expects and what actually exists.
 */

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
}

interface TableSchema {
  tableName: string;
  columns: Map<string, ColumnInfo>;
  lastChecked: number;
}

// Cache schema information for 5 minutes
const SCHEMA_CACHE_TTL = 5 * 60 * 1000;
const schemaCache = new Map<string, TableSchema>();

/**
 * Get the schema for a specific table
 */
export async function getTableSchema(
  supabase: any,
  tableName: string,
  forceRefresh = false
): Promise<TableSchema | null> {
  // Check cache first
  if (!forceRefresh) {
    const cached = schemaCache.get(tableName);
    if (cached && Date.now() - cached.lastChecked < SCHEMA_CACHE_TTL) {
      return cached;
    }
  }

  try {
    console.log(`🔍 Introspecting schema for table: ${tableName}`);
    
    // Use fallback method (works without custom RPC functions)
    return await getFallbackSchema(supabase, tableName);
  } catch (error) {
    console.error(`❌ Schema introspection error for ${tableName}:`, error);
    return null;
  }
}

/**
 * Fallback: Try to get schema by selecting from the table
 */
async function getFallbackSchema(
  supabase: any,
  tableName: string
): Promise<TableSchema | null> {
  try {
    // Get one row to determine structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`⚠️ Fallback schema detection failed for ${tableName}`);
      return null;
    }

    // Build column map from actual data
    const columns = new Map<string, ColumnInfo>();
    if (data) {
      Object.keys(data).forEach(key => {
        columns.set(key, {
          column_name: key,
          data_type: typeof data[key],
          is_nullable: true, // Assume nullable for fallback
          column_default: null
        });
      });
    }

    const schema: TableSchema = {
      tableName,
      columns,
      lastChecked: Date.now()
    };

    schemaCache.set(tableName, schema);
    console.log(`✅ Fallback schema cached for ${tableName}: ${columns.size} columns`);
    return schema;
  } catch (error) {
    console.error(`❌ Fallback schema detection failed:`, error);
    return null;
  }
}

/**
 * Validate if a set of columns exist in a table
 */
export async function validateColumns(
  supabase: any,
  tableName: string,
  columnNames: string[]
): Promise<{
  valid: boolean;
  missingColumns: string[];
  existingColumns: string[];
}> {
  const schema = await getTableSchema(supabase, tableName);

  if (!schema) {
    return {
      valid: false,
      missingColumns: columnNames,
      existingColumns: []
    };
  }

  const existingColumns: string[] = [];
  const missingColumns: string[] = [];

  columnNames.forEach(col => {
    if (schema.columns.has(col)) {
      existingColumns.push(col);
    } else {
      missingColumns.push(col);
    }
  });

  return {
    valid: missingColumns.length === 0,
    missingColumns,
    existingColumns
  };
}

/**
 * Clear schema cache (useful after migrations)
 */
export function clearSchemaCache(tableName?: string): void {
  if (tableName) {
    schemaCache.delete(tableName);
    console.log(`🧹 Cleared schema cache for: ${tableName}`);
  } else {
    schemaCache.clear();
    console.log(`🧹 Cleared entire schema cache`);
  }
}

/**
 * Get all cached table names
 */
export function getCachedTables(): string[] {
  return Array.from(schemaCache.keys());
}
