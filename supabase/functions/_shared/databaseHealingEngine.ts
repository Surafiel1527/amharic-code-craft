/**
 * DATABASE HEALING ENGINE
 * Automatically fixes RLS policies, schema issues, and database problems
 * Self-healing at the database level
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from './aiHelpers.ts';

export interface DatabaseIssue {
  type: 'rls_policy' | 'missing_table' | 'missing_column' | 'foreign_key' | 'index' | 'trigger';
  severity: 'critical' | 'high' | 'medium' | 'low';
  table?: string;
  description: string;
  autoFixable: boolean;
}

export interface HealingResult {
  success: boolean;
  issuesFound: number;
  issuesFixed: number;
  fixes: Array<{
    issue: string;
    sql: string;
    applied: boolean;
  }>;
  remainingIssues: DatabaseIssue[];
}

/**
 * Scan database for issues
 */
export async function scanDatabase(
  supabase: SupabaseClient
): Promise<DatabaseIssue[]> {
  
  console.log('🔍 Scanning database for issues...');
  const issues: DatabaseIssue[] = [];

  try {
    // Get all tables in public schema
    const { data: tables } = await supabase.rpc('execute_migration', {
      migration_sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `
    });

    if (!tables || !tables.success) {
      console.error('Failed to fetch tables');
      return issues;
    }

    // Check RLS policies for each table
    for (const table of (tables as any).data || []) {
      const rlsIssues = await checkRLSPolicies(supabase, table.table_name);
      issues.push(...rlsIssues);
    }

    // Check for missing indexes on foreign keys
    const indexIssues = await checkMissingIndexes(supabase);
    issues.push(...indexIssues);

    console.log(`✅ Scan complete: found ${issues.length} issues`);

  } catch (error) {
    console.error('Database scan error:', error);
  }

  return issues;
}

/**
 * Check RLS policies for a table
 */
async function checkRLSPolicies(
  supabase: SupabaseClient,
  tableName: string
): Promise<DatabaseIssue[]> {
  const issues: DatabaseIssue[] = [];

  try {
    // Check if RLS is enabled
    const { data: rlsEnabled } = await supabase.rpc('execute_migration', {
      migration_sql: `
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = '${tableName}' 
        AND relnamespace = 'public'::regnamespace
      `
    });

    if (!rlsEnabled || !(rlsEnabled as any).success) {
      return issues;
    }

    const isEnabled = (rlsEnabled as any).data?.[0]?.relrowsecurity;

    if (!isEnabled) {
      issues.push({
        type: 'rls_policy',
        severity: 'critical',
        table: tableName,
        description: `Table ${tableName} does not have RLS enabled`,
        autoFixable: true
      });
    }

    // Check for policies
    const { data: policies } = await supabase.rpc('execute_migration', {
      migration_sql: `
        SELECT COUNT(*) as policy_count
        FROM pg_policies
        WHERE tablename = '${tableName}'
      `
    });

    if (policies && (policies as any).success) {
      const count = (policies as any).data?.[0]?.policy_count || 0;
      
      if (count === 0 && isEnabled) {
        issues.push({
          type: 'rls_policy',
          severity: 'critical',
          table: tableName,
          description: `Table ${tableName} has RLS enabled but no policies defined`,
          autoFixable: true
        });
      }
    }

  } catch (error) {
    console.error(`Error checking RLS for ${tableName}:`, error);
  }

  return issues;
}

/**
 * Check for missing indexes
 */
async function checkMissingIndexes(
  supabase: SupabaseClient
): Promise<DatabaseIssue[]> {
  const issues: DatabaseIssue[] = [];

  try {
    // Find foreign keys without indexes
    const { data: result } = await supabase.rpc('execute_migration', {
      migration_sql: `
        SELECT 
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = tc.table_name
          AND indexdef LIKE '%' || kcu.column_name || '%'
        )
      `
    });

    if (result && (result as any).success) {
      for (const row of (result as any).data || []) {
        issues.push({
          type: 'index',
          severity: 'medium',
          table: row.table_name,
          description: `Missing index on foreign key ${row.table_name}.${row.column_name}`,
          autoFixable: true
        });
      }
    }

  } catch (error) {
    console.error('Error checking indexes:', error);
  }

  return issues;
}

/**
 * Automatically heal database issues
 */
export async function healDatabase(
  supabase: SupabaseClient,
  issues: DatabaseIssue[]
): Promise<HealingResult> {
  
  console.log(`🔧 Healing ${issues.length} database issues...`);

  const result: HealingResult = {
    success: false,
    issuesFound: issues.length,
    issuesFixed: 0,
    fixes: [],
    remainingIssues: []
  };

  for (const issue of issues) {
    if (!issue.autoFixable) {
      result.remainingIssues.push(issue);
      continue;
    }

    try {
      const fix = await generateFix(supabase, issue);
      
      if (fix.sql) {
        console.log(`Applying fix for: ${issue.description}`);
        
        const { data: executed } = await supabase.rpc('execute_migration', {
          migration_sql: fix.sql
        });

        const applied = executed && (executed as any).success;

        result.fixes.push({
          issue: issue.description,
          sql: fix.sql,
          applied: applied || false
        });

        if (applied) {
          result.issuesFixed++;
        } else {
          result.remainingIssues.push(issue);
        }
      }

    } catch (error) {
      console.error(`Failed to fix issue: ${issue.description}`, error);
      result.remainingIssues.push(issue);
    }
  }

  result.success = result.issuesFixed === result.issuesFound;
  console.log(`✅ Healed ${result.issuesFixed}/${result.issuesFound} issues`);

  return result;
}

/**
 * Generate SQL fix for an issue using AI
 */
async function generateFix(
  supabase: SupabaseClient,
  issue: DatabaseIssue
): Promise<{ sql: string }> {
  
  // Try deterministic fixes first
  const deterministicFix = getDeterministicFix(issue);
  if (deterministicFix) {
    return { sql: deterministicFix };
  }

  // Use AI for complex fixes
  const prompt = `Generate SQL to fix this database issue:

ISSUE TYPE: ${issue.type}
SEVERITY: ${issue.severity}
TABLE: ${issue.table || 'N/A'}
DESCRIPTION: ${issue.description}

Generate PostgreSQL SQL that:
1. Fixes the issue completely
2. Is safe to execute
3. Includes proper error handling
4. Follows PostgreSQL best practices

Return ONLY the SQL, no explanations.`;

  try {
    const response = await callAIWithFallback(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: 'You are a PostgreSQL expert. Generate safe, production-ready SQL fixes.',
        preferredModel: 'google/gemini-2.5-flash',
        maxTokens: 1000
      }
    );

    let sql = response.data.choices[0].message.content;
    
    // Extract SQL from markdown
    const sqlMatch = sql.match(/```sql\n([\s\S]*?)```/);
    if (sqlMatch) {
      sql = sqlMatch[1];
    }

    return { sql: sql.trim() };

  } catch (error) {
    console.error('AI fix generation failed:', error);
    return { sql: '' };
  }
}

/**
 * Get deterministic fix for common issues
 */
function getDeterministicFix(issue: DatabaseIssue): string | null {
  switch (issue.type) {
    case 'rls_policy':
      if (issue.description.includes('does not have RLS enabled')) {
        return `ALTER TABLE public.${issue.table} ENABLE ROW LEVEL SECURITY;`;
      }
      if (issue.description.includes('no policies defined')) {
        return `
-- Basic RLS policy for ${issue.table}
CREATE POLICY "Users can manage their own data" 
ON public.${issue.table}
FOR ALL 
USING (auth.uid() = user_id);
        `.trim();
      }
      break;

    case 'index':
      const match = issue.description.match(/Missing index on foreign key (\w+)\.(\w+)/);
      if (match) {
        const [, table, column] = match;
        return `CREATE INDEX IF NOT EXISTS idx_${table}_${column} ON public.${table}(${column});`;
      }
      break;
  }

  return null;
}

/**
 * Monitor database health continuously
 */
export async function monitorDatabaseHealth(
  supabase: SupabaseClient,
  intervalMs: number = 60000 // Check every minute
): Promise<void> {
  
  console.log('🏥 Starting database health monitoring...');

  const check = async () => {
    const issues = await scanDatabase(supabase);
    
    if (issues.length > 0) {
      console.log(`⚠️ Found ${issues.length} database issues`);
      
      const critical = issues.filter(i => i.severity === 'critical');
      if (critical.length > 0) {
        console.log(`🚨 ${critical.length} CRITICAL issues - auto-healing...`);
        await healDatabase(supabase, critical);
      }
    } else {
      console.log('✅ Database health: OK');
    }
  };

  // Initial check
  await check();

  // Periodic checks
  setInterval(check, intervalMs);
}
