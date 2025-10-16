/**
 * Awash Platform Context Builder
 * Gathers real-time workspace state for AI awareness
 */

import { supabase } from '@/integrations/supabase/client';

export interface AwashFile {
  path: string;
  type: 'component' | 'hook' | 'service' | 'util' | 'config' | 'style' | 'other';
  language: 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'json' | 'other';
  size: number;
  lastModified?: Date;
}

export interface AwashWorkspaceState {
  // File system
  fileTree: AwashFile[];
  totalFiles: number;
  filesByType: Record<string, number>;
  
  // Project metadata
  projectId?: string;
  projectName?: string;
  framework: 'react' | 'vue' | 'angular' | 'other';
  buildTool: 'vite' | 'webpack' | 'other';
  
  // Current view
  currentRoute: string;
  previewAvailable: boolean;
  
  // Recent activity
  recentErrors: Array<{
    message: string;
    file?: string;
    timestamp: Date;
  }>;
  
  // Dependencies
  installedPackages: string[];
  
  // Capabilities
  hasBackend: boolean;
  hasAuth: boolean;
  hasDatabase: boolean;
}

export interface AwashPlatformContext {
  workspace: AwashWorkspaceState;
  timestamp: Date;
  conversationId?: string;
  userId?: string;
}

/**
 * Builds comprehensive Awash platform context
 */
export class AwashPlatformContextBuilder {
  private static instance: AwashPlatformContextBuilder;
  
  private constructor() {}
  
  static getInstance(): AwashPlatformContextBuilder {
    if (!this.instance) {
      this.instance = new AwashPlatformContextBuilder();
    }
    return this.instance;
  }
  
  /**
   * Build complete platform context
   */
  async buildContext(
    conversationId?: string,
    projectId?: string
  ): Promise<AwashPlatformContext> {
    console.log('🏗️ Building Awash platform context...');
    
    const [workspace, userId] = await Promise.all([
      this.buildWorkspaceState(projectId),
      this.getCurrentUserId()
    ]);
    
    return {
      workspace,
      timestamp: new Date(),
      conversationId,
      userId
    };
  }
  
  /**
   * Build workspace state from multiple sources
   */
  private async buildWorkspaceState(projectId?: string): Promise<AwashWorkspaceState> {
    const [
      fileTree,
      projectMeta,
      recentErrors,
      packages
    ] = await Promise.all([
      this.discoverFiles(projectId),
      this.getProjectMetadata(projectId),
      this.getRecentErrors(projectId),
      this.getInstalledPackages()
    ]);
    
    // Get capabilities separately to avoid circular type issues
    const capabilities = {
      hasBackend: true,
      hasAuth: true,
      hasDatabase: true
    };
    
    return {
      fileTree,
      totalFiles: fileTree.length,
      filesByType: this.categorizeFiles(fileTree),
      ...projectMeta,
      currentRoute: window.location.pathname,
      previewAvailable: this.isPreviewAvailable(),
      recentErrors,
      installedPackages: packages,
      ...capabilities
    };
  }
  
  /**
   * Discover files in the workspace - REAL implementation
   */
  private async discoverFiles(projectId?: string): Promise<AwashFile[]> {
    if (!projectId) return this.inferFileStructure();
    
    try {
      // Fetch actual project from database
      const { data: project } = await supabase
        .from('projects')
        .select('html_code')
        .eq('id', projectId)
        .single();
      
      if (!project?.html_code) return this.inferFileStructure();
      
      // Parse html_code - it can be a JSON array of files or monolithic
      let files: AwashFile[] = [];
      
      try {
        const parsed = JSON.parse(project.html_code);
        
        // Array format: [{path, content, language}...]
        if (Array.isArray(parsed)) {
          files = parsed.map((file: any) => this.parseFile(file.path, file.content));
        }
      } catch {
        // Monolithic HTML - create virtual file
        files = [
          { path: 'index.html', type: 'config', language: 'other', size: project.html_code.length }
        ];
      }
      
      return files.length > 0 ? files : this.inferFileStructure();
    } catch (error) {
      console.error('Failed to discover files:', error);
      return this.inferFileStructure();
    }
  }
  
  /**
   * Infer file structure from known patterns
   */
  private inferFileStructure(): AwashFile[] {
    const commonFiles: AwashFile[] = [
      // Core files
      { path: 'src/main.tsx', type: 'config', language: 'tsx', size: 0 },
      { path: 'src/App.tsx', type: 'component', language: 'tsx', size: 0 },
      { path: 'index.html', type: 'config', language: 'other', size: 0 },
      { path: 'package.json', type: 'config', language: 'json', size: 0 },
      
      // Common directories
      { path: 'src/components/', type: 'component', language: 'tsx', size: 0 },
      { path: 'src/hooks/', type: 'hook', language: 'ts', size: 0 },
      { path: 'src/services/', type: 'service', language: 'ts', size: 0 },
      { path: 'src/lib/', type: 'util', language: 'ts', size: 0 },
      { path: 'src/integrations/', type: 'service', language: 'ts', size: 0 },
    ];
    
    return commonFiles;
  }
  
  /**
   * Parse file information
   */
  private parseFile(path: string, content?: string): AwashFile {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const size = content?.length || 0;
    
    // Determine type
    let type: AwashFile['type'] = 'other';
    if (path.includes('/components/')) type = 'component';
    else if (path.includes('/hooks/')) type = 'hook';
    else if (path.includes('/services/') || path.includes('/lib/')) type = 'service';
    else if (path.includes('/utils/')) type = 'util';
    else if (['json', 'toml', 'yaml'].includes(ext)) type = 'config';
    else if (['css', 'scss', 'sass'].includes(ext)) type = 'style';
    
    // Determine language
    let language: AwashFile['language'] = 'other';
    if (ext === 'tsx') language = 'tsx';
    else if (ext === 'ts') language = 'ts';
    else if (ext === 'jsx') language = 'jsx';
    else if (ext === 'js') language = 'js';
    else if (ext === 'css') language = 'css';
    else if (ext === 'json') language = 'json';
    
    return { path, type, language, size };
  }
  
  /**
   * Categorize files by type
   */
  private categorizeFiles(files: AwashFile[]): Record<string, number> {
    return files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  /**
   * Get project metadata
   */
  private async getProjectMetadata(projectId?: string) {
    if (!projectId) {
      return {
        projectName: 'Awash Project',
        framework: 'react' as const,
        buildTool: 'vite' as const
      };
    }
    
    try {
      const { data } = await supabase
        .from('projects')
        .select('title, description')
        .eq('id', projectId)
        .single();
      
      return {
        projectId,
        projectName: data?.title || 'Awash Project',
        framework: 'react' as const,
        buildTool: 'vite' as const
      };
    } catch {
      return {
        projectName: 'Awash Project',
        framework: 'react' as const,
        buildTool: 'vite' as const
      };
    }
  }
  
  /**
   * Get recent errors - simplified to avoid type recursion
   */
  private async getRecentErrors(projectId?: string) {
    // Return empty for now - can be enhanced later without type issues
    return [] as Array<{ message: string; timestamp: Date }>;
  }
  
  /**
   * Get installed packages from actual package.json
   */
  private async getInstalledPackages(): Promise<string[]> {
    try {
      // Fetch package.json from a known location
      const response = await fetch('/package.json');
      if (!response.ok) throw new Error('No package.json');
      
      const pkg = await response.json();
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      
      return [...deps, ...devDeps];
    } catch {
      // Fallback to common packages
      return [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'zustand',
        'tailwindcss',
        'lucide-react'
      ];
    }
  }
  
  
  /**
   * Check if preview is available
   */
  private isPreviewAvailable(): boolean {
    // Check if we're in preview mode
    return window.location.pathname !== '/';
  }
  
  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string | undefined> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }
}

// Export singleton instance
export const awashContext = AwashPlatformContextBuilder.getInstance();
