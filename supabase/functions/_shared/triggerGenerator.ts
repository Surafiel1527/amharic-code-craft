/**
 * Trigger Generator - Generates database triggers
 * 
 * Creates triggers for updated_at, cascading updates, and data integrity.
 */

export interface TriggerDefinition {
  name: string;
  tableName: string;
  timing: 'before' | 'after';
  event: 'insert' | 'update' | 'delete';
  functionName: string;
  functionBody: string;
  description: string;
}

export class TriggerGenerator {
  /**
   * Generates standard triggers for all tables
   */
  generateStandardTriggers(tables: any[]): TriggerDefinition[] {
    const triggers: TriggerDefinition[] = [];

    tables.forEach(table => {
      // Updated_at trigger
      if (table.columns.some((c: any) => c.name === 'updated_at')) {
        triggers.push(this.generateUpdatedAtTrigger(table.name));
      }

      // Soft delete trigger (if has is_deleted column)
      if (table.columns.some((c: any) => c.name === 'is_deleted')) {
        triggers.push(this.generateSoftDeleteTrigger(table.name));
      }

      // Counter update triggers (for likes_count, views_count, etc.)
      const counterColumns = table.columns.filter((c: any) =>
        c.name.endsWith('_count')
      );
      
      counterColumns.forEach((col: any) => {
        const relatedTable = this.guessRelatedTable(col.name);
        if (relatedTable) {
          triggers.push(this.generateCounterTrigger(table.name, col.name, relatedTable));
        }
      });
    });

    return triggers;
  }

  /**
   * Generates updated_at trigger
   */
  private generateUpdatedAtTrigger(tableName: string): TriggerDefinition {
    return {
      name: `update_${tableName}_updated_at`,
      tableName,
      timing: 'before',
      event: 'update',
      functionName: 'update_updated_at_column',
      functionBody: `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
      description: 'Automatically updates updated_at timestamp on row update',
    };
  }

  /**
   * Generates soft delete trigger
   */
  private generateSoftDeleteTrigger(tableName: string): TriggerDefinition {
    return {
      name: `soft_delete_${tableName}`,
      tableName,
      timing: 'before',
      event: 'delete',
      functionName: `soft_delete_${tableName}`,
      functionBody: `
CREATE OR REPLACE FUNCTION soft_delete_${tableName}()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.${tableName}
  SET is_deleted = true, updated_at = now()
  WHERE id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;`,
      description: 'Converts DELETE to UPDATE with is_deleted = true',
    };
  }

  /**
   * Generates counter update trigger
   */
  private generateCounterTrigger(
    tableName: string,
    counterColumn: string,
    relatedTable: string
  ): TriggerDefinition {
    return {
      name: `update_${tableName}_${counterColumn}`,
      tableName: relatedTable,
      timing: 'after',
      event: 'insert',
      functionName: `update_${tableName}_${counterColumn}`,
      functionBody: `
CREATE OR REPLACE FUNCTION update_${tableName}_${counterColumn}()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.${tableName}
  SET ${counterColumn} = ${counterColumn} + 1
  WHERE id = NEW.${tableName.slice(0, -1)}_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
      description: `Increments ${counterColumn} when ${relatedTable} row is added`,
    };
  }

  /**
   * Guesses related table from counter column name
   */
  private guessRelatedTable(columnName: string): string | null {
    // likes_count -> likes
    // comments_count -> comments
    // views_count -> views
    const match = columnName.match(/^(.+)_count$/);
    return match ? match[1] : null;
  }

  /**
   * Generates SQL for all triggers
   */
  generateTriggerSQL(triggers: TriggerDefinition[]): string {
    let sql = '-- Database Triggers\n\n';

    // Generate functions first
    const uniqueFunctions = new Set<string>();
    triggers.forEach(trigger => {
      uniqueFunctions.add(trigger.functionBody);
    });

    uniqueFunctions.forEach(functionBody => {
      sql += functionBody + '\n\n';
    });

    // Generate triggers
    triggers.forEach(trigger => {
      sql += `-- ${trigger.description}\n`;
      sql += `CREATE TRIGGER ${trigger.name}\n`;
      sql += `${trigger.timing.toUpperCase()} ${trigger.event.toUpperCase()}\n`;
      sql += `ON public.${trigger.tableName}\n`;
      sql += `FOR EACH ROW\n`;
      sql += `EXECUTE FUNCTION ${trigger.functionName}();\n\n`;
    });

    return sql;
  }
}
