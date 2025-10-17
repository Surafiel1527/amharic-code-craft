/**
 * Database Introspector - Agent Self-Awareness Tool
 * 
 * ENTERPRISE PATTERN: Self-Diagnostic Database Access
 * 
 * This tool gives the AI agent the ability to:
 * 1. Query project_files table to verify code exists
 * 2. Check file counts and validate storage
 * 3. Self-diagnose missing files
 * 4. Trigger recovery when issues detected
 * 
 * This is the FOUNDATION of agent self-awareness.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { UniversalErrorDetector } from './universalErrorDetector.ts';

export interface FileVerificationResult {
  exists: boolean;
  fileCount: number;
  filePaths: string[];
  missingFiles: string[];
  storageHealthy: boolean;
  issues: string[];
}

export interface ProjectStorageState {
  projectId: string;
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  lastModified: string | null;
  healthScore: number; // 0-100
}

export class DatabaseIntrospector {
  private errorDetector: UniversalErrorDetector;
  
  constructor(
    private supabase: SupabaseClient,
    private projectId: string,
    private userId?: string
  ) {
    this.errorDetector = new UniversalErrorDetector(supabase, projectId, userId);
  }

  /**
   * TOOL 1: Verify files exist in database
   * The agent can call this to check if its generated files were actually saved
   */
  async verifyFilesExist(expectedFilePaths: string[]): Promise<FileVerificationResult> {
    console.log('🔍 [DatabaseIntrospector] Verifying files exist:', expectedFilePaths);
    
    try {
      // Query project_files table
      const { data: files, error } = await this.supabase
        .from('project_files')
        .select('file_path, file_content, created_at')
        .eq('project_id', this.projectId);

      if (error) {
        console.error('❌ [DatabaseIntrospector] Query error:', error);
        return {
          exists: false,
          fileCount: 0,
          filePaths: [],
          missingFiles: expectedFilePaths,
          storageHealthy: false,
          issues: [`Database query failed: ${error.message}`]
        };
      }

      const existingPaths = new Set((files || []).map(f => f.file_path));
      const missingFiles = expectedFilePaths.filter(path => !existingPaths.has(path));
      
      const result: FileVerificationResult = {
        exists: missingFiles.length === 0,
        fileCount: files?.length || 0,
        filePaths: Array.from(existingPaths),
        missingFiles,
        storageHealthy: missingFiles.length === 0 && (files?.length || 0) > 0,
        issues: []
      };

      // Detect issues
      if (missingFiles.length > 0) {
        result.issues.push(`Missing ${missingFiles.length} expected files: ${missingFiles.join(', ')}`);
      }

      if ((files?.length || 0) === 0 && expectedFilePaths.length > 0) {
        result.issues.push('CRITICAL: No files in database despite generation request');
      }

      // Check for empty content
      const emptyFiles = (files || []).filter(f => !f.file_content || f.file_content.trim() === '');
      if (emptyFiles.length > 0) {
        result.issues.push(`${emptyFiles.length} files have empty content: ${emptyFiles.map(f => f.file_path).join(', ')}`);
        result.storageHealthy = false;
      }

      console.log('✅ [DatabaseIntrospector] Verification complete:', {
        totalFiles: result.fileCount,
        missingCount: result.missingFiles.length,
        healthy: result.storageHealthy,
        issueCount: result.issues.length
      });

      return result;

    } catch (error) {
      console.error('❌ [DatabaseIntrospector] Verification error:', error);
      return {
        exists: false,
        fileCount: 0,
        filePaths: [],
        missingFiles: expectedFilePaths,
        storageHealthy: false,
        issues: [`Verification failed: ${error.message}`]
      };
    }
  }

  /**
   * TOOL 2: Get complete storage state
   * Gives agent full visibility into project storage
   */
  async getProjectStorageState(): Promise<ProjectStorageState> {
    console.log('📊 [DatabaseIntrospector] Getting storage state for project:', this.projectId);

    try {
      const { data: files, error } = await this.supabase
        .from('project_files')
        .select('file_path, file_content, created_at, updated_at')
        .eq('project_id', this.projectId);

      if (error) {
        throw error;
      }

      // Calculate metrics
      const totalFiles = files?.length || 0;
      const totalSize = files?.reduce((sum, f) => sum + (f.file_content?.length || 0), 0) || 0;
      
      // Group by file type
      const filesByType: Record<string, number> = {};
      files?.forEach(f => {
        const ext = f.file_path.split('.').pop()?.toLowerCase() || 'unknown';
        filesByType[ext] = (filesByType[ext] || 0) + 1;
      });

      // Get most recent modification
      const lastModified = files?.reduce((latest, f) => {
        const fileDate = f.updated_at || f.created_at;
        return !latest || fileDate > latest ? fileDate : latest;
      }, null as string | null);

      // Calculate health score
      let healthScore = 100;
      
      // Deduct for empty files
      const emptyFiles = files?.filter(f => !f.file_content || f.file_content.trim() === '').length || 0;
      if (emptyFiles > 0) {
        healthScore -= Math.min(50, emptyFiles * 10);
      }

      // Deduct if no files at all
      if (totalFiles === 0) {
        healthScore = 0;
      }

      // Deduct if missing critical files
      const hasCriticalFiles = files?.some(f => 
        f.file_path.includes('App.tsx') || 
        f.file_path.includes('main.tsx') ||
        f.file_path.includes('index.html')
      );
      if (totalFiles > 0 && !hasCriticalFiles) {
        healthScore -= 30;
      }

      const state: ProjectStorageState = {
        projectId: this.projectId,
        totalFiles,
        totalSize,
        filesByType,
        lastModified,
        healthScore: Math.max(0, healthScore)
      };

      console.log('✅ [DatabaseIntrospector] Storage state:', {
        files: state.totalFiles,
        sizeKB: Math.round(state.totalSize / 1024),
        health: state.healthScore,
        types: Object.keys(state.filesByType)
      });

      return state;

    } catch (error) {
      console.error('❌ [DatabaseIntrospector] Storage state error:', error);
      return {
        projectId: this.projectId,
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        lastModified: null,
        healthScore: 0
      };
    }
  }

  /**
   * TOOL 3: Check specific file content
   * Agent can verify if a file has expected content
   */
  async getFileContent(filePath: string): Promise<{ exists: boolean; content: string | null; size: number }> {
    console.log('📄 [DatabaseIntrospector] Getting file content:', filePath);

    try {
      const { data, error } = await this.supabase
        .from('project_files')
        .select('file_content')
        .eq('project_id', this.projectId)
        .eq('file_path', filePath)
        .maybeSingle();

      if (error) throw error;

      return {
        exists: !!data,
        content: data?.file_content || null,
        size: data?.file_content?.length || 0
      };

    } catch (error) {
      console.error('❌ [DatabaseIntrospector] File content error:', error);
      return {
        exists: false,
        content: null,
        size: 0
      };
    }
  }

  /**
   * TOOL 4: Detect common storage issues
   * Proactive problem detection before user notices
   */
  async detectStorageIssues(): Promise<{
    hasIssues: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log('🔬 [DatabaseIntrospector] Detecting storage issues...');

    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const state = await this.getProjectStorageState();

      // Issue 1: No files at all
      if (state.totalFiles === 0) {
        issues.push('No files found in project_files table');
        recommendations.push('Generate initial project files or verify project ID');
      }

      // Issue 2: Empty files
      const { data: files } = await this.supabase
        .from('project_files')
        .select('file_path, file_content')
        .eq('project_id', this.projectId);

      const emptyFiles = files?.filter(f => !f.file_content || f.file_content.trim() === '') || [];
      if (emptyFiles.length > 0) {
        issues.push(`${emptyFiles.length} files have empty content: ${emptyFiles.map(f => f.file_path).join(', ')}`);
        recommendations.push('Re-generate content for empty files');
      }

      // Issue 3: Missing critical files
      const criticalFiles = ['src/App.tsx', 'src/main.tsx', 'index.html'];
      const existingPaths = new Set(files?.map(f => f.file_path) || []);
      const missingCritical = criticalFiles.filter(path => !existingPaths.has(path));
      
      if (missingCritical.length > 0 && state.totalFiles > 0) {
        issues.push(`Missing critical files: ${missingCritical.join(', ')}`);
        recommendations.push('Generate missing critical application files');
      }

      // Issue 4: Duplicate files
      const pathCounts = new Map<string, number>();
      files?.forEach(f => {
        pathCounts.set(f.file_path, (pathCounts.get(f.file_path) || 0) + 1);
      });
      const duplicates = Array.from(pathCounts.entries()).filter(([_, count]) => count > 1);
      
      if (duplicates.length > 0) {
        issues.push(`Duplicate files detected: ${duplicates.map(([path, count]) => `${path} (${count}x)`).join(', ')}`);
        recommendations.push('Remove duplicate entries from project_files table');
      }

      console.log('✅ [DatabaseIntrospector] Issue detection complete:', {
        issueCount: issues.length,
        hasIssues: issues.length > 0
      });

      return {
        hasIssues: issues.length > 0,
        issues,
        recommendations
      };

    } catch (error) {
      console.error('❌ [DatabaseIntrospector] Issue detection error:', error);
      return {
        hasIssues: true,
        issues: [`Failed to detect issues: ${error.message}`],
        recommendations: ['Check database connection and permissions']
      };
    }
  }

  /**
   * TOOL 5: Get storage architecture information
   * Teaches the agent where files are stored
   */
  getStorageArchitectureInfo(): string {
    return `
╔══════════════════════════════════════════════════════════════╗
║         PROJECT FILE STORAGE ARCHITECTURE                     ║
╚══════════════════════════════════════════════════════════════╝

📁 PRIMARY STORAGE TABLE: project_files

SCHEMA:
  - id: UUID (primary key)
  - project_id: UUID (foreign key to projects)
  - file_path: TEXT (e.g., "src/App.tsx")
  - file_content: TEXT (the actual file code)
  - created_by: UUID (user who created)
  - created_at: TIMESTAMP
  - updated_at: TIMESTAMP

UNIQUE CONSTRAINT:
  - (project_id, file_path) - One file per path per project

HOW FILES ARE STORED:
  1. When code is generated, files are saved to project_files table
  2. Each file has: project_id, file_path, file_content
  3. Files are retrieved by: project_id + file_path

COMMON ISSUES:
  ❌ Files generated but not saved to database
  ❌ Files saved with empty content
  ❌ Wrong project_id used
  ❌ Duplicate file_path entries

VERIFICATION STEPS:
  1. After generation: Query project_files WHERE project_id = ?
  2. Check: Count(*) should match expected file count
  3. Verify: Each file has non-empty file_content
  4. Confirm: All expected file_paths are present

SELF-HEALING:
  - If files missing: Regenerate and save
  - If content empty: Regenerate content
  - If duplicates: Keep most recent, delete others
    `;
  }

  /**
   * TOOL 6: Get generation failure context
   * Query past failures to understand what went wrong
   */
  async getGenerationFailureContext(limit: number = 10): Promise<{
    recentFailures: any[];
    commonErrors: { type: string; count: number; examples: string[] }[];
    hasJsonErrors: boolean;
    totalFailures: number;
    explanation: string;
  }> {
    console.log('🔍 [DatabaseIntrospector] Querying generation failures...');

    try {
      // Query recent failures from detected_errors table (which tracks all errors including generation failures)
      const { data: failures, error } = await this.supabase
        .from('detected_errors')
        .select('*')
        .eq('project_id', this.projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to query failures:', error);
        throw error;
      }

      const recentFailures = failures || [];
      const totalFailures = recentFailures.length;

      // Analyze error patterns
      const errorTypeMap = new Map<string, { count: number; examples: string[] }>();
      let hasJsonErrors = false;

      for (const failure of recentFailures) {
        const errorType = failure.error_type || 'unknown';
        
        if (errorType.toLowerCase().includes('json') || 
            errorType.toLowerCase().includes('parse') ||
            failure.error_message?.toLowerCase().includes('json')) {
          hasJsonErrors = true;
        }

        if (!errorTypeMap.has(errorType)) {
          errorTypeMap.set(errorType, { count: 0, examples: [] });
        }

        const entry = errorTypeMap.get(errorType)!;
        entry.count++;
        if (entry.examples.length < 3 && failure.error_message) {
          entry.examples.push(failure.error_message.substring(0, 150));
        }
      }

      // Convert to array and sort by frequency
      const commonErrors = Array.from(errorTypeMap.entries())
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.count - a.count);

      // Generate explanation
      let explanation = '🔍 FAILURE ANALYSIS:\n\n';
      
      if (totalFailures === 0) {
        explanation += '✅ No recent failures detected. Storage is healthy.';
      } else {
        explanation += `⚠️ Found ${totalFailures} recent failures:\n\n`;
        
        if (hasJsonErrors) {
          explanation += '🚨 JSON ERRORS DETECTED:\n';
          explanation += 'Recent generations failed due to JSON parsing issues.\n';
          explanation += 'This usually means:\n';
          explanation += '  - AI returned malformed JSON\n';
          explanation += '  - Code was accidentally nested in JSON structure\n';
          explanation += '  - Response had formatting issues\n\n';
        }

        explanation += 'TOP ERROR TYPES:\n';
        commonErrors.slice(0, 3).forEach((error, i) => {
          explanation += `${i + 1}. ${error.type}: ${error.count} occurrences\n`;
          if (error.examples.length > 0) {
            explanation += `   Example: ${error.examples[0]}\n`;
          }
        });
      }

      console.log('✅ [DatabaseIntrospector] Failure analysis complete:', {
        totalFailures,
        uniqueErrorTypes: commonErrors.length,
        hasJsonErrors
      });

      return {
        recentFailures,
        commonErrors,
        hasJsonErrors,
        totalFailures,
        explanation
      };

    } catch (error) {
      console.error('❌ [DatabaseIntrospector] Failure analysis error:', error);
      return {
        recentFailures: [],
        commonErrors: [],
        hasJsonErrors: false,
        totalFailures: 0,
        explanation: `❌ Failed to analyze failures: ${error.message}`
      };
    }
  }

  /**
   * TOOL 7: Detect JSON-specific errors
   * Specialized detection for JSON parsing failures
   */
  async detectJsonErrors(): Promise<{
    hasJsonErrors: boolean;
    errorCount: number;
    examples: string[];
    recommendation: string;
  }> {
    console.log('🔬 [DatabaseIntrospector] Scanning for JSON errors...');

    try {
      const { data: jsonErrors, error } = await this.supabase
        .from('detected_errors')
        .select('error_message, created_at, context')
        .eq('project_id', this.projectId)
        .or('error_type.ilike.%json%,error_type.ilike.%parse%,error_message.ilike.%json%')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const hasJsonErrors = (jsonErrors?.length || 0) > 0;
      const examples = jsonErrors?.map(e => e.error_message?.substring(0, 200) || '') || [];

      let recommendation = '';
      if (hasJsonErrors) {
        recommendation = `🔧 JSON ERROR RECOVERY STRATEGY:
1. Regenerate with explicit JSON structure validation
2. Use stricter prompting for JSON output
3. Add JSON schema validation before parsing
4. Consider using tool calling instead of raw JSON
5. Implement retry with adjusted prompts`;
      } else {
        recommendation = '✅ No JSON errors detected';
      }

      console.log('✅ [DatabaseIntrospector] JSON scan complete:', {
        hasJsonErrors,
        errorCount: jsonErrors?.length || 0
      });

      return {
        hasJsonErrors,
        errorCount: jsonErrors?.length || 0,
        examples,
        recommendation
      };

    } catch (error) {
      console.error('❌ [DatabaseIntrospector] JSON scan error:', error);
      return {
        hasJsonErrors: false,
        errorCount: 0,
        examples: [],
        recommendation: `❌ Scan failed: ${error.message}`
      };
    }
  }

  /**
   * TOOL 8: Get recovery suggestions based on failure patterns
   * AI-driven recommendations for how to fix detected issues
   */
  async getRecoverySuggestions(missingFiles: string[], issues: string[]): Promise<{
    suggestions: Array<{
      action: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      reasoning: string;
      steps: string[];
    }>;
    estimatedRecoveryTime: string;
  }> {
    console.log('💡 [DatabaseIntrospector] Generating recovery suggestions...');

    const suggestions = [];

    // Suggestion 1: Regenerate missing files
    if (missingFiles.length > 0) {
      suggestions.push({
        action: 'Regenerate missing files',
        priority: 'critical' as const,
        reasoning: `${missingFiles.length} files were generated but not persisted to database`,
        steps: [
          `Identify why files didn't save: ${missingFiles.join(', ')}`,
          'Re-run code generation with same parameters',
          'Verify database permissions and constraints',
          'Ensure project_id is correct',
          'Check for unique constraint violations'
        ]
      });
    }

    // Suggestion 2: Fix empty content
    const emptyFileIssue = issues.find(i => i.includes('empty content'));
    if (emptyFileIssue) {
      suggestions.push({
        action: 'Regenerate files with empty content',
        priority: 'high' as const,
        reasoning: 'Files exist but have no content - indicates generation failure',
        steps: [
          'Query files with empty content',
          'Regenerate content using AI',
          'Validate content before saving',
          'Update file_content field'
        ]
      });
    }

    // Suggestion 3: Handle duplicates
    const duplicateIssue = issues.find(i => i.includes('Duplicate'));
    if (duplicateIssue) {
      suggestions.push({
        action: 'Remove duplicate files',
        priority: 'medium' as const,
        reasoning: 'Duplicate file_path entries violate unique constraint',
        steps: [
          'Identify duplicates by file_path',
          'Keep most recent version (highest updated_at)',
          'Delete older versions',
          'Verify unique constraint satisfied'
        ]
      });
    }

    // Suggestion 4: Check JSON errors
    const jsonCheck = await this.detectJsonErrors();
    if (jsonCheck.hasJsonErrors) {
      suggestions.push({
        action: 'Fix JSON parsing errors',
        priority: 'critical' as const,
        reasoning: 'JSON errors preventing code generation',
        steps: [
          'Review AI response format',
          'Add JSON validation before parsing',
          'Use tool calling for structured output',
          'Adjust AI prompts for valid JSON',
          'Implement fallback JSON extraction'
        ]
      });
    }

    const estimatedRecoveryTime = suggestions.length === 0 
      ? 'No recovery needed'
      : suggestions.some(s => s.priority === 'critical')
        ? '2-5 minutes'
        : '1-2 minutes';

    console.log('✅ [DatabaseIntrospector] Generated', suggestions.length, 'recovery suggestions');

    return {
      suggestions,
      estimatedRecoveryTime
    };
  }

  /**
   * TOOL 9: Run Universal Error Detection
   * Detects ALL types of errors: runtime, auth, build, edge functions, performance, dependencies, network
   */
  async runUniversalErrorDetection(): Promise<any> {
    console.log('🚀 [DatabaseIntrospector] Running universal error detection...');
    return await this.errorDetector.runUniversalDetection();
  }

  /**
   * TOOL 10: Get Comprehensive Error Context
   * Returns detailed analysis of all error categories for agent decision-making
   */
  async getComprehensiveErrorContext(): Promise<string> {
    const detection = await this.errorDetector.runUniversalDetection();
    
    const lines = [
      '🔍 COMPREHENSIVE ERROR ANALYSIS:',
      '',
      `📊 Total Errors: ${detection.summary.totalErrors}`,
      `🚨 Critical Issues: ${detection.summary.criticalCount}`,
      '',
      '📈 By Category:',
      `  - Runtime Errors: ${detection.summary.categoryCounts.runtime}`,
      `  - Auth/RLS Errors: ${detection.summary.categoryCounts.auth}`,
      `  - Build Errors: ${detection.summary.categoryCounts.build}`,
      `  - Edge Functions: ${detection.summary.categoryCounts.edgeFunctions}`,
      `  - Performance Issues: ${detection.summary.categoryCounts.performance}`,
      `  - Dependencies: ${detection.summary.categoryCounts.dependencies}`,
      `  - Network/API: ${detection.summary.categoryCounts.network}`,
      ''
    ];

    if (detection.allRecommendations.length > 0) {
      lines.push('💡 RECOMMENDED ACTIONS:');
      detection.allRecommendations.forEach((rec, idx) => {
        lines.push(`  ${idx + 1}. ${rec}`);
      });
      lines.push('');
    }

    if (detection.criticalErrors.length > 0) {
      lines.push('🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
      detection.criticalErrors.slice(0, 5).forEach((err, idx) => {
        lines.push(`  ${idx + 1}. [${err.error_type}] ${err.error_message.substring(0, 100)}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}
