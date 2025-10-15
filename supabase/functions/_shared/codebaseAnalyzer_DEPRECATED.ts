/**
 * Codebase Analyzer - Enterprise Pre-Implementation Analysis
 * 
 * Scans existing code for:
 * - Similar functionality
 * - Duplicate functions/components
 * - Enhancement opportunities
 * - Integration points
 */

import { validateReactProject } from './codeValidator.ts';

interface CodebaseFile {
  path: string;
  content: string;
  type: 'component' | 'hook' | 'util' | 'page' | 'api' | 'config' | 'unknown';
  exports: string[];
  imports: string[];
  functions: string[];
  components: string[];
  hooks: string[];
}

interface SimilarityMatch {
  file: string;
  type: 'component' | 'function' | 'hook' | 'api';
  name: string;
  similarity: number;
  reason: string;
  canEnhance: boolean;
  enhancementOpportunity?: string;
}

interface DuplicateDetection {
  duplicates: Array<{
    name: string;
    locations: string[];
    type: string;
    recommendation: string;
  }>;
  conflicts: Array<{
    issue: string;
    files: string[];
    severity: 'high' | 'medium' | 'low';
    resolution: string;
  }>;
}

interface IntegrationPoint {
  file: string;
  type: 'import' | 'export' | 'state' | 'api' | 'hook' | 'context';
  connection: string;
  impact: 'high' | 'medium' | 'low';
  requiredChanges?: string[];
}

interface ImplementationPlan {
  approach: 'enhance_existing' | 'create_new' | 'hybrid';
  existingToEnhance: string[];
  newFilesToCreate: string[];
  fileStructure: {
    path: string;
    type: string;
    purpose: string;
    dependencies: string[];
  }[];
  integrationPoints: IntegrationPoint[];
  estimatedComplexity: 'low' | 'medium' | 'high' | 'very_high';
  risks: string[];
  benefits: string[];
}

interface CodebaseAnalysisResult {
  totalFiles: number;
  relevantFiles: CodebaseFile[];
  similarFunctionality: SimilarityMatch[];
  duplicates: DuplicateDetection;
  integrationPoints: IntegrationPoint[];
  implementationPlan: ImplementationPlan;
  recommendations: string[];
  requiresApproval: boolean;
}

/**
 * Analyze existing codebase for similar functionality
 */
export async function analyzeCodebase(
  request: string,
  analysis: any,
  conversationContext: any,
  supabase: any
): Promise<CodebaseAnalysisResult> {
  console.log('🔍 Starting codebase analysis for:', request);

  // CRITICAL FIX: Read from both component_dependencies AND project_files
  const { data: fileDeps } = await supabase
    .from('component_dependencies')
    .select('*')
    .eq('conversation_id', conversationContext.conversationId)
    .order('created_at', { ascending: false })
    .limit(100);

  // CRITICAL FIX: Also read actual file content from project_files
  let projectFiles: any[] = [];
  if (conversationContext.projectId) {
    const { data: files } = await supabase
      .from('project_files')
      .select('file_path, file_content, file_type')
      .eq('project_id', conversationContext.projectId)
      .order('created_at', { ascending: false });
    projectFiles = files || [];
  }

  // CRITICAL FIX: Merge data from both sources
  const fileMap = new Map<string, any>();
  
  // Add from component_dependencies
  (fileDeps || []).forEach((file: any) => {
    fileMap.set(file.component_name, {
      path: file.component_name,
      content: '',
      type: detectFileType(file.component_name),
      exports: [],
      imports: file.depends_on || [],
      functions: [],
      components: file.component_type === 'component' ? [file.component_name] : [],
      hooks: file.component_type === 'hook' ? [file.component_name] : []
    });
  });

  // Add/update from project_files with actual content
  projectFiles.forEach((file: any) => {
    const existing = fileMap.get(file.file_path);
    fileMap.set(file.file_path, {
      path: file.file_path,
      content: file.file_content || '',
      type: detectFileType(file.file_path),
      exports: [],
      imports: existing?.imports || [],
      functions: [],
      components: existing?.components || [],
      hooks: existing?.hooks || []
    });
  });

  const codebaseFiles: CodebaseFile[] = Array.from(fileMap.values());
  console.log(`📁 Found ${codebaseFiles.length} existing files in project (${projectFiles.length} with content)`);

  // Validate React files using codeValidator
  const reactFiles = codebaseFiles.filter(f => 
    f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
  );
  if (reactFiles.length > 0 && reactFiles[0].content) {
    const validation = validateReactProject(
      reactFiles.map(f => ({ path: f.path, code: f.content }))
    );
    if (!validation.isValid) {
      console.warn('⚠️ Validation warnings found:', validation.overallWarnings);
    }
  }

  // Detect similar functionality
  const similarFunctionality = await detectSimilarFunctionality(
    request,
    analysis,
    codebaseFiles
  );

  // Detect duplicates and conflicts
  const duplicates = detectDuplicates(codebaseFiles, analysis);

  // Identify integration points
  const integrationPoints = identifyIntegrationPoints(
    codebaseFiles,
    analysis,
    similarFunctionality
  );

  // Generate implementation plan
  const implementationPlan = generateImplementationPlan(
    analysis,
    similarFunctionality,
    duplicates,
    integrationPoints,
    codebaseFiles
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    similarFunctionality,
    duplicates,
    implementationPlan
  );

  return {
    totalFiles: codebaseFiles.length,
    relevantFiles: codebaseFiles,
    similarFunctionality,
    duplicates,
    integrationPoints,
    implementationPlan,
    recommendations,
    requiresApproval: true // Always require approval for transparency
  };
}

/**
 * Detect file type from path
 */
function detectFileType(path: string): CodebaseFile['type'] {
  if (path.includes('/hooks/')) return 'hook';
  if (path.includes('/pages/')) return 'page';
  if (path.includes('/components/')) return 'component';
  if (path.includes('/utils/') || path.includes('/lib/')) return 'util';
  if (path.includes('/api/') || path.includes('supabase/functions/')) return 'api';
  if (path.includes('config') || path.includes('.config.')) return 'config';
  return 'unknown';
}

/**
 * Detect similar functionality in existing codebase
 */
async function detectSimilarFunctionality(
  request: string,
  analysis: any,
  files: CodebaseFile[]
): Promise<SimilarityMatch[]> {
  const matches: SimilarityMatch[] = [];
  const requestLower = request.toLowerCase();
  const keywords = extractKeywords(request, analysis);

  for (const file of files) {
    const fileLower = file.path.toLowerCase();
    let similarity = 0;
    let reasons: string[] = [];

    // Check for keyword matches
    for (const keyword of keywords) {
      if (fileLower.includes(keyword)) {
        similarity += 30;
        reasons.push(`Contains '${keyword}'`);
      }
    }

    // Check for type matches
    if (analysis.outputType === 'react-component' && file.type === 'component') {
      similarity += 20;
      reasons.push('Same component type');
    } else if (analysis.outputType === 'custom-hook' && file.type === 'hook') {
      similarity += 20;
      reasons.push('Same hook type');
    } else if (analysis.backendRequirements?.needsEdgeFunction && file.type === 'api') {
      similarity += 20;
      reasons.push('Backend functionality');
    }

    // Check for feature overlap
    if (analysis.mainGoal && fileLower.includes(analysis.mainGoal.toLowerCase())) {
      similarity += 40;
      reasons.push('Related to main goal');
    }

    if (similarity >= 30) {
      matches.push({
        file: file.path,
        type: file.type as any,
        name: file.path.split('/').pop() || file.path,
        similarity,
        reason: reasons.join(', '),
        canEnhance: similarity >= 50,
        enhancementOpportunity: similarity >= 50 
          ? `Can extend with ${analysis.mainGoal} functionality`
          : undefined
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Extract keywords from request
 */
function extractKeywords(request: string, analysis: any): string[] {
  const keywords: string[] = [];
  
  // Extract from request
  const words = request.toLowerCase().split(/\s+/);
  const significantWords = words.filter(w => 
    w.length > 4 && 
    !['create', 'build', 'make', 'please', 'implement', 'should', 'would', 'could'].includes(w)
  );
  keywords.push(...significantWords);

  // Extract from analysis
  if (analysis.mainGoal) {
    keywords.push(...analysis.mainGoal.toLowerCase().split(/\s+/));
  }
  if (analysis.outputType) {
    keywords.push(analysis.outputType.toLowerCase());
  }

  return [...new Set(keywords)].slice(0, 10); // Top 10 unique keywords
}

/**
 * Detect duplicate functions/components
 */
function detectDuplicates(
  files: CodebaseFile[],
  analysis: any
): DuplicateDetection {
  const duplicates: DuplicateDetection['duplicates'] = [];
  const conflicts: DuplicateDetection['conflicts'] = [];

  // Group by component/function name
  const nameMap = new Map<string, string[]>();
  
  for (const file of files) {
    for (const comp of file.components) {
      const locations = nameMap.get(comp) || [];
      locations.push(file.path);
      nameMap.set(comp, locations);
    }
    for (const func of file.functions) {
      const locations = nameMap.get(func) || [];
      locations.push(file.path);
      nameMap.set(func, locations);
    }
  }

  // Find actual duplicates
  for (const [name, locations] of nameMap.entries()) {
    if (locations.length > 1) {
      duplicates.push({
        name,
        locations,
        type: name.startsWith('use') ? 'hook' : 'component',
        recommendation: `Consider consolidating into single ${name} implementation`
      });

      conflicts.push({
        issue: `Duplicate ${name} found in ${locations.length} locations`,
        files: locations,
        severity: 'medium',
        resolution: 'Consolidate into single source of truth before adding new functionality'
      });
    }
  }

  return { duplicates, conflicts };
}

/**
 * Identify integration points with existing code
 */
function identifyIntegrationPoints(
  files: CodebaseFile[],
  analysis: any,
  similarities: SimilarityMatch[]
): IntegrationPoint[] {
  const points: IntegrationPoint[] = [];

  // Check files with high similarity
  for (const match of similarities.filter(m => m.similarity >= 40)) {
    points.push({
      file: match.file,
      type: 'import',
      connection: match.canEnhance ? 'Enhancement required' : 'May need to import',
      impact: match.similarity >= 70 ? 'high' : match.similarity >= 50 ? 'medium' : 'low',
      requiredChanges: match.canEnhance 
        ? ['Add new props/methods', 'Update imports', 'Test integration']
        : ['Import and use', 'Check compatibility']
    });
  }

  // Check for state management needs
  if (analysis.backendRequirements?.needsDatabase) {
    points.push({
      file: 'Database integration',
      type: 'state',
      connection: 'Supabase client',
      impact: 'high',
      requiredChanges: ['Setup tables', 'Configure RLS', 'Add queries']
    });
  }

  // Check for API integrations
  if (analysis.backendRequirements?.needsEdgeFunction) {
    points.push({
      file: 'Edge function',
      type: 'api',
      connection: 'API endpoint',
      impact: 'high',
      requiredChanges: ['Create function', 'Setup CORS', 'Add error handling']
    });
  }

  return points;
}

/**
 * Generate implementation plan
 */
function generateImplementationPlan(
  analysis: any,
  similarities: SimilarityMatch[],
  duplicates: DuplicateDetection,
  integrationPoints: IntegrationPoint[],
  files: CodebaseFile[]
): ImplementationPlan {
  // Determine approach
  const highSimilarity = similarities.filter(s => s.similarity >= 70);
  const canEnhance = similarities.filter(s => s.canEnhance);
  
  let approach: ImplementationPlan['approach'];
  if (canEnhance.length > 0 && highSimilarity.length > 0) {
    approach = 'hybrid';
  } else if (canEnhance.length > 0) {
    approach = 'enhance_existing';
  } else {
    approach = 'create_new';
  }

  // Determine files to enhance
  const existingToEnhance = canEnhance.map(s => s.file);

  // Determine new files to create
  const newFilesToCreate: string[] = [];
  if (analysis.outputType === 'react-component') {
    const compName = analysis.mainGoal?.split(' ').map((w: string) => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join('') || 'NewComponent';
    newFilesToCreate.push(`src/components/${compName}.tsx`);
  }
  if (analysis.backendRequirements?.needsEdgeFunction) {
    newFilesToCreate.push(`supabase/functions/${analysis.mainGoal?.replace(/\s+/g, '-')}/index.ts`);
  }

  // Generate file structure
  const fileStructure = newFilesToCreate.map(path => ({
    path,
    type: path.includes('components') ? 'component' : 'api',
    purpose: `Implements ${analysis.mainGoal}`,
    dependencies: integrationPoints.map(p => p.file)
  }));

  // Estimate complexity
  let complexity: ImplementationPlan['estimatedComplexity'];
  const factorScore = 
    (canEnhance.length * 2) + 
    (newFilesToCreate.length * 3) + 
    (integrationPoints.length * 2) +
    (duplicates.conflicts.length * 3);
  
  if (factorScore < 10) complexity = 'low';
  else if (factorScore < 20) complexity = 'medium';
  else if (factorScore < 35) complexity = 'high';
  else complexity = 'very_high';

  // Identify risks
  const risks: string[] = [];
  if (duplicates.duplicates.length > 0) {
    risks.push(`${duplicates.duplicates.length} duplicate(s) may cause conflicts`);
  }
  if (integrationPoints.filter(p => p.impact === 'high').length > 3) {
    risks.push('Multiple high-impact integration points');
  }
  if (canEnhance.length > 2) {
    risks.push('Modifying multiple existing files increases regression risk');
  }

  // Identify benefits
  const benefits: string[] = [];
  if (approach === 'enhance_existing') {
    benefits.push('Leverages existing code, faster implementation');
  }
  if (duplicates.duplicates.length === 0) {
    benefits.push('Clean codebase, no conflicts');
  }
  benefits.push('Enterprise-level patterns, production-ready');

  return {
    approach,
    existingToEnhance,
    newFilesToCreate,
    fileStructure,
    integrationPoints,
    estimatedComplexity: complexity,
    risks,
    benefits
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  similarities: SimilarityMatch[],
  duplicates: DuplicateDetection,
  plan: ImplementationPlan
): string[] {
  const recommendations: string[] = [];

  // Duplicates
  if (duplicates.duplicates.length > 0) {
    recommendations.push(
      `⚠️ CRITICAL: Consolidate ${duplicates.duplicates.length} duplicate(s) before proceeding`
    );
  }

  // Enhancement opportunities
  const canEnhance = similarities.filter(s => s.canEnhance);
  if (canEnhance.length > 0) {
    recommendations.push(
      `✅ RECOMMENDED: Enhance ${canEnhance.length} existing file(s) instead of creating from scratch`
    );
  }

  // Complexity warning
  if (plan.estimatedComplexity === 'very_high') {
    recommendations.push(
      `⚠️ COMPLEXITY: Very high complexity detected - consider breaking into smaller tasks`
    );
  }

  // Integration points
  const highImpact = plan.integrationPoints.filter(p => p.impact === 'high');
  if (highImpact.length > 2) {
    recommendations.push(
      `⚠️ INTEGRATION: ${highImpact.length} high-impact integration points - test thoroughly`
    );
  }

  // Clean approach
  if (plan.approach === 'create_new' && duplicates.duplicates.length === 0) {
    recommendations.push(
      `✅ CLEAN: No conflicts, safe to create new implementation`
    );
  }

  return recommendations;
}
