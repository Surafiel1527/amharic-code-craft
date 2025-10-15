/**
 * Unified Codebase Analyzer - Enterprise Grade
 * 
 * Merges capabilities from:
 * - enhancedCodebaseAnalyzer (structure discovery)
 * - codebaseAnalyzer (similarity detection, duplicates, integration planning)
 * 
 * Single source of truth for all codebase analysis operations.
 */

import { validateReactProject } from './codeValidator.ts';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DiscoveredFunction {
  name: string;
  params: string[];
  returnType?: string;
  filePath: string;
  lineNumber: number;
  isExported: boolean;
  documentation?: string;
}

export interface DiscoveredComponent {
  name: string;
  props: string[];
  filePath: string;
  isExported: boolean;
  documentation?: string;
}

export interface CodebaseFile {
  path: string;
  content: string;
  type: 'component' | 'hook' | 'util' | 'page' | 'api' | 'config' | 'unknown';
  exports: string[];
  imports: string[];
  functions: DiscoveredFunction[];
  components: DiscoveredComponent[];
  hooks: string[];
}

export interface SimilarityMatch {
  file: string;
  type: 'component' | 'function' | 'hook' | 'api';
  name: string;
  similarity: number;
  reason: string;
  canEnhance: boolean;
  enhancementOpportunity?: string;
}

export interface DuplicateDetection {
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

export interface IntegrationPoint {
  file: string;
  type: 'import' | 'export' | 'state' | 'api' | 'hook' | 'context';
  connection: string;
  impact: 'high' | 'medium' | 'low';
  requiredChanges?: string[];
}

export interface ImplementationPlan {
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

export interface CodebaseAnalysisResult {
  totalFiles: number;
  relevantFiles: CodebaseFile[];
  similarFunctionality: SimilarityMatch[];
  duplicates: DuplicateDetection;
  integrationPoints: IntegrationPoint[];
  implementationPlan: ImplementationPlan;
  recommendations: string[];
  requiresApproval: boolean;
}

// ============================================
// UNIFIED ANALYZER CLASS
// ============================================

export class UnifiedCodebaseAnalyzer {
  
  /**
   * MAIN ENTRY POINT: Complete codebase analysis
   */
  async analyzeCodebase(
    request: string,
    analysis: any,
    conversationContext: any,
    supabase: any
  ): Promise<CodebaseAnalysisResult> {
    console.log('🔍 [UNIFIED ANALYZER] Starting comprehensive codebase analysis');

    // Load project files from database
    const files = await this.loadProjectFiles(conversationContext, supabase);
    console.log(`📁 Loaded ${files.length} files for analysis`);

    // Discover code structure (functions, components, imports)
    const enrichedFiles = this.enrichFilesWithStructure(files);

    // Validate React files
    await this.validateReactFiles(enrichedFiles);

    // Detect similar functionality
    const similarFunctionality = this.detectSimilarFunctionality(
      request,
      analysis,
      enrichedFiles
    );

    // Detect duplicates and conflicts
    const duplicates = this.detectDuplicates(enrichedFiles, analysis);

    // Identify integration points
    const integrationPoints = this.identifyIntegrationPoints(
      enrichedFiles,
      analysis,
      similarFunctionality
    );

    // Generate implementation plan
    const implementationPlan = this.generateImplementationPlan(
      analysis,
      similarFunctionality,
      duplicates,
      integrationPoints,
      enrichedFiles
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      similarFunctionality,
      duplicates,
      implementationPlan
    );

    return {
      totalFiles: enrichedFiles.length,
      relevantFiles: enrichedFiles,
      similarFunctionality,
      duplicates,
      integrationPoints,
      implementationPlan,
      recommendations,
      requiresApproval: true
    };
  }

  // ============================================
  // FILE LOADING & ENRICHMENT
  // ============================================

  private async loadProjectFiles(
    conversationContext: any,
    supabase: any
  ): Promise<CodebaseFile[]> {
    const fileMap = new Map<string, any>();

    // Load from component_dependencies
    const { data: fileDeps } = await supabase
      .from('component_dependencies')
      .select('*')
      .eq('conversation_id', conversationContext.conversationId)
      .order('created_at', { ascending: false })
      .limit(100);

    (fileDeps || []).forEach((file: any) => {
      fileMap.set(file.component_name, {
        path: file.component_name,
        content: '',
        type: this.detectFileType(file.component_name),
        exports: [],
        imports: file.depends_on || [],
        functions: [],
        components: file.component_type === 'component' ? [] : [],
        hooks: file.component_type === 'hook' ? [] : []
      });
    });

    // Load actual file content from project_files
    if (conversationContext.projectId) {
      const { data: projectFiles } = await supabase
        .from('project_files')
        .select('file_path, file_content, file_type')
        .eq('project_id', conversationContext.projectId)
        .order('created_at', { ascending: false });

      (projectFiles || []).forEach((file: any) => {
        const existing = fileMap.get(file.file_path);
        fileMap.set(file.file_path, {
          path: file.file_path,
          content: file.file_content || '',
          type: this.detectFileType(file.file_path),
          exports: [],
          imports: existing?.imports || [],
          functions: [],
          components: existing?.components || [],
          hooks: existing?.hooks || []
        });
      });
    }

    return Array.from(fileMap.values());
  }

  private enrichFilesWithStructure(files: CodebaseFile[]): CodebaseFile[] {
    return files.map(file => {
      if (!this.isCodeFile(file.path) || !file.content) {
        return file;
      }

      return {
        ...file,
        functions: this.discoverFunctions(file.path, file.content),
        components: this.discoverComponents(file.path, file.content),
        imports: this.extractImports(file.content),
        exports: this.extractExports(file.content)
      };
    });
  }

  // ============================================
  // STRUCTURE DISCOVERY (from enhancedCodebaseAnalyzer)
  // ============================================

  private discoverFunctions(filePath: string, content: string): DiscoveredFunction[] {
    const functions: DiscoveredFunction[] = [];
    const lines = content.split('\n');

    // Regular function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
    
    // Arrow functions
    const arrowRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g;

    let match;

    // Match regular functions
    while ((match = functionRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        params: this.parseParams(match[2]),
        returnType: match[3]?.trim(),
        filePath,
        lineNumber,
        isExported: match[0].includes('export'),
        documentation: this.extractJSDoc(lines, lineNumber - 1)
      });
    }

    // Match arrow functions
    while ((match = arrowRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        params: this.parseParams(match[2]),
        returnType: match[3]?.trim(),
        filePath,
        lineNumber,
        isExported: match[0].includes('export'),
        documentation: this.extractJSDoc(lines, lineNumber - 1)
      });
    }

    return functions;
  }

  private discoverComponents(filePath: string, content: string): DiscoveredComponent[] {
    const components: DiscoveredComponent[] = [];
    const lines = content.split('\n');

    // Function components
    const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*(?:=\s*)?(?:\(([^)]*)\)|\{[^}]*\})\s*(?::|=>)?\s*(?:\{|=>)/g;
    
    let match;
    while ((match = componentRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const name = match[1];
      
      // Verify it returns JSX
      const componentBody = content.substring(match.index, match.index + 500);
      if (this.returnsJSX(componentBody)) {
        components.push({
          name,
          props: this.extractProps(match[2] || ''),
          filePath,
          isExported: match[0].includes('export'),
          documentation: this.extractJSDoc(lines, lineNumber - 1)
        });
      }
    }

    return components;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class)\s+(\w+)/g;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  // ============================================
  // SIMILARITY DETECTION (from codebaseAnalyzer)
  // ============================================

  private detectSimilarFunctionality(
    request: string,
    analysis: any,
    files: CodebaseFile[]
  ): SimilarityMatch[] {
    const matches: SimilarityMatch[] = [];
    const keywords = this.extractKeywords(request, analysis);

    for (const file of files) {
      const fileLower = file.path.toLowerCase();
      let similarity = 0;
      const reasons: string[] = [];

      // Keyword matching
      for (const keyword of keywords) {
        if (fileLower.includes(keyword)) {
          similarity += 30;
          reasons.push(`Contains '${keyword}'`);
        }
      }

      // Type matching
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

      // Feature overlap
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

  // ============================================
  // DUPLICATE DETECTION (from codebaseAnalyzer)
  // ============================================

  private detectDuplicates(
    files: CodebaseFile[],
    analysis: any
  ): DuplicateDetection {
    const duplicates: DuplicateDetection['duplicates'] = [];
    const conflicts: DuplicateDetection['conflicts'] = [];

    // Group by component/function name
    const nameMap = new Map<string, string[]>();
    
    for (const file of files) {
      for (const comp of file.components) {
        const locations = nameMap.get(comp.name) || [];
        locations.push(file.path);
        nameMap.set(comp.name, locations);
      }
      for (const func of file.functions) {
        const locations = nameMap.get(func.name) || [];
        locations.push(file.path);
        nameMap.set(func.name, locations);
      }
    }

    // Find actual duplicates
    for (const [name, locations] of nameMap.entries()) {
      if (locations.length > 1) {
        duplicates.push({
          name,
          locations,
          type: name.startsWith('use') ? 'hook' : 'component',
          recommendation: `Consolidate into single ${name} implementation`
        });

        conflicts.push({
          issue: `Duplicate ${name} found in ${locations.length} locations`,
          files: locations,
          severity: 'medium',
          resolution: 'Consolidate into single source of truth'
        });
      }
    }

    return { duplicates, conflicts };
  }

  // ============================================
  // INTEGRATION POINTS (from codebaseAnalyzer)
  // ============================================

  private identifyIntegrationPoints(
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

    // Database integration
    if (analysis.backendRequirements?.needsDatabase) {
      points.push({
        file: 'Database integration',
        type: 'state',
        connection: 'Supabase client',
        impact: 'high',
        requiredChanges: ['Setup tables', 'Configure RLS', 'Add queries']
      });
    }

    // API integration
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

  // ============================================
  // IMPLEMENTATION PLANNING (from codebaseAnalyzer)
  // ============================================

  private generateImplementationPlan(
    analysis: any,
    similarities: SimilarityMatch[],
    duplicates: DuplicateDetection,
    integrationPoints: IntegrationPoint[],
    files: CodebaseFile[]
  ): ImplementationPlan {
    const highSimilarity = similarities.filter(s => s.similarity >= 70);
    const canEnhance = similarities.filter(s => s.canEnhance);
    
    // Determine approach
    let approach: ImplementationPlan['approach'];
    if (canEnhance.length > 0 && highSimilarity.length > 0) {
      approach = 'hybrid';
    } else if (canEnhance.length > 0) {
      approach = 'enhance_existing';
    } else {
      approach = 'create_new';
    }

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
    const factorScore = 
      (canEnhance.length * 2) + 
      (newFilesToCreate.length * 3) + 
      (integrationPoints.length * 2) +
      (duplicates.conflicts.length * 3);
    
    let complexity: ImplementationPlan['estimatedComplexity'];
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

  // ============================================
  // RECOMMENDATIONS (from codebaseAnalyzer)
  // ============================================

  private generateRecommendations(
    similarities: SimilarityMatch[],
    duplicates: DuplicateDetection,
    plan: ImplementationPlan
  ): string[] {
    const recommendations: string[] = [];

    if (duplicates.duplicates.length > 0) {
      recommendations.push('⚠️ Consolidate duplicates before adding new functionality');
    }

    if (plan.approach === 'enhance_existing') {
      recommendations.push('✅ Enhance existing components for faster development');
    }

    if (similarities.length === 0) {
      recommendations.push('💡 No similar code found - clean slate implementation');
    }

    if (plan.estimatedComplexity === 'very_high') {
      recommendations.push('⏰ Consider breaking into multiple phases');
    }

    return recommendations;
  }

  // ============================================
  // VALIDATION
  // ============================================

  private async validateReactFiles(files: CodebaseFile[]): Promise<void> {
    const reactFiles = files.filter(f => 
      f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
    );
    
    if (reactFiles.length > 0 && reactFiles[0].content) {
      const validation = validateReactProject(
        reactFiles.map(f => ({ path: f.path, code: f.content }))
      );
      if (!validation.isValid) {
        console.warn('⚠️ Validation warnings:', validation.overallWarnings);
      }
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private detectFileType(path: string): CodebaseFile['type'] {
    if (path.includes('/hooks/')) return 'hook';
    if (path.includes('/pages/')) return 'page';
    if (path.includes('/components/')) return 'component';
    if (path.includes('/utils/') || path.includes('/lib/')) return 'util';
    if (path.includes('/api/') || path.includes('supabase/functions/')) return 'api';
    if (path.includes('config') || path.includes('.config.')) return 'config';
    return 'unknown';
  }

  private extractKeywords(request: string, analysis: any): string[] {
    const keywords: string[] = [];
    
    // From request
    const words = request.toLowerCase().split(/\s+/);
    const significantWords = words.filter(w => 
      w.length > 4 && 
      !['create', 'build', 'make', 'please', 'implement', 'should', 'would', 'could'].includes(w)
    );
    keywords.push(...significantWords);

    // From analysis
    if (analysis.mainGoal) {
      keywords.push(...analysis.mainGoal.toLowerCase().split(/\s+/));
    }
    if (analysis.outputType) {
      keywords.push(analysis.outputType.toLowerCase());
    }

    return [...new Set(keywords)].slice(0, 10);
  }

  private parseParams(paramsString: string): string[] {
    if (!paramsString.trim()) return [];
    
    return paramsString
      .split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(p => p.length > 0);
  }

  private extractProps(propsString: string): string[] {
    if (!propsString.includes('{')) return [];
    
    const match = propsString.match(/\{([^}]+)\}/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(p => p.length > 0);
  }

  private extractJSDoc(lines: string[], lineNumber: number): string | undefined {
    let doc = '';
    let i = lineNumber - 1;
    
    while (i >= 0 && (lines[i].trim().startsWith('*') || lines[i].trim().startsWith('//'))) {
      doc = lines[i].trim() + '\n' + doc;
      i--;
    }
    
    return doc.trim() || undefined;
  }

  private returnsJSX(content: string): boolean {
    return /return\s*\(?\s*</.test(content) || /=>\s*</.test(content);
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];
    return codeExtensions.some(ext => filePath.endsWith(ext));
  }
}

// ============================================
// BACKWARD COMPATIBILITY EXPORT
// ============================================

/**
 * Legacy function maintained for backward compatibility
 * @deprecated Use UnifiedCodebaseAnalyzer class directly
 */
export async function analyzeCodebase(
  request: string,
  analysis: any,
  conversationContext: any,
  supabase: any
): Promise<CodebaseAnalysisResult> {
  const analyzer = new UnifiedCodebaseAnalyzer();
  return analyzer.analyzeCodebase(request, analysis, conversationContext, supabase);
}