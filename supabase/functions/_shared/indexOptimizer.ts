/**
 * Index Optimizer - Generates optimal database indexes
 * 
 * Analyzes query patterns and generates performance indexes.
 */

export interface IndexRecommendation {
  tableName: string;
  indexName: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export class IndexOptimizer {
  /**
   * Generates index recommendations for tables
   */
  generateIndexRecommendations(tables: any[]): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];

    tables.forEach(table => {
      // Always index foreign keys (high priority)
      table.columns.forEach((column: any) => {
        if (column.isForeignKey && !this.hasIndex(table, column.name)) {
          recommendations.push({
            tableName: table.name,
            indexName: `idx_${table.name}_${column.name}`,
            columns: [column.name],
            indexType: 'btree',
            reason: 'Foreign key should be indexed for join performance',
            priority: 'high',
            estimatedImpact: '50-80% faster joins',
          });
        }
      });

      // Index timestamp columns for sorting
      const timestampColumns = table.columns.filter(
        (col: any) => col.type.includes('timestamp')
      );
      
      timestampColumns.forEach((col: any) => {
        if (!this.hasIndex(table, col.name)) {
          recommendations.push({
            tableName: table.name,
            indexName: `idx_${table.name}_${col.name}`,
            columns: [col.name],
            indexType: 'btree',
            reason: 'Timestamp column used for sorting/filtering',
            priority: 'medium',
            estimatedImpact: '30-50% faster time-based queries',
          });
        }
      });

      // Index boolean columns if table is large
      const booleanColumns = table.columns.filter(
        (col: any) => col.type === 'boolean'
      );
      
      booleanColumns.forEach((col: any) => {
        if (!this.hasIndex(table, col.name)) {
          recommendations.push({
            tableName: table.name,
            indexName: `idx_${table.name}_${col.name}`,
            columns: [col.name],
            indexType: 'btree',
            reason: 'Boolean column for filtering',
            priority: 'low',
            estimatedImpact: '20-30% faster filtered queries',
          });
        }
      });

      // Recommend composite indexes for common query patterns
      if (table.columns.some((c: any) => c.name === 'user_id')) {
        const userIdCol = 'user_id';
        const createdAtCol = table.columns.find((c: any) => c.name === 'created_at');
        
        if (createdAtCol && !this.hasCompositeIndex(table, [userIdCol, 'created_at'])) {
          recommendations.push({
            tableName: table.name,
            indexName: `idx_${table.name}_user_created`,
            columns: [userIdCol, 'created_at'],
            indexType: 'btree',
            reason: 'Common pattern: user\'s items sorted by time',
            priority: 'high',
            estimatedImpact: '60-90% faster user timeline queries',
          });
        }
      }

      // Recommend GIN indexes for JSONB columns
      const jsonbColumns = table.columns.filter((col: any) => col.type === 'jsonb');
      jsonbColumns.forEach((col: any) => {
        if (!this.hasIndex(table, col.name)) {
          recommendations.push({
            tableName: table.name,
            indexName: `idx_${table.name}_${col.name}_gin`,
            columns: [col.name],
            indexType: 'gin',
            reason: 'JSONB column for flexible queries',
            priority: 'medium',
            estimatedImpact: '40-70% faster JSONB queries',
          });
        }
      });

      // Recommend text search indexes
      const textColumns = table.columns.filter(
        (col: any) => col.type === 'text' && ['title', 'description', 'content', 'name'].includes(col.name)
      );
      
      textColumns.forEach((col: any) => {
        recommendations.push({
          tableName: table.name,
          indexName: `idx_${table.name}_${col.name}_search`,
          columns: [col.name],
          indexType: 'gin',
          reason: 'Text search capability',
          priority: 'medium',
          estimatedImpact: '50-80% faster text search',
        });
      });
    });

    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Checks if table has index on column
   */
  private hasIndex(table: any, columnName: string): boolean {
    return table.indexes.some((index: any) =>
      index.columns.includes(columnName) && index.columns.length === 1
    );
  }

  /**
   * Checks if table has composite index
   */
  private hasCompositeIndex(table: any, columns: string[]): boolean {
    return table.indexes.some((index: any) =>
      columns.every(col => index.columns.includes(col))
    );
  }

  /**
   * Prioritizes recommendations by impact
   */
  private prioritizeRecommendations(
    recommendations: IndexRecommendation[]
  ): IndexRecommendation[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    return recommendations.sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generates SQL for index recommendations
   */
  generateIndexSQL(recommendations: IndexRecommendation[]): string {
    let sql = '-- Index Optimizations\n\n';

    recommendations.forEach(rec => {
      sql += `-- ${rec.reason}\n`;
      sql += `-- Priority: ${rec.priority.toUpperCase()} | Impact: ${rec.estimatedImpact}\n`;
      sql += `CREATE INDEX IF NOT EXISTS ${rec.indexName}\n`;
      sql += `ON public.${rec.tableName}\n`;
      sql += `USING ${rec.indexType} (${rec.columns.join(', ')});\n\n`;
    });

    return sql;
  }
}
