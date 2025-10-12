/**
 * File Dependency Analysis
 * Tracks relationships between files for intelligent code modifications
 */

// Uses existing component_dependencies table
export interface FileInfo {
  component_name: string;
  component_type: string;
  depends_on: any;
  used_by: any;
  complexity_score: number;
  criticality: string;
}

/**
 * Load file dependencies from existing component_dependencies table
 */
export async function loadFileDependencies(
  supabase: any,
  conversationId: string
): Promise<FileInfo[]> {
  // Gracefully handle undefined/null conversationId
  if (!conversationId || !supabase) {
    console.warn('⚠️ No conversationId or supabase client, returning empty dependencies');
    return [];
  }

  const { data: deps, error } = await supabase
    .from('component_dependencies')
    .select('*')
    .eq('conversation_id', conversationId);

  if (error) {
    console.error('Error loading file dependencies:', error);
    return [];
  }

  return deps || [];
}

/**
 * Store file dependency in existing component_dependencies table
 */
export async function storeFileDependency(
  supabase: any,
  data: {
    conversationId: string;
    componentName: string;
    componentType: string;
    dependsOn: any;
    usedBy: any;
    complexityScore?: number;
    criticality?: string;
  }
): Promise<void> {
  // Gracefully handle undefined/null values
  if (!data.conversationId || !supabase) {
    console.warn('⚠️ Missing conversationId or supabase client, skipping dependency storage');
    return;
  }

  // CRITICAL FIX: Add proper conflict handling for upsert
  const { error } = await supabase
    .from('component_dependencies')
    .upsert({
      conversation_id: data.conversationId,
      component_name: data.componentName,
      component_type: data.componentType,
      depends_on: data.dependsOn || [],
      used_by: data.usedBy || [],
      complexity_score: data.complexityScore || 1,
      criticality: data.criticality || 'medium',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'conversation_id,component_name',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error storing file dependency:', error);
  }
}

/**
 * Build dependency summary for AI context
 */
export function buildDependencySummary(files: FileInfo[]): string {
  const criticalFiles = files
    .filter(f => f.criticality === 'high' || f.criticality === 'critical')
    .slice(0, 5)
    .map(f => `${f.component_name} (${f.component_type})`)
    .join(', ');

  return `
FILE DEPENDENCIES TRACKED: ${files.length} components
Critical Components: ${criticalFiles || 'None'}

CRITICAL: When modifying code, check component dependencies to avoid breaking changes!
`.trim();
}
