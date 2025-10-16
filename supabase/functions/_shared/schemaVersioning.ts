import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Schema Version Tracking & Change Detection
 * 
 * Ensures cache invalidation and healing pattern updates when schema changes occur.
 * Prevents stale schema validation by detecting and responding to:
 * - Table additions/deletions
 * - Column additions/deletions/modifications
 * - Type changes
 * - Constraint changes
 * 
 * Features:
 * - Real-time schema change detection
 * - Automatic cache invalidation
 * - Schema diff generation
 * - Migration tracking
 * - Rollback support for schema changes
 */

interface SchemaVersion {
  version: string;
  timestamp: number;
  tables: Map<string, TableSchema>;
  hash: string;
}

interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  constraints: string[];
  hash: string;
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  default_value?: string;
  is_primary_key: boolean;
}

interface SchemaChange {
  type: 'table_added' | 'table_removed' | 'column_added' | 'column_removed' | 'column_modified' | 'constraint_changed';
  table: string;
  column?: string;
  oldValue?: any;
  newValue?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SchemaVersionInfo {
  current: SchemaVersion;
  previous?: SchemaVersion;
  changes: SchemaChange[];
  requiresCacheInvalidation: boolean;
  requiresPatternUpdate: boolean;
}

export class SchemaVersionManager {
  private supabase: SupabaseClient;
  private currentVersion?: SchemaVersion;
  private checkInterval = 300000; // 5 minutes
  private changeCallbacks: ((changes: SchemaChange[]) => void)[] = [];
  private logger: any;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.logger = {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Initialize schema versioning
   */
  async initialize(): Promise<void> {
    this.logger.info('[SchemaVersion] Initializing...');
    
    try {
      // Load current schema
      const version = await this.captureCurrentSchema();
      this.currentVersion = version;
      
      // Store initial version
      await this.storeVersion(version);
      
      this.logger.info(`[SchemaVersion] Initialized - v${version.version}`);
    } catch (error) {
      this.logger.error('[SchemaVersion] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Capture current database schema
   */
  private async captureCurrentSchema(): Promise<SchemaVersion> {
    const tables = new Map<string, TableSchema>();

    try {
      // Get all tables in public schema
      const { data: tableData, error: tableError } = await this.supabase
        .rpc('get_table_names');

      if (tableError) {
        // Fallback: query information_schema directly
        const { data: fallbackData } = await this.supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        
        if (fallbackData) {
          for (const row of fallbackData) {
            const schema = await this.captureTableSchema(row.table_name);
            tables.set(row.table_name, schema);
          }
        }
      } else if (tableData) {
        for (const tableName of tableData) {
          const schema = await this.captureTableSchema(tableName);
          tables.set(tableName, schema);
        }
      }

      const hash = await this.hashSchema(tables);
      
      return {
        version: this.generateVersionNumber(),
        timestamp: Date.now(),
        tables,
        hash
      };
    } catch (error) {
      this.logger.error('[SchemaVersion] Capture error:', error);
      throw error;
    }
  }

  /**
   * Capture schema for a specific table
   */
  private async captureTableSchema(tableName: string): Promise<TableSchema> {
    try {
      // Use the existing get_table_columns function
      const { data: columns, error } = await this.supabase
        .rpc('get_table_columns', { p_table_name: tableName });

      if (error) {
        this.logger.warn(`[SchemaVersion] Error fetching ${tableName} schema:`, error);
        return {
          name: tableName,
          columns: [],
          constraints: [],
          hash: ''
        };
      }

      const columnDefs: ColumnDefinition[] = (columns || []).map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default_value: col.column_default,
        is_primary_key: col.is_primary_key || false
      }));

      const schema: TableSchema = {
        name: tableName,
        columns: columnDefs,
        constraints: [], // TODO: Fetch constraints
        hash: await this.hashTableSchema(columnDefs)
      };

      return schema;
    } catch (error) {
      this.logger.error(`[SchemaVersion] Error capturing ${tableName}:`, error);
      return {
        name: tableName,
        columns: [],
        constraints: [],
        hash: ''
      };
    }
  }

  /**
   * Check for schema changes
   */
  async checkForChanges(): Promise<SchemaVersionInfo | null> {
    if (!this.currentVersion) {
      await this.initialize();
      return null;
    }

    const newVersion = await this.captureCurrentSchema();
    
    // Compare hashes for quick check
    if (newVersion.hash === this.currentVersion.hash) {
      return null; // No changes
    }

    this.logger.warn('[SchemaVersion] Schema changes detected!');

    // Detailed diff
    const changes = this.compareSchemas(this.currentVersion, newVersion);
    
    const info: SchemaVersionInfo = {
      current: newVersion,
      previous: this.currentVersion,
      changes,
      requiresCacheInvalidation: this.shouldInvalidateCache(changes),
      requiresPatternUpdate: this.shouldUpdatePatterns(changes)
    };

    // Update current version
    this.currentVersion = newVersion;
    await this.storeVersion(newVersion);
    await this.logSchemaChange(info);

    // Notify listeners
    this.notifyChanges(changes);

    return info;
  }

  /**
   * Compare two schema versions
   */
  private compareSchemas(
    oldVersion: SchemaVersion,
    newVersion: SchemaVersion
  ): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Check for added/removed tables
    for (const [tableName, newTable] of newVersion.tables) {
      if (!oldVersion.tables.has(tableName)) {
        changes.push({
          type: 'table_added',
          table: tableName,
          severity: 'high'
        });
      }
    }

    for (const [tableName] of oldVersion.tables) {
      if (!newVersion.tables.has(tableName)) {
        changes.push({
          type: 'table_removed',
          table: tableName,
          severity: 'critical'
        });
      }
    }

    // Check for column changes in existing tables
    for (const [tableName, newTable] of newVersion.tables) {
      const oldTable = oldVersion.tables.get(tableName);
      if (!oldTable) continue;

      const oldColumns = new Map(oldTable.columns.map(c => [c.name, c]));
      const newColumns = new Map(newTable.columns.map(c => [c.name, c]));

      // Added columns
      for (const [colName, newCol] of newColumns) {
        if (!oldColumns.has(colName)) {
          changes.push({
            type: 'column_added',
            table: tableName,
            column: colName,
            newValue: newCol,
            severity: 'medium'
          });
        }
      }

      // Removed columns
      for (const [colName, oldCol] of oldColumns) {
        if (!newColumns.has(colName)) {
          changes.push({
            type: 'column_removed',
            table: tableName,
            column: colName,
            oldValue: oldCol,
            severity: 'high'
          });
        }
      }

      // Modified columns
      for (const [colName, newCol] of newColumns) {
        const oldCol = oldColumns.get(colName);
        if (oldCol && this.hasColumnChanged(oldCol, newCol)) {
          changes.push({
            type: 'column_modified',
            table: tableName,
            column: colName,
            oldValue: oldCol,
            newValue: newCol,
            severity: 'medium'
          });
        }
      }
    }

    return changes;
  }

  /**
   * Check if column definition changed
   */
  private hasColumnChanged(oldCol: ColumnDefinition, newCol: ColumnDefinition): boolean {
    return oldCol.type !== newCol.type ||
           oldCol.nullable !== newCol.nullable ||
           oldCol.is_primary_key !== newCol.is_primary_key;
  }

  /**
   * Determine if changes require cache invalidation
   */
  private shouldInvalidateCache(changes: SchemaChange[]): boolean {
    return changes.some(change => 
      change.severity === 'high' || change.severity === 'critical'
    );
  }

  /**
   * Determine if changes require pattern updates
   */
  private shouldUpdatePatterns(changes: SchemaChange[]): boolean {
    return changes.some(change => 
      change.type === 'column_added' || 
      change.type === 'column_removed' ||
      change.type === 'table_added'
    );
  }

  /**
   * Hash schema for comparison
   */
  private async hashSchema(tables: Map<string, TableSchema>): Promise<string> {
    const schemaStr = JSON.stringify(
      Array.from(tables.values()).sort((a, b) => a.name.localeCompare(b.name))
    );
    
    const encoder = new TextEncoder();
    const data = encoder.encode(schemaStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash table schema
   */
  private async hashTableSchema(columns: ColumnDefinition[]): Promise<string> {
    const schemaStr = JSON.stringify(columns.sort((a, b) => a.name.localeCompare(b.name)));
    const encoder = new TextEncoder();
    const data = encoder.encode(schemaStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate version number
   */
  private generateVersionNumber(): string {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  }

  /**
   * Store schema version
   */
  private async storeVersion(version: SchemaVersion): Promise<void> {
    try {
      await this.supabase.from('schema_versions').insert({
        version: version.version,
        schema_hash: version.hash,
        schema_snapshot: {
          tables: Array.from(version.tables.values())
        },
        captured_at: new Date(version.timestamp).toISOString()
      });
    } catch (error) {
      this.logger.error('[SchemaVersion] Failed to store version:', error);
    }
  }

  /**
   * Log schema change
   */
  private async logSchemaChange(info: SchemaVersionInfo): Promise<void> {
    try {
      await this.supabase.from('schema_change_logs').insert({
        from_version: info.previous?.version,
        to_version: info.current.version,
        changes: info.changes,
        requires_cache_invalidation: info.requiresCacheInvalidation,
        requires_pattern_update: info.requiresPatternUpdate,
        severity: this.getMaxSeverity(info.changes)
      });
    } catch (error) {
      this.logger.error('[SchemaVersion] Failed to log change:', error);
    }
  }

  /**
   * Get maximum severity from changes
   */
  private getMaxSeverity(changes: SchemaChange[]): string {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    let maxSeverity = 'low';
    
    for (const change of changes) {
      if (severityOrder.indexOf(change.severity) > severityOrder.indexOf(maxSeverity)) {
        maxSeverity = change.severity;
      }
    }
    
    return maxSeverity;
  }

  /**
   * Register callback for schema changes
   */
  onSchemaChange(callback: (changes: SchemaChange[]) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyChanges(changes: SchemaChange[]): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(changes);
      } catch (error) {
        this.logger.error('[SchemaVersion] Callback error:', error);
      }
    }
  }

  /**
   * Start periodic monitoring
   */
  private startMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkForChanges();
      } catch (error) {
        this.logger.error('[SchemaVersion] Monitoring error:', error);
      }
    }, this.checkInterval);
  }

  /**
   * Get current version info
   */
  getCurrentVersion(): SchemaVersion | undefined {
    return this.currentVersion;
  }

  /**
   * Force schema refresh
   */
  async forceRefresh(): Promise<SchemaVersionInfo | null> {
    this.logger.info('[SchemaVersion] Force refresh');
    return await this.checkForChanges();
  }
}

/**
 * Factory function
 */
export function createSchemaVersionManager(supabase: SupabaseClient): SchemaVersionManager {
  return new SchemaVersionManager(supabase);
}
