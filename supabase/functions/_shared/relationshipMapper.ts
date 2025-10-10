/**
 * Relationship Mapper - Maps and validates table relationships
 * 
 * Handles foreign keys, many-to-many relationships, and referential integrity.
 */

export interface ForeignKey {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: 'cascade' | 'set null' | 'restrict' | 'no action';
  onUpdate: 'cascade' | 'set null' | 'restrict' | 'no action';
}

export interface ManyToManyRelationship {
  table1: string;
  table2: string;
  junctionTable: string;
  table1Column: string;
  table2Column: string;
}

export interface RelationshipMap {
  foreignKeys: ForeignKey[];
  manyToMany: ManyToManyRelationship[];
  warnings: string[];
}

export class RelationshipMapper {
  /**
   * Maps all relationships in a schema
   */
  mapRelationships(tables: any[]): RelationshipMap {
    const foreignKeys: ForeignKey[] = [];
    const manyToMany: ManyToManyRelationship[] = [];
    const warnings: string[] = [];

    // Extract foreign keys
    tables.forEach(table => {
      table.columns.forEach((column: any) => {
        if (column.isForeignKey && column.references) {
          foreignKeys.push({
            fromTable: table.name,
            fromColumn: column.name,
            toTable: column.references.table,
            toColumn: column.references.column,
            onDelete: column.references.onDelete || 'cascade',
            onUpdate: 'cascade',
          });
        }
      });
    });

    // Detect many-to-many junction tables
    const junctionTables = this.detectJunctionTables(tables, foreignKeys);
    manyToMany.push(...junctionTables);

    // Validate relationships
    const validationWarnings = this.validateRelationships(tables, foreignKeys);
    warnings.push(...validationWarnings);

    return {
      foreignKeys,
      manyToMany,
      warnings,
    };
  }

  /**
   * Detects junction tables for many-to-many relationships
   */
  private detectJunctionTables(
    tables: any[],
    foreignKeys: ForeignKey[]
  ): ManyToManyRelationship[] {
    const manyToMany: ManyToManyRelationship[] = [];

    tables.forEach(table => {
      // Junction tables typically have exactly 2 foreign keys and minimal other columns
      const tableForeignKeys = foreignKeys.filter(fk => fk.fromTable === table.name);
      
      if (tableForeignKeys.length === 2 && table.columns.length <= 5) {
        const fk1 = tableForeignKeys[0];
        const fk2 = tableForeignKeys[1];

        manyToMany.push({
          table1: fk1.toTable,
          table2: fk2.toTable,
          junctionTable: table.name,
          table1Column: fk1.fromColumn,
          table2Column: fk2.fromColumn,
        });
      }
    });

    return manyToMany;
  }

  /**
   * Validates relationships for common issues
   */
  private validateRelationships(tables: any[], foreignKeys: ForeignKey[]): string[] {
    const warnings: string[] = [];

    // Check for orphaned foreign keys
    foreignKeys.forEach(fk => {
      const referencedTableExists = tables.some(t => t.name === fk.toTable);
      if (!referencedTableExists) {
        warnings.push(
          `Foreign key in ${fk.fromTable}.${fk.fromColumn} references non-existent table ${fk.toTable}`
        );
      }
    });

    // Check for missing indexes on foreign keys
    tables.forEach(table => {
      const tableForeignKeys = foreignKeys.filter(fk => fk.fromTable === table.name);
      
      tableForeignKeys.forEach(fk => {
        const hasIndex = table.indexes.some((index: any) =>
          index.columns.includes(fk.fromColumn)
        );
        
        if (!hasIndex) {
          warnings.push(
            `Missing index on foreign key ${table.name}.${fk.fromColumn}`
          );
        }
      });
    });

    // Check for circular references
    const circular = this.detectCircularReferences(foreignKeys);
    if (circular.length > 0) {
      warnings.push(`Circular reference detected: ${circular.join(' -> ')}`);
    }

    return warnings;
  }

  /**
   * Detects circular foreign key references
   */
  private detectCircularReferences(foreignKeys: ForeignKey[]): string[] {
    const graph = new Map<string, string[]>();

    // Build dependency graph
    foreignKeys.forEach(fk => {
      if (!graph.has(fk.fromTable)) {
        graph.set(fk.fromTable, []);
      }
      graph.get(fk.fromTable)!.push(fk.toTable);
    });

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycle: string[] = [];

    const dfs = (table: string, path: string[]): boolean => {
      if (recursionStack.has(table)) {
        const cycleStart = path.indexOf(table);
        cycle.push(...path.slice(cycleStart), table);
        return true;
      }

      if (visited.has(table)) return false;

      visited.add(table);
      recursionStack.add(table);

      const dependencies = graph.get(table) || [];
      for (const dep of dependencies) {
        if (dfs(dep, [...path, table])) {
          return true;
        }
      }

      recursionStack.delete(table);
      return false;
    };

    for (const table of graph.keys()) {
      if (!visited.has(table)) {
        if (dfs(table, [])) {
          break;
        }
      }
    }

    return cycle;
  }

  /**
   * Generates SQL for foreign key constraints
   */
  generateForeignKeySQL(foreignKeys: ForeignKey[]): string {
    let sql = '-- Foreign Key Constraints\n\n';

    foreignKeys.forEach(fk => {
      const constraintName = `fk_${fk.fromTable}_${fk.fromColumn}`;
      sql += `ALTER TABLE public.${fk.fromTable}\n`;
      sql += `  ADD CONSTRAINT ${constraintName}\n`;
      sql += `  FOREIGN KEY (${fk.fromColumn})\n`;
      sql += `  REFERENCES ${fk.toTable}(${fk.toColumn})\n`;
      sql += `  ON DELETE ${fk.onDelete.toUpperCase().replace(' ', ' ')}\n`;
      sql += `  ON UPDATE ${fk.onUpdate.toUpperCase().replace(' ', ' ')};\n\n`;
    });

    return sql;
  }

  /**
   * Generates SQL for junction tables
   */
  generateJunctionTableSQL(manyToMany: ManyToManyRelationship[]): string {
    let sql = '-- Junction Tables for Many-to-Many Relationships\n\n';

    manyToMany.forEach(rel => {
      sql += `-- Junction table already exists: ${rel.junctionTable}\n`;
      sql += `-- Links ${rel.table1} <-> ${rel.table2}\n\n`;
    });

    return sql;
  }
}
