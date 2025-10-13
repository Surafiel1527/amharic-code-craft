/**
 * Surgical Editor - Precision line-level code modifications
 * 
 * Implements diff-based editing similar to modern code editors
 */

export interface LineEdit {
  file: string;
  action: 'replace' | 'insert' | 'delete' | 'create';
  startLine?: number; // For replace/delete (1-indexed)
  endLine?: number;   // For replace/delete (inclusive)
  insertAfterLine?: number; // For insert (0 = start of file)
  content: string;
  description: string; // Human-readable explanation
}

export interface SurgicalChange {
  thought: string;
  edits: LineEdit[];
  messageToUser: string;
  requiresConfirmation: boolean;
}

export class SurgicalEditor {
  
  /**
   * Apply surgical edits to existing files
   */
  async applyEdits(
    currentFiles: Record<string, string>,
    edits: LineEdit[]
  ): Promise<Record<string, string>> {
    const updatedFiles = { ...currentFiles };
    
    // Group edits by file
    const editsByFile = this.groupEditsByFile(edits);
    
    for (const [filePath, fileEdits] of Object.entries(editsByFile)) {
      const currentContent = updatedFiles[filePath];
      
      if (!currentContent && !fileEdits.some(e => e.action === 'create')) {
        throw new Error(`File not found: ${filePath}. Cannot apply edits to non-existent file.`);
      }
      
      // Apply edits sequentially (sorted by line number descending to avoid offset issues)
      const sortedEdits = this.sortEditsForApplication(fileEdits);
      let resultContent = currentContent || '';
      
      for (const edit of sortedEdits) {
        resultContent = this.applySingleEdit(resultContent, edit);
      }
      
      updatedFiles[filePath] = resultContent;
    }
    
    return updatedFiles;
  }
  
  /**
   * Group edits by file path
   */
  private groupEditsByFile(edits: LineEdit[]): Record<string, LineEdit[]> {
    const grouped: Record<string, LineEdit[]> = {};
    
    for (const edit of edits) {
      if (!grouped[edit.file]) {
        grouped[edit.file] = [];
      }
      grouped[edit.file].push(edit);
    }
    
    return grouped;
  }
  
  /**
   * Sort edits to prevent line number offset issues
   * Apply from bottom to top (highest line numbers first)
   */
  private sortEditsForApplication(edits: LineEdit[]): LineEdit[] {
    return [...edits].sort((a, b) => {
      // Creates go first
      if (a.action === 'create') return -1;
      if (b.action === 'create') return 1;
      
      // For other edits, sort by line number (descending)
      const aLine = a.startLine || a.insertAfterLine || 0;
      const bLine = b.startLine || b.insertAfterLine || 0;
      return bLine - aLine;
    });
  }
  
  /**
   * Apply a single edit operation
   */
  private applySingleEdit(content: string, edit: LineEdit): string {
    const lines = content.split('\n');
    
    switch (edit.action) {
      case 'create':
        // Create new file
        return edit.content;
      
      case 'replace':
        if (edit.startLine === undefined || edit.endLine === undefined) {
          throw new Error('startLine and endLine required for replace action');
        }
        
        // Validate line numbers
        if (edit.startLine < 1 || edit.startLine > lines.length) {
          throw new Error(`Invalid startLine ${edit.startLine} for file with ${lines.length} lines`);
        }
        if (edit.endLine < edit.startLine || edit.endLine > lines.length) {
          throw new Error(`Invalid endLine ${edit.endLine} (must be >= ${edit.startLine} and <= ${lines.length})`);
        }
        
        // Replace lines (1-indexed to 0-indexed conversion)
        const before = lines.slice(0, edit.startLine - 1);
        const after = lines.slice(edit.endLine);
        const newLines = edit.content.split('\n');
        
        return [...before, ...newLines, ...after].join('\n');
      
      case 'insert':
        if (edit.insertAfterLine === undefined) {
          throw new Error('insertAfterLine required for insert action');
        }
        
        // Validate line number
        if (edit.insertAfterLine < 0 || edit.insertAfterLine > lines.length) {
          throw new Error(`Invalid insertAfterLine ${edit.insertAfterLine} for file with ${lines.length} lines`);
        }
        
        // Insert lines after specified line (0 = beginning)
        const beforeInsert = lines.slice(0, edit.insertAfterLine);
        const afterInsert = lines.slice(edit.insertAfterLine);
        const insertLines = edit.content.split('\n');
        
        return [...beforeInsert, ...insertLines, ...afterInsert].join('\n');
      
      case 'delete':
        if (edit.startLine === undefined || edit.endLine === undefined) {
          throw new Error('startLine and endLine required for delete action');
        }
        
        // Validate line numbers
        if (edit.startLine < 1 || edit.startLine > lines.length) {
          throw new Error(`Invalid startLine ${edit.startLine} for file with ${lines.length} lines`);
        }
        if (edit.endLine < edit.startLine || edit.endLine > lines.length) {
          throw new Error(`Invalid endLine ${edit.endLine}`);
        }
        
        // Delete lines (1-indexed to 0-indexed conversion)
        const beforeDelete = lines.slice(0, edit.startLine - 1);
        const afterDelete = lines.slice(edit.endLine);
        
        return [...beforeDelete, ...afterDelete].join('\n');
      
      default:
        throw new Error(`Unknown edit action: ${(edit as any).action}`);
    }
  }
  
  /**
   * Validate edits before application
   */
  validateEdits(edits: LineEdit[], currentFiles: Record<string, string>): string[] {
    const errors: string[] = [];
    
    for (const edit of edits) {
      // Check if file exists for non-create actions
      if (edit.action !== 'create' && !currentFiles[edit.file]) {
        errors.push(`File ${edit.file} does not exist. Cannot apply ${edit.action} action.`);
        continue;
      }
      
      // Validate line numbers
      if (edit.action === 'replace' || edit.action === 'delete') {
        if (edit.startLine === undefined || edit.endLine === undefined) {
          errors.push(`${edit.action} action requires startLine and endLine`);
          continue;
        }
        
        if (edit.startLine < 1) {
          errors.push(`Invalid startLine ${edit.startLine} (must be >= 1)`);
        }
        
        if (edit.endLine < edit.startLine) {
          errors.push(`Invalid endLine ${edit.endLine} (must be >= startLine ${edit.startLine})`);
        }
        
        // Check against actual file length
        const fileContent = currentFiles[edit.file];
        if (fileContent) {
          const lineCount = fileContent.split('\n').length;
          if (edit.startLine > lineCount) {
            errors.push(`startLine ${edit.startLine} exceeds file length (${lineCount} lines)`);
          }
          if (edit.endLine > lineCount) {
            errors.push(`endLine ${edit.endLine} exceeds file length (${lineCount} lines)`);
          }
        }
      }
      
      if (edit.action === 'insert') {
        if (edit.insertAfterLine === undefined) {
          errors.push('insert action requires insertAfterLine');
          continue;
        }
        
        if (edit.insertAfterLine < 0) {
          errors.push(`Invalid insertAfterLine ${edit.insertAfterLine} (must be >= 0)`);
        }
        
        // Check against actual file length
        const fileContent = currentFiles[edit.file];
        if (fileContent) {
          const lineCount = fileContent.split('\n').length;
          if (edit.insertAfterLine > lineCount) {
            errors.push(`insertAfterLine ${edit.insertAfterLine} exceeds file length (${lineCount} lines)`);
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Generate a diff summary for display
   */
  generateDiffSummary(edits: LineEdit[]): string {
    const summary: string[] = [];
    
    const fileGroups = this.groupEditsByFile(edits);
    
    for (const [filePath, fileEdits] of Object.entries(fileGroups)) {
      summary.push(`\n**${filePath}**`);
      
      for (const edit of fileEdits) {
        const lineInfo = edit.startLine 
          ? `lines ${edit.startLine}-${edit.endLine || edit.startLine}`
          : edit.insertAfterLine !== undefined
          ? `after line ${edit.insertAfterLine}`
          : '';
        
        summary.push(`  - ${edit.action.toUpperCase()} ${lineInfo}: ${edit.description}`);
      }
    }
    
    return summary.join('\n');
  }
}
