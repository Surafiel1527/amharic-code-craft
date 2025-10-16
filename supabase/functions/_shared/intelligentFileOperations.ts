/**
 * Intelligent File Operations System
 * AI-driven file management with version tracking and granular operations
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VirtualFileSystem, FileChange } from "./virtualFileSystem.ts";

export interface FileOperation {
  type: 'create' | 'edit' | 'delete' | 'rename' | 'modify';
  path: string;
  content?: string;
  oldPath?: string; // for rename
  granularity?: 'line' | 'function' | 'file'; // AI decides
  lineRange?: { start: number; end: number }; // for line edits
  reasoning: string; // AI explains why
}

export interface FileVersion {
  version: number;
  timestamp: Date;
  changes: FileChange[];
  userRequest: string;
  aiReasoning: string;
}

export class IntelligentFileOperations {
  private vfs: VirtualFileSystem;
  
  constructor(
    private supabase: SupabaseClient,
    private projectId: string,
    private userId: string
  ) {
    this.vfs = new VirtualFileSystem(supabase, projectId, userId);
  }

  /**
   * Load existing project state for AI context
   */
  async loadProjectContext(): Promise<{
    files: Record<string, string>;
    fileCount: number;
    totalLines: number;
  }> {
    const files = await this.vfs.captureProjectState();
    
    const totalLines = Object.values(files).reduce(
      (sum, content) => sum + content.split('\n').length,
      0
    );
    
    return {
      files,
      fileCount: Object.keys(files).length,
      totalLines
    };
  }

  /**
   * AI analyzes user request and decides what operations to perform
   * Returns intelligent operations with reasoning
   */
  async analyzeOperations(
    userRequest: string,
    aiResponse: any,
    existingFiles: Record<string, string>
  ): Promise<FileOperation[]> {
    const operations: FileOperation[] = [];
    
    // AI has generated new code - intelligently determine what changed
    if (aiResponse.files && Array.isArray(aiResponse.files)) {
      for (const file of aiResponse.files) {
        const filePath = file.path || file.filePath;
        const newContent = file.content || file.code;
        
        if (!filePath || !newContent) continue;
        
        const existingContent = existingFiles[filePath];
        
        if (!existingContent) {
          // New file creation
          operations.push({
            type: 'create',
            path: filePath,
            content: newContent,
            granularity: 'file',
            reasoning: `Creating new file: ${filePath}`
          });
        } else {
          // Existing file - determine granularity
          const granularity = this.determineEditGranularity(
            existingContent,
            newContent,
            userRequest
          );
          
          operations.push({
            type: 'edit',
            path: filePath,
            content: newContent,
            granularity,
            lineRange: granularity === 'line' 
              ? this.findChangedLines(existingContent, newContent)
              : undefined,
            reasoning: `Modifying ${granularity} in ${filePath} based on: \"${userRequest.slice(0, 100)}\"`
          });
        }
      }
    }
    
    // Detect deletions (files in existing but not in new)
    const newFilePaths = new Set(
      (aiResponse.files || []).map((f: any) => f.path || f.filePath)
    );
    
    for (const existingPath of Object.keys(existingFiles)) {
      if (!newFilePaths.has(existingPath)) {
        // Check if user explicitly requested deletion
        if (this.isDeleteIntended(userRequest, existingPath)) {
          operations.push({
            type: 'delete',
            path: existingPath,
            granularity: 'file',
            reasoning: `Deleting ${existingPath} as requested`
          });
        }
      }
    }
    
    return operations;
  }

  /**
   * AI decides granularity based on change scope
   */
  private determineEditGranularity(
    oldContent: string,
    newContent: string,
    userRequest: string
  ): 'line' | 'function' | 'file' {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    // Count changed lines
    let changedLines = 0;
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      if (oldLines[i] !== newLines[i]) {
        changedLines++;
      }
    }
    
    const changePercentage = (changedLines / maxLines) * 100;
    
    // AI decision logic
    if (changePercentage < 5) {
      return 'line'; // Minimal changes
    } else if (changePercentage < 30) {
      return 'function'; // Moderate changes, likely one function
    } else {
      return 'file'; // Substantial rewrite
    }
  }

  /**
   * Find exact line range that changed
   */
  private findChangedLines(
    oldContent: string,
    newContent: string
  ): { start: number; end: number } {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    let start = 0;
    let end = Math.max(oldLines.length, newLines.length);
    
    // Find first changed line
    for (let i = 0; i < Math.min(oldLines.length, newLines.length); i++) {
      if (oldLines[i] !== newLines[i]) {
        start = i + 1; // 1-indexed
        break;
      }
    }
    
    // Find last changed line (from end)
    for (let i = 0; i < Math.min(oldLines.length, newLines.length); i++) {
      const oldIdx = oldLines.length - 1 - i;
      const newIdx = newLines.length - 1 - i;
      if (oldLines[oldIdx] !== newLines[newIdx]) {
        end = Math.max(oldIdx, newIdx) + 1; // 1-indexed
        break;
      }
    }
    
    return { start, end };
  }

  /**
   * Detect if user intended to delete file
   */
  private isDeleteIntended(userRequest: string, filePath: string): boolean {
    const deleteKeywords = [
      'delete',
      'remove',
      'get rid of',
      'eliminate',
      'drop'
    ];
    
    const requestLower = userRequest.toLowerCase();
    const fileNameLower = filePath.toLowerCase();
    
    return deleteKeywords.some(keyword => 
      requestLower.includes(keyword) && 
      requestLower.includes(fileNameLower.split('/').pop() || '')
    );
  }

  /**
   * Apply operations intelligently with version tracking
   */
  async applyOperations(
    operations: FileOperation[],
    userRequest: string,
    conversationId: string
  ): Promise<{ success: boolean; version: number; error?: string }> {
    try {
      // Capture current state for version history
      const currentFiles = await this.vfs.captureProjectState();
      
      // Create version snapshot BEFORE changes
      const version = await this.createVersionSnapshot(
        currentFiles,
        userRequest,
        operations.map(op => op.reasoning).join('\n')
      );
      
      // Convert operations to FileChanges
      const changes: FileChange[] = [];
      
      for (const op of operations) {
        switch (op.type) {
          case 'create':
            changes.push({
              path: op.path,
              oldContent: '',
              newContent: op.content || '',
              changeType: 'create'
            });
            break;
            
          case 'edit':
          case 'modify':
            const oldContent = currentFiles[op.path] || '';
            changes.push({
              path: op.path,
              oldContent,
              newContent: op.content || '',
              changeType: 'update'
            });
            break;
            
          case 'delete':
            changes.push({
              path: op.path,
              oldContent: currentFiles[op.path] || '',
              newContent: '',
              changeType: 'delete'
            });
            break;
            
          case 'rename':
            if (op.oldPath) {
              // Rename = delete old + create new
              changes.push({
                path: op.oldPath,
                oldContent: currentFiles[op.oldPath] || '',
                newContent: '',
                changeType: 'delete'
              });
              changes.push({
                path: op.path,
                oldContent: '',
                newContent: op.content || currentFiles[op.oldPath] || '',
                changeType: 'create'
              });
            }
            break;
        }
      }
      
      // Apply all changes via VirtualFileSystem
      await this.vfs.applyChanges(
        changes,
        userRequest,
        conversationId
      );
      
      console.log('✅ File operations applied successfully', {
        version,
        operationCount: operations.length,
        changes: operations.map(op => `${op.type}: ${op.path} (${op.granularity})`)
      });
      
      return { success: true, version };
      
    } catch (error) {
      console.error('❌ Failed to apply file operations:', error);
      return { 
        success: false, 
        version: 0,
        error: error.message 
      };
    }
  }

  /**
   * Create version snapshot for undo capability
   */
  private async createVersionSnapshot(
    files: Record<string, string>,
    userRequest: string,
    aiReasoning: string
  ): Promise<number> {
    // Get next version number
    const { data: versions } = await this.supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', this.projectId)
      .order('version_number', { ascending: false })
      .limit(1);
    
    const nextVersion = versions && versions.length > 0 
      ? versions[0].version_number + 1 
      : 1;
    
    // Store version
    await this.supabase
      .from('project_versions')
      .insert({
        project_id: this.projectId,
        version_number: nextVersion,
        html_code: JSON.stringify(files),
        changes_summary: `${userRequest} | AI: ${aiReasoning}`,
        created_at: new Date().toISOString()
      });
    
    return nextVersion;
  }

  /**
   * Undo to specific version
   */
  async undoToVersion(version: number): Promise<boolean> {
    try {
      const { data: versionData } = await this.supabase
        .from('project_versions')
        .select('html_code')
        .eq('project_id', this.projectId)
        .eq('version_number', version)
        .single();
      
      if (!versionData) {
        throw new Error(`Version ${version} not found`);
      }
      
      const files = JSON.parse(versionData.html_code);
      
      // Apply version state
      const changes: FileChange[] = Object.entries(files).map(([path, content]) => ({
        path,
        oldContent: '', // Will be fetched by VFS
        newContent: content as string,
        changeType: 'update' as const
      }));
      
      await this.vfs.applyChanges(
        changes,
        `Undo to version ${version}`,
        undefined
      );
      
      return true;
    } catch (error) {
      console.error('Failed to undo:', error);
      return false;
    }
  }
}
