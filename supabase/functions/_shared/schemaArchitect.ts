/**
 * Schema Architect - Enterprise Database Schema Generation
 * 
 * Generates complex database schemas with 15+ interconnected tables,
 * relationships, indexes, and triggers for large-scale applications.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'cascade' | 'set null' | 'restrict';
  };
}

export interface TableDefinition {
  name: string;
  columns: TableColumn[];
  indexes: IndexDefinition[];
  triggers: TriggerDefinition[];
  rlsPolicies: RLSPolicy[];
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  unique?: boolean;
}

export interface TriggerDefinition {
  name: string;
  timing: 'before' | 'after';
  event: 'insert' | 'update' | 'delete';
  function: string;
}

export interface RLSPolicy {
  name: string;
  command: 'select' | 'insert' | 'update' | 'delete' | 'all';
  using?: string;
  withCheck?: string;
}

export interface DatabaseSchema {
  tables: TableDefinition[];
  relationships: Relationship[];
  sql: string;
  warnings: string[];
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export class SchemaArchitect {
  constructor(private supabase: ReturnType<typeof createClient>) {}

  /**
   * Generates complete database schema from features
   */
  async generateFullSchema(features: any[]): Promise<DatabaseSchema> {
    const tables: TableDefinition[] = [];
    const warnings: string[] = [];

    // Generate core tables
    for (const feature of features) {
      const featureTables = await this.generateTablesForFeature(feature);
      tables.push(...featureTables);
    }

    // Add junction tables for many-to-many relationships
    const junctionTables = this.generateJunctionTables(tables);
    tables.push(...junctionTables);

    // Map relationships
    const relationships = this.mapRelationships(tables);

    // Generate SQL
    const sql = this.generateSQL(tables, relationships);

    return {
      tables,
      relationships,
      sql,
      warnings,
    };
  }

  /**
   * Generates tables for a specific feature
   */
  private async generateTablesForFeature(feature: any): Promise<TableDefinition[]> {
    const tables: TableDefinition[] = [];

    // Common patterns based on feature type
    if (feature.databaseTables) {
      for (const tableName of feature.databaseTables) {
        tables.push(this.generateTableDefinition(tableName, feature));
      }
    }

    return tables;
  }

  /**
   * Generates table definition based on name and feature context
   */
  private generateTableDefinition(tableName: string, feature: any): TableDefinition {
    const baseColumns: TableColumn[] = [
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        defaultValue: 'gen_random_uuid()',
        isPrimaryKey: true,
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()',
      },
      {
        name: 'updated_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()',
      },
    ];

    // Add user_id if auth-related
    if (feature.id !== 'database') {
      baseColumns.push({
        name: 'user_id',
        type: 'uuid',
        nullable: false,
        isForeignKey: true,
        references: {
          table: 'auth.users',
          column: 'id',
          onDelete: 'cascade',
        },
      });
    }

    // Add feature-specific columns
    const specificColumns = this.generateColumnsForTable(tableName);

    return {
      name: tableName,
      columns: [...baseColumns, ...specificColumns],
      indexes: this.generateIndexes(tableName, [...baseColumns, ...specificColumns]),
      triggers: this.generateTriggers(tableName),
      rlsPolicies: this.generateRLSPolicies(tableName),
    };
  }

  /**
   * Generates columns based on table name
   */
  private generateColumnsForTable(tableName: string): TableColumn[] {
    const columnPatterns: Record<string, TableColumn[]> = {
      videos: [
        { name: 'title', type: 'text', nullable: false },
        { name: 'description', type: 'text', nullable: true },
        { name: 'video_url', type: 'text', nullable: false },
        { name: 'thumbnail_url', type: 'text', nullable: true },
        { name: 'duration', type: 'integer', nullable: true },
        { name: 'views_count', type: 'integer', nullable: false, defaultValue: '0' },
        { name: 'likes_count', type: 'integer', nullable: false, defaultValue: '0' },
        { name: 'is_public', type: 'boolean', nullable: false, defaultValue: 'true' },
      ],
      comments: [
        {
          name: 'video_id',
          type: 'uuid',
          nullable: false,
          isForeignKey: true,
          references: { table: 'videos', column: 'id', onDelete: 'cascade' },
        },
        {
          name: 'parent_id',
          type: 'uuid',
          nullable: true,
          isForeignKey: true,
          references: { table: 'comments', column: 'id', onDelete: 'cascade' },
        },
        { name: 'content', type: 'text', nullable: false },
        { name: 'likes_count', type: 'integer', nullable: false, defaultValue: '0' },
      ],
      likes: [
        {
          name: 'video_id',
          type: 'uuid',
          nullable: false,
          isForeignKey: true,
          references: { table: 'videos', column: 'id', onDelete: 'cascade' },
        },
      ],
      follows: [
        {
          name: 'follower_id',
          type: 'uuid',
          nullable: false,
          isForeignKey: true,
          references: { table: 'auth.users', column: 'id', onDelete: 'cascade' },
        },
        {
          name: 'following_id',
          type: 'uuid',
          nullable: false,
          isForeignKey: true,
          references: { table: 'auth.users', column: 'id', onDelete: 'cascade' },
        },
      ],
      notifications: [
        { name: 'type', type: 'text', nullable: false },
        { name: 'title', type: 'text', nullable: false },
        { name: 'message', type: 'text', nullable: true },
        { name: 'read', type: 'boolean', nullable: false, defaultValue: 'false' },
        { name: 'data', type: 'jsonb', nullable: true, defaultValue: "'{}'::jsonb" },
      ],
      messages: [
        {
          name: 'conversation_id',
          type: 'uuid',
          nullable: false,
          isForeignKey: true,
          references: { table: 'conversations', column: 'id', onDelete: 'cascade' },
        },
        { name: 'content', type: 'text', nullable: false },
        { name: 'read', type: 'boolean', nullable: false, defaultValue: 'false' },
      ],
      conversations: [
        {
          name: 'participant1_id',
          type: 'uuid',
          nullable: false,
          isForeignKey: true,
          references: { table: 'auth.users', column: 'id', onDelete: 'cascade' },
        },
        {
          name: 'participant2_id',
          type: 'uuid',
          nullable: false,
          isForeignKey: true,
          references: { table: 'auth.users', column: 'id', onDelete: 'cascade' },
        },
        { name: 'last_message_at', type: 'timestamptz', nullable: true },
      ],
    };

    return columnPatterns[tableName] || [
      { name: 'data', type: 'jsonb', nullable: false, defaultValue: "'{}'::jsonb" },
    ];
  }

  /**
   * Generates indexes for table
   */
  private generateIndexes(tableName: string, columns: TableColumn[]): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];

    // Always index user_id
    if (columns.some(c => c.name === 'user_id')) {
      indexes.push({
        name: `idx_${tableName}_user_id`,
        columns: ['user_id'],
        type: 'btree',
      });
    }

    // Index foreign keys
    columns.forEach(col => {
      if (col.isForeignKey && col.name !== 'user_id') {
        indexes.push({
          name: `idx_${tableName}_${col.name}`,
          columns: [col.name],
          type: 'btree',
        });
      }
    });

    // Index created_at for sorting
    indexes.push({
      name: `idx_${tableName}_created_at`,
      columns: ['created_at'],
      type: 'btree',
    });

    return indexes;
  }

  /**
   * Generates triggers for table
   */
  private generateTriggers(tableName: string): TriggerDefinition[] {
    return [
      {
        name: `update_${tableName}_updated_at`,
        timing: 'before',
        event: 'update',
        function: 'update_updated_at_column',
      },
    ];
  }

  /**
   * Generates RLS policies for table
   */
  private generateRLSPolicies(tableName: string): RLSPolicy[] {
    return [
      {
        name: `Users can view their own ${tableName}`,
        command: 'select',
        using: 'auth.uid() = user_id',
      },
      {
        name: `Users can insert their own ${tableName}`,
        command: 'insert',
        withCheck: 'auth.uid() = user_id',
      },
      {
        name: `Users can update their own ${tableName}`,
        command: 'update',
        using: 'auth.uid() = user_id',
      },
      {
        name: `Users can delete their own ${tableName}`,
        command: 'delete',
        using: 'auth.uid() = user_id',
      },
    ];
  }

  /**
   * Generates junction tables for many-to-many relationships
   */
  private generateJunctionTables(tables: TableDefinition[]): TableDefinition[] {
    // Placeholder for junction table generation logic
    return [];
  }

  /**
   * Maps relationships between tables
   */
  private mapRelationships(tables: TableDefinition[]): Relationship[] {
    const relationships: Relationship[] = [];

    tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.isForeignKey && column.references) {
          relationships.push({
            fromTable: table.name,
            fromColumn: column.name,
            toTable: column.references.table,
            toColumn: column.references.column,
            type: 'one-to-many',
          });
        }
      });
    });

    return relationships;
  }

  /**
   * Generates SQL for entire schema
   */
  private generateSQL(tables: TableDefinition[], relationships: Relationship[]): string {
    let sql = '-- Generated Database Schema\n\n';

    // Create update_updated_at function
    sql += this.generateUpdateFunction();

    // Create tables
    tables.forEach(table => {
      sql += this.generateTableSQL(table);
    });

    return sql;
  }

  /**
   * Generates SQL for update_updated_at function
   */
  private generateUpdateFunction(): string {
    return `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

`;
  }

  /**
   * Generates SQL for single table
   */
  private generateTableSQL(table: TableDefinition): string {
    let sql = `-- Table: ${table.name}\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.${table.name} (\n`;

    // Columns
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      return def;
    });

    sql += columnDefs.join(',\n');
    sql += '\n);\n\n';

    // Indexes
    table.indexes.forEach(index => {
      sql += `CREATE INDEX IF NOT EXISTS ${index.name} ON public.${table.name} `;
      if (index.unique) sql += 'UNIQUE ';
      sql += `USING ${index.type} (${index.columns.join(', ')});\n`;
    });

    sql += '\n';

    // Triggers
    table.triggers.forEach(trigger => {
      sql += `CREATE TRIGGER ${trigger.name}\n`;
      sql += `${trigger.timing.toUpperCase()} ${trigger.event.toUpperCase()} ON public.${table.name}\n`;
      sql += `FOR EACH ROW EXECUTE FUNCTION ${trigger.function}();\n\n`;
    });

    // RLS
    sql += `ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;\n\n`;

    table.rlsPolicies.forEach(policy => {
      sql += `CREATE POLICY "${policy.name}" ON public.${table.name}\n`;
      sql += `FOR ${policy.command.toUpperCase()}\n`;
      if (policy.using) sql += `USING (${policy.using})\n`;
      if (policy.withCheck) sql += `WITH CHECK (${policy.withCheck})\n`;
      sql += ';\n\n';
    });

    return sql;
  }
}
