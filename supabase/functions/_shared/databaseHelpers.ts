/**
 * Database Operations and Auto-Healing
 * Centralized database utilities for mega-mind-orchestrator
 */

import { createLogger, type LogContext } from './logger.ts';

/**
 * Auto-heals common database errors
 */
export async function autoHealDatabaseError(
  userSupabase: any,
  errorMessage: string,
  originalSql: string,
  logContext?: LogContext
): Promise<boolean> {
  const logger = createLogger(logContext);
  logger.info('Auto-healing database error', { errorMessage });
  
  try {
    // Pattern 1: Missing UUID extension
    if (errorMessage.includes('uuid_generate_v4') || errorMessage.includes('function uuid_generate_v4() does not exist')) {
      logger.info('Detected: Missing uuid-ossp extension');
      const fixSql = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;`;
      
      const { error } = await userSupabase.rpc('execute_migration', { migration_sql: fixSql });
      if (!error) {
        logger.success('Enabled uuid-ossp extension');
        return true;
      }
    }
    
    // Pattern 2: Missing other common extensions
    if (errorMessage.includes('extension') && errorMessage.includes('does not exist')) {
      const extensionMatch = errorMessage.match(/"([^"]+)"\s+extension/i) || errorMessage.match(/extension\s+"([^"]+)"/i);
      if (extensionMatch) {
        const extension = extensionMatch[1];
        logger.info('Detected: Missing extension', { extension });
        const fixSql = `CREATE EXTENSION IF NOT EXISTS "${extension}" SCHEMA extensions;`;
        
        const { error } = await userSupabase.rpc('execute_migration', { migration_sql: fixSql });
        if (!error) {
          logger.success('Enabled extension', { extension });
          return true;
        }
      }
    }
    
    // Pattern 3: Missing schema
    if (errorMessage.includes('schema') && errorMessage.includes('does not exist')) {
      const schemaMatch = errorMessage.match(/schema\s+"([^"]+)"/i);
      if (schemaMatch) {
        const schema = schemaMatch[1];
        if (schema !== 'auth' && schema !== 'storage') {
          logger.info('Detected: Missing schema', { schema });
          const fixSql = `CREATE SCHEMA IF NOT EXISTS ${schema};`;
          
          const { error } = await userSupabase.rpc('execute_migration', { migration_sql: fixSql });
          if (!error) {
            logger.success('Created schema', { schema });
            return true;
          }
        }
      }
    }
    
    logger.warn('No auto-fix available for this error');
    return false;
  } catch (err) {
    logger.error('Auto-heal failed', err);
    return false;
  }
}

/**
 * Setup database tables with RLS policies
 */
export async function setupDatabaseTables(
  analysis: any, 
  userId: string, 
  broadcast: any, 
  userSupabaseClient: any, 
  platformSupabaseClient: any,
  logContext?: LogContext
): Promise<void> {
  const logger = createLogger(logContext);
  const { backendRequirements } = analysis;
  
  if (!backendRequirements?.needsDatabase || !backendRequirements.databaseTables?.length) {
    logger.info('No database tables needed');
    return;
  }

  await broadcast('generation:database', { 
    status: 'creating', 
    message: `Setting up ${backendRequirements.databaseTables.length} database tables...`, 
    progress: 25 
  });

  try {
    const sqlStatements: string[] = [];
    
    for (const table of backendRequirements.databaseTables) {
      logger.info('Creating table', { tableName: table.name });
      
      if (!table.fields || !Array.isArray(table.fields) || table.fields.length === 0) {
        logger.error('Invalid table structure: no fields', undefined, { tableName: table.name });
        continue;
      }
      
      // Build field definitions
      const fieldDefinitions = table.fields.map((field: any) => {
        let sql = field.name + ' ' + field.type;
        if (field.primaryKey) sql += ' primary key';
        if (field.unique) sql += ' unique';
        if (field.nullable === false) sql += ' not null';
        if (field.references) sql += ` references ${field.references} on delete cascade`;
        if (field.default) sql += ` default ${field.default}`;
        return sql;
      }).join(',\n  ');

      const userRefField = table.fields.find((f: any) => f.isUserReference === true);
      
      // Create table SQL
      sqlStatements.push(`
CREATE TABLE IF NOT EXISTS public.${table.name} (
  ${fieldDefinitions}
);

ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;
      `.trim());

      // Create RLS policies
      if (userRefField) {
        sqlStatements.push(`
CREATE POLICY "${table.name}_select_policy" ON public.${table.name}
  FOR SELECT USING (auth.uid() = ${userRefField.name});

CREATE POLICY "${table.name}_insert_policy" ON public.${table.name}
  FOR INSERT WITH CHECK (auth.uid() = ${userRefField.name});

CREATE POLICY "${table.name}_update_policy" ON public.${table.name}
  FOR UPDATE USING (auth.uid() = ${userRefField.name});

CREATE POLICY "${table.name}_delete_policy" ON public.${table.name}
  FOR DELETE USING (auth.uid() = ${userRefField.name});
        `.trim());
      } else {
        sqlStatements.push(`
CREATE POLICY "${table.name}_authenticated_policy" ON public.${table.name}
  FOR ALL USING (auth.role() = 'authenticated');
        `.trim());
      }
    }

    if (sqlStatements.length === 0) {
      logger.warn('No valid SQL statements generated');
      await broadcast('generation:database', { 
        status: 'error', 
        message: 'Failed to generate valid database schema', 
        progress: 30 
      });
      return;
    }

    const fullSQL = sqlStatements.join('\n\n');
    logger.info('Generated SQL for database setup', { statementCount: sqlStatements.length });
    
    // Execute migration
    let { data: execResult, error: execError } = await userSupabaseClient
      .rpc('execute_migration', { migration_sql: fullSQL });

    if (execError || !execResult?.success) {
      const errorMsg = execError?.message || execResult?.error || 'Unknown error';
      logger.error('Failed to execute migration', execError, { errorMsg });
      
      // Try auto-healing
      logger.info('Attempting auto-heal for database error...');
      const healed = await autoHealDatabaseError(userSupabaseClient, errorMsg, fullSQL, logContext);
      
      if (healed) {
        logger.success('Auto-healed! Retrying migration...');
        ({ data: execResult, error: execError } = await userSupabaseClient
          .rpc('execute_migration', { migration_sql: fullSQL }));
        
        if (!execError && execResult?.success) {
          logger.success('Migration successful after auto-healing!');
          await broadcast('generation:database', { 
            status: 'success', 
            message: '✅ Database setup complete (auto-fixed)', 
            progress: 35 
          });
          
          await platformSupabaseClient.from('build_events').insert({
            user_id: userId,
            event_type: 'auto_heal_success',
            status: 'success',
            title: 'Auto-fixed database issue',
            details: { error: errorMsg, solution: 'automatic' },
            motivation_message: '🎉 Platform automatically fixed a database issue!'
          });
          
          execError = null;
        }
      }
      
      if (execError || !execResult?.success) {
        await broadcast('generation:database', { 
          status: 'error', 
          message: 'Database setup failed - check migrations', 
          progress: 30 
        });
        
        await platformSupabaseClient.from('generated_migrations').insert({
          user_id: userId,
          project_context: analysis.mainGoal,
          migration_sql: fullSQL,
          table_count: backendRequirements.databaseTables.length,
          status: 'failed',
          error_message: execError?.message || execResult?.error
        });
        
        return;
      }
    }
    
    logger.success('Tables created successfully!', { tableCount: backendRequirements.databaseTables.length });
    
    await platformSupabaseClient.from('generated_migrations').insert({
      user_id: userId,
      project_context: analysis.mainGoal,
      migration_sql: fullSQL,
      table_count: backendRequirements.databaseTables.length,
      status: 'executed'
    });
    
    await broadcast('generation:database', { 
      status: 'complete', 
      message: `✅ Created ${backendRequirements.databaseTables.length} tables with RLS policies`, 
      progress: 35
    });
  } catch (error) {
    logger.error('Database setup failed', error);
    await broadcast('generation:database', { 
      status: 'warning', 
      message: 'Database setup encountered issues', 
      progress: 30 
    });
  }
}

/**
 * Ensure authentication infrastructure is set up
 */
export async function ensureAuthInfrastructure(supabaseClient: any, logContext?: LogContext): Promise<void> {
  const logger = createLogger(logContext);
  try {
    const profilesTableSql = `
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
    `.trim();

    const { error } = await supabaseClient.rpc('execute_migration', { migration_sql: profilesTableSql });
    
    if (error) {
      logger.warn('Profiles table setup warning', { error: error.message });
    } else {
      logger.success('Profiles table ensured');
    }
  } catch (err) {
    logger.warn('Auth infrastructure setup skipped', err);
  }
}
