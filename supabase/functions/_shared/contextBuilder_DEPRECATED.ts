/**
 * Context Builder
 * Creates rich project context for Master System Prompt
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VirtualFileSystem } from "./virtualFileSystem.ts";
import { UnifiedCodebaseAnalyzer } from "./unifiedCodebaseAnalyzer.ts";

export interface RichProjectContext {
  currentFiles: Record<string, string>;
  discoveredFunctions: any[];
  discoveredComponents: any[];
  projectMetadata: {
    framework: string;
    dependencies: string[];
    totalFiles: number;
    totalLines: number;
  };
  recentChanges: any[];
  conversationHistory: any[];
  learnedPatterns: any[];
  validationResults?: any;
}

export class ContextBuilder {
  private vfs: VirtualFileSystem;
  private analyzer: UnifiedCodebaseAnalyzer;

  constructor(
    private supabase: SupabaseClient,
    private projectId: string,
    private userId: string,
    private conversationId?: string
  ) {
    this.vfs = new VirtualFileSystem(supabase, projectId, userId);
    this.analyzer = new UnifiedCodebaseAnalyzer();
  }

  /**
   * Build complete rich context
   */
  async buildRichContext(): Promise<RichProjectContext> {
    // 1. Get current files
    const currentFiles = await this.vfs.captureProjectState();

    // 2. Analyze codebase structure
    const structure = await this.analyzer.analyzeCodebase(
      'Context building',
      {},
      { projectId: this.projectId, conversationId: this.conversationId },
      this.supabase
    );

    // 3. Get project metadata
    const projectMetadata = await this.getProjectMetadata(currentFiles);

    // 4. Get recent changes
    const recentChanges = await this.getRecentChanges();

    // 5. Get conversation history
    const conversationHistory = await this.getConversationHistory();

    // 6. Get learned patterns
    const learnedPatterns = await this.getLearnedPatterns();

    return {
      currentFiles,
      discoveredFunctions: structure.relevantFiles.flatMap(f => f.functions),
      discoveredComponents: structure.relevantFiles.flatMap(f => f.components),
      projectMetadata,
      recentChanges,
      conversationHistory,
      learnedPatterns
    };
  }

  /**
   * Get project metadata
   */
  private async getProjectMetadata(files: Record<string, string>): Promise<any> {
    // Get project info
    const { data: project } = await this.supabase
      .from('projects')
      .select('name, framework')
      .eq('id', this.projectId)
      .single();

    // Parse package.json if exists
    let dependencies: string[] = [];
    const packageJson = files['package.json'];
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        dependencies = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {})
        ];
      } catch (e) {
        console.error('Failed to parse package.json:', e);
      }
    }

    // Calculate stats
    const totalLines = Object.values(files).reduce(
      (sum, content) => sum + content.split('\n').length,
      0
    );

    return {
      framework: project?.framework || 'react',
      dependencies,
      totalFiles: Object.keys(files).length,
      totalLines
    };
  }

  /**
   * Get recent file changes
   */
  private async getRecentChanges(): Promise<any[]> {
    const { data } = await this.supabase
      .from('file_changes')
      .select('*')
      .eq('project_id', this.projectId)
      .order('changed_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(): Promise<any[]> {
    if (!this.conversationId) return [];

    const { data } = await this.supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', this.conversationId)
      .order('created_at', { ascending: false })
      .limit(20);

    return data || [];
  }

  /**
   * Get learned patterns from Phase 4
   */
  private async getLearnedPatterns(): Promise<any[]> {
    // Get patterns from Phase 4 learning systems
    const { data: patterns } = await this.supabase
      .from('ai_knowledge_base')
      .select('pattern_name, category, best_approach, confidence_score')
      .gte('confidence_score', 0.7)
      .order('confidence_score', { ascending: false })
      .limit(20);

    // Get user-specific learnings
    const { data: userPatterns } = await this.supabase
      .from('code_review_learnings')
      .select('pattern_type, pattern_description, confidence_score')
      .eq('user_id', this.userId)
      .gte('acceptance_rate', 70)
      .order('confidence_score', { ascending: false })
      .limit(10);

    return [
      ...(patterns || []),
      ...(userPatterns || [])
    ];
  }

  /**
   * Get validation results
   */
  async getValidationResults(): Promise<any> {
    const { data } = await this.supabase
      .from('code_analysis')
      .select('*')
      .eq('project_id', this.projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  }
}
