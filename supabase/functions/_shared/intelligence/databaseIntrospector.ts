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
  constructor(
    private supabase: SupabaseClient,
    private projectId: string
  ) {}

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
}
