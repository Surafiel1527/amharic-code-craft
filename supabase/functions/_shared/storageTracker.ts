/**
 * Storage Tracker Module
 * Enterprise-level storage and generation metrics tracking
 */

interface FileMetadata {
  path: string;
  sizeBytes: number;
  lines: number;
}

interface StorageMetrics {
  totalSizeBytes: number;
  fileCount: number;
  largestFileBytes: number;
  largestFileName: string;
  fileBreakdown: FileMetadata[];
}

interface GenerationMetrics {
  generationTimeMs: number;
  success: boolean;
  featureCount: number;
  totalLinesGenerated: number;
  complexityScore: number;
  errorType?: string;
  errorMessage?: string;
}

/**
 * Calculate storage metrics from generated files
 */
export function calculateStorageMetrics(files: Record<string, string>): StorageMetrics {
  const fileBreakdown: FileMetadata[] = [];
  let totalSizeBytes = 0;
  let largestFileBytes = 0;
  let largestFileName = '';
  
  for (const [path, content] of Object.entries(files)) {
    // Calculate size in bytes (UTF-8)
    const sizeBytes = new TextEncoder().encode(content).length;
    const lines = content.split('\n').length;
    
    fileBreakdown.push({ path, sizeBytes, lines });
    totalSizeBytes += sizeBytes;
    
    if (sizeBytes > largestFileBytes) {
      largestFileBytes = sizeBytes;
      largestFileName = path;
    }
  }
  
  return {
    totalSizeBytes,
    fileCount: fileBreakdown.length,
    largestFileBytes,
    largestFileName,
    fileBreakdown: fileBreakdown.sort((a, b) => b.sizeBytes - a.sizeBytes)
  };
}

/**
 * Calculate complexity score based on various factors
 */
export function calculateComplexityScore(files: Record<string, string>): number {
  let score = 0;
  
  for (const [path, content] of Object.entries(files)) {
    // Component complexity
    if (path.includes('component') || path.endsWith('.tsx')) {
      const hooks = (content.match(/use[A-Z]\w+/g) || []).length;
      const props = (content.match(/interface.*Props/g) || []).length;
      score += hooks * 2 + props * 1;
    }
    
    // API/Edge function complexity
    if (path.includes('functions/')) {
      const endpoints = (content.match(/case\s+['"].*['"]:/g) || []).length;
      const queries = (content.match(/supabase\.from\(/g) || []).length;
      score += endpoints * 3 + queries * 2;
    }
    
    // Database complexity
    if (content.includes('CREATE TABLE')) {
      const tables = (content.match(/CREATE TABLE/g) || []).length;
      const policies = (content.match(/CREATE POLICY/g) || []).length;
      score += tables * 5 + policies * 2;
    }
  }
  
  return Math.min(100, score); // Cap at 100
}

/**
 * Track storage metrics in database
 */
export async function trackStorageMetrics(
  supabase: any,
  params: {
    userId: string;
    projectId?: string;
    conversationId: string;
    generationId: string;
    framework: string;
    files: Record<string, string>;
  }
): Promise<void> {
  const { userId, projectId, conversationId, generationId, framework, files } = params;
  
  const metrics = calculateStorageMetrics(files);
  
  const { error } = await supabase
    .from('platform_storage_metrics')
    .insert({
      user_id: userId,
      project_id: projectId,
      conversation_id: conversationId,
      generation_id: generationId,
      total_size_bytes: metrics.totalSizeBytes,
      file_count: metrics.fileCount,
      largest_file_bytes: metrics.largestFileBytes,
      largest_file_name: metrics.largestFileName,
      framework,
      file_breakdown: metrics.fileBreakdown
    });
  
  if (error) {
    console.error('Failed to track storage metrics:', error);
  } else {
    console.log(`📊 Storage tracked: ${(metrics.totalSizeBytes / 1024).toFixed(2)} KB, ${metrics.fileCount} files`);
  }
}

/**
 * Track generation statistics in database
 */
export async function trackGenerationStats(
  supabase: any,
  params: {
    userId: string;
    projectId?: string;
    conversationId: string;
    generationId: string;
    framework: string;
    files: Record<string, string>;
    metrics: GenerationMetrics;
  }
): Promise<void> {
  const { userId, projectId, conversationId, generationId, framework, files, metrics } = params;
  
  // ✅ FIX 5: Validate metrics before inserting
  if (isNaN(metrics.generationTimeMs) || metrics.generationTimeMs < 0) {
    console.error('❌ Invalid generationTimeMs:', metrics.generationTimeMs, '- Skipping stats tracking');
    throw new Error(`Invalid generationTimeMs: ${metrics.generationTimeMs}`);
  }
  
  const complexityScore = calculateComplexityScore(files);
  const totalLines = Object.values(files).reduce(
    (sum, content) => sum + content.split('\n').length, 
    0
  );
  
  const { error } = await supabase
    .from('platform_generation_stats')
    .insert({
      user_id: userId,
      project_id: projectId,
      conversation_id: conversationId,
      generation_id: generationId,
      generation_time_ms: Math.round(metrics.generationTimeMs), // Ensure integer
      success: metrics.success,
      framework,
      feature_count: metrics.featureCount,
      total_lines_generated: totalLines,
      complexity_score: complexityScore,
      error_type: metrics.errorType,
      error_message: metrics.errorMessage
    });
  
  if (error) {
    console.error('Failed to track generation stats:', error);
    throw error; // Re-throw to be caught by try-catch in orchestrator
  } else {
    console.log(`📈 Generation stats tracked: ${metrics.success ? '✅ Success' : '❌ Failed'}, ${totalLines} lines`);
  }
}

/**
 * Track both storage and generation metrics in one call
 */
export async function trackPlatformMetrics(
  supabase: any,
  params: {
    userId: string;
    projectId?: string;
    conversationId: string;
    generationId: string;
    framework: string;
    files: Record<string, string>;
    generationMetrics: GenerationMetrics;
  }
): Promise<void> {
  // Track both metrics in parallel
  await Promise.all([
    trackStorageMetrics(supabase, params),
    trackGenerationStats(supabase, {
      ...params,
      metrics: params.generationMetrics
    })
  ]);
}
