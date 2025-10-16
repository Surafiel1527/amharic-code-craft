/**
 * Virtual File System (VFS)
 * Manages project file access and modifications
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
}

export interface FileChange {
  path: string;
  oldContent: string;
  newContent: string;
  changeType: 'create' | 'update' | 'delete';
}

export class VirtualFileSystem {
  constructor(
    private supabase: SupabaseClient,
    private projectId: string,
    private userId: string
  ) {}

  /**
   * Capture complete project state from database
   */
  async captureProjectState(): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // 1. Get files from project_files table
    const { data: projectFiles } = await this.supabase
      .from('project_files')
      .select('file_path, file_content')  // ✅ Fixed: was 'content', should be 'file_content'
      .eq('project_id', this.projectId)
      .order('file_path');

    if (projectFiles) {
      projectFiles.forEach(file => {
        files[file.file_path] = file.file_content;  // ✅ Fixed: was 'content', should be 'file_content'
      });
    }

    // 2. Get main project code if project_files is empty (legacy support)
    if (Object.keys(files).length === 0) {
      const { data: project } = await this.supabase
        .from('projects')
        .select('html_code, title')  // ✅ Fixed: was 'name', should be 'title'
        .eq('id', this.projectId)
        .single();

      if (project?.html_code) {
        // Parse the monolithic html_code into file structure
        const parsedFiles = this.parseMonolithicCode(project.html_code);
        Object.assign(files, parsedFiles);
      }
    }

    // 3. Get generated code from recent generations
    const { data: generatedCode } = await this.supabase
      .from('generated_code')
      .select('file_path, code')
      .eq('project_id', this.projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (generatedCode) {
      generatedCode.forEach(gen => {
        if (gen.file_path && gen.code && !files[gen.file_path]) {
          files[gen.file_path] = gen.code;
        }
      });
    }

    return files;
  }

  /**
   * Parse monolithic code into separate files
   */
  private parseMonolithicCode(htmlCode: string): Record<string, string> {
    const files: Record<string, string> = {};
    
    // Extract component files
    const componentRegex = /\/\/ File: ([^\n]+)\n([\s\S]*?)(?=\/\/ File:|$)/g;
    let match;
    
    while ((match = componentRegex.exec(htmlCode)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      files[filePath] = content;
    }

    // If no file markers found, treat as single App file
    if (Object.keys(files).length === 0) {
      files['src/App.tsx'] = htmlCode;
    }

    return files;
  }

  /**
   * Apply changes to project files
   */
  async applyChanges(
    changes: FileChange[],
    reason: string,
    conversationId?: string
  ): Promise<void> {
    for (const change of changes) {
      // Update or create in project_files table
      const { error } = await this.supabase
        .from('project_files')
        .upsert({
          project_id: this.projectId,
          created_by: this.userId,
          file_path: change.path,
          file_content: change.newContent,  // ✅ Fixed: was 'content', should be 'file_content'
          last_modified_at: new Date().toISOString()
        }, {
          onConflict: 'project_id,file_path'
        });

      if (error) {
        console.error('Error applying change:', error);
        throw error;
      }

      // Log the change
      await this.supabase
        .from('file_changes')
        .insert({
          project_id: this.projectId,
          user_id: this.userId,
          conversation_id: conversationId,
          file_path: change.path,
          change_type: change.changeType,
          old_content: change.oldContent,
          new_content: change.newContent,
          change_reason: reason
        });
    }

    // Update master context
    await this.updateMasterContext();
  }

  /**
   * Update master system context after changes
   */
  private async updateMasterContext(): Promise<void> {
    const files = await this.captureProjectState();
    
    await this.supabase
      .from('master_system_context')
      .upsert({
        project_id: this.projectId,
        user_id: this.userId,
        current_files: files,
        file_count: Object.keys(files).length,
        total_lines: Object.values(files).reduce(
          (sum, content) => sum + content.split('\n').length, 
          0
        )
      }, {
        onConflict: 'project_id'
      });
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown'
    };
    return languageMap[ext || ''] || 'text';
  }

  /**
   * Get file content
   */
  async getFile(filePath: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('project_files')
      .select('file_content')  // ✅ Fixed: was 'content', should be 'file_content'
      .eq('project_id', this.projectId)
      .eq('file_path', filePath)
      .maybeSingle();

    return data?.file_content || null;  // ✅ Fixed
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    await this.supabase
      .from('project_files')
      .delete()
      .eq('project_id', this.projectId)
      .eq('file_path', filePath);

    await this.updateMasterContext();
  }
}
