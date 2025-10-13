/**
 * Change Applicator
 * Safely applies code changes with validation and backups
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VirtualFileSystem, FileChange } from "./virtualFileSystem.ts";

export class ChangeApplicator {
  private vfs: VirtualFileSystem;

  constructor(
    private supabase: SupabaseClient,
    private projectId: string,
    private userId: string
  ) {
    this.vfs = new VirtualFileSystem(supabase, projectId, userId);
  }

  /**
   * Apply changes safely with validation
   */
  async applyChanges(
    newFiles: Record<string, string>,
    reason: string,
    conversationId?: string
  ): Promise<{ success: boolean; error?: string; appliedFiles: string[] }> {
    try {
      // 1. Get current state
      const currentFiles = await this.vfs.captureProjectState();

      // 2. Create backup
      await this.createBackup(currentFiles, reason);

      // 3. Determine changes
      const changes = this.determineChanges(currentFiles, newFiles);

      // 4. Validate syntax
      const validationErrors = await this.validateSyntax(changes);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Syntax validation failed:\n${validationErrors.join('\n')}`,
          appliedFiles: []
        };
      }

      // 5. Apply changes
      await this.vfs.applyChanges(changes, reason, conversationId);

      // 6. Log successful application
      await this.logApplication(changes, conversationId);

      return {
        success: true,
        appliedFiles: changes.map(c => c.path)
      };
    } catch (error) {
      console.error('Error applying changes:', error);
      return {
        success: false,
        error: error.message,
        appliedFiles: []
      };
    }
  }

  /**
   * Determine what changed
   */
  private determineChanges(
    currentFiles: Record<string, string>,
    newFiles: Record<string, string>
  ): FileChange[] {
    const changes: FileChange[] = [];

    // Check for updates and creates
    for (const [path, newContent] of Object.entries(newFiles)) {
      const oldContent = currentFiles[path];
      
      if (!oldContent) {
        // New file
        changes.push({
          path,
          oldContent: '',
          newContent,
          changeType: 'create'
        });
      } else if (oldContent !== newContent) {
        // Updated file
        changes.push({
          path,
          oldContent,
          newContent,
          changeType: 'update'
        });
      }
    }

    // Check for deletions (empty string indicates delete)
    for (const [path, content] of Object.entries(newFiles)) {
      if (content === '' && currentFiles[path]) {
        changes.push({
          path,
          oldContent: currentFiles[path],
          newContent: '',
          changeType: 'delete'
        });
      }
    }

    return changes;
  }

  /**
   * Validate TypeScript/JavaScript syntax
   */
  private async validateSyntax(changes: FileChange[]): Promise<string[]> {
    const errors: string[] = [];

    for (const change of changes) {
      if (change.changeType === 'delete') continue;
      
      // Basic validation for code files
      if (this.isCodeFile(change.path)) {
        // Check for basic syntax issues
        if (this.hasSyntaxErrors(change.newContent)) {
          errors.push(`${change.path}: Syntax error detected`);
        }
      }
    }

    return errors;
  }

  /**
   * Basic syntax error detection
   */
  private hasSyntaxErrors(content: string): boolean {
    // Check for unmatched braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) return true;

    // Check for unmatched parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) return true;

    // Check for unmatched brackets
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) return true;

    return false;
  }

  /**
   * Create backup before changes
   */
  private async createBackup(
    currentFiles: Record<string, string>,
    reason: string
  ): Promise<void> {
    await this.supabase
      .from('project_backups')
      .insert({
        project_id: this.projectId,
        user_id: this.userId,
        backup_data: currentFiles,
        backup_reason: reason,
        file_count: Object.keys(currentFiles).length
      });
  }

  /**
   * Log successful application
   */
  private async logApplication(
    changes: FileChange[],
    conversationId?: string
  ): Promise<void> {
    // Create learning event
    await this.supabase
      .from('ai_learning_events')
      .insert({
        project_id: this.projectId,
        user_id: this.userId,
        conversation_id: conversationId,
        event_type: 'code_generation',
        success: true,
        context: {
          files_changed: changes.length,
          change_types: changes.map(c => c.changeType)
        }
      });
  }

  /**
   * Rollback to backup
   */
  async rollback(backupId: string): Promise<boolean> {
    try {
      const { data: backup } = await this.supabase
        .from('project_backups')
        .select('backup_data')
        .eq('id', backupId)
        .single();

      if (!backup) {
        throw new Error('Backup not found');
      }

      // Restore files
      const changes = this.determineChanges(
        await this.vfs.captureProjectState(),
        backup.backup_data
      );

      await this.vfs.applyChanges(changes, 'Rollback to backup');

      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(path: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(path);
  }
}
