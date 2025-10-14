/**
 * Quality Scorer - Evaluates generated code quality
 * 
 * Scores code on multiple dimensions:
 * - Completeness (files, structure)
 * - Code quality (imports, types, best practices)
 * - Functionality (working features)
 * - Performance (bundle size, complexity)
 */

export interface QualityMetrics {
  completeness: number;
  codeQuality: number;
  functionality: number;
  performance: number;
  overall: number;
  details: {
    fileCount: number;
    avgFileSize: number;
    hasTypes: boolean;
    hasTests: boolean;
    syntaxErrors: number;
    bestPracticeViolations: string[];
  };
}

/**
 * Score code completeness (0-100)
 */
function scoreCompleteness(files: any[]): number {
  let score = 0;
  
  // Has files (30 points)
  if (files.length > 0) score += 30;
  
  // Has main entry point (20 points)
  const hasEntry = files.some(f => 
    f.path.includes('App.tsx') || 
    f.path.includes('main.tsx') || 
    f.path.includes('index.html')
  );
  if (hasEntry) score += 20;
  
  // Has configuration (15 points)
  const hasConfig = files.some(f => 
    f.path === 'package.json' || 
    f.path.includes('config')
  );
  if (hasConfig) score += 15;
  
  // Has styles (15 points)
  const hasStyles = files.some(f => 
    f.path.includes('.css') || 
    f.path.includes('tailwind')
  );
  if (hasStyles) score += 15;
  
  // Has multiple components (20 points)
  const componentCount = files.filter(f => 
    f.path.includes('components/') || 
    f.path.includes('pages/')
  ).length;
  if (componentCount > 0) score += Math.min(20, componentCount * 5);
  
  return Math.min(100, score);
}

/**
 * Score code quality (0-100)
 */
function scoreCodeQuality(files: any[]): number {
  let score = 0;
  const violations: string[] = [];
  
  // Has imports (20 points)
  const hasImports = files.some(f => f.content?.includes('import'));
  if (hasImports) score += 20;
  
  // Has TypeScript (20 points)
  const hasTypes = files.some(f => 
    f.path.endsWith('.ts') || 
    f.path.endsWith('.tsx') ||
    f.content?.includes(': string') ||
    f.content?.includes('interface ')
  );
  if (hasTypes) score += 20;
  
  // Code organization (20 points)
  const isOrganized = files.some(f => 
    f.path.includes('/components/') || 
    f.path.includes('/hooks/') ||
    f.path.includes('/utils/')
  );
  if (isOrganized) score += 20;
  
  // No obvious errors (20 points)
  const hasErrors = files.some(f => 
    f.content?.includes('// TODO') ||
    f.content?.includes('console.log(') ||
    f.content?.includes('any;')
  );
  if (!hasErrors) {
    score += 20;
  } else {
    violations.push('Contains TODOs or console.logs');
  }
  
  // Proper exports (20 points)
  const hasExports = files.some(f => 
    f.content?.includes('export default') ||
    f.content?.includes('export {')
  );
  if (hasExports) score += 20;
  
  return Math.min(100, score);
}

/**
 * Score functionality (0-100)
 */
function scoreFunctionality(files: any[], request: string): number {
  let score = 40; // Base score for having files
  
  // Check for state management (20 points)
  const hasState = files.some(f => 
    f.content?.includes('useState') ||
    f.content?.includes('useReducer') ||
    f.content?.includes('store')
  );
  if (hasState) score += 20;
  
  // Check for event handlers (20 points)
  const hasHandlers = files.some(f => 
    f.content?.includes('onClick') ||
    f.content?.includes('onChange') ||
    f.content?.includes('onSubmit')
  );
  if (hasHandlers) score += 20;
  
  // Check for effects (10 points)
  const hasEffects = files.some(f => 
    f.content?.includes('useEffect') ||
    f.content?.includes('useCallback')
  );
  if (hasEffects) score += 10;
  
  // Check for forms (10 points)
  const hasForms = files.some(f => 
    f.content?.includes('<form') ||
    f.content?.includes('input')
  );
  if (hasForms) score += 10;
  
  return Math.min(100, score);
}

/**
 * Score performance (0-100)
 */
function scorePerformance(files: any[]): number {
  let score = 50; // Base score
  
  // File size check (25 points)
  const avgSize = files.reduce((sum, f) => sum + (f.content?.length || 0), 0) / files.length;
  if (avgSize > 100 && avgSize < 3000) {
    score += 25; // Reasonable file sizes
  } else if (avgSize >= 3000 && avgSize < 5000) {
    score += 15; // Larger but acceptable
  } else if (avgSize >= 5000) {
    score += 5; // Too large
  }
  
  // Code splitting (25 points)
  const isSplit = files.length > 3;
  if (isSplit) score += 25;
  
  return Math.min(100, score);
}

/**
 * Calculate overall quality score with detailed metrics
 */
export function calculateQualityScore(
  files: any[],
  request: string
): QualityMetrics {
  const completeness = scoreCompleteness(files);
  const codeQuality = scoreCodeQuality(files);
  const functionality = scoreFunctionality(files, request);
  const performance = scorePerformance(files);
  
  // Weighted average
  const overall = Math.round(
    completeness * 0.3 +
    codeQuality * 0.3 +
    functionality * 0.25 +
    performance * 0.15
  );
  
  const avgFileSize = files.reduce((sum, f) => sum + (f.content?.length || 0), 0) / files.length;
  const hasTypes = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  const hasTests = files.some(f => f.path.includes('.test.') || f.path.includes('.spec.'));
  
  return {
    completeness,
    codeQuality,
    functionality,
    performance,
    overall,
    details: {
      fileCount: files.length,
      avgFileSize: Math.round(avgFileSize),
      hasTypes,
      hasTests,
      syntaxErrors: 0, // Would need actual parser
      bestPracticeViolations: []
    }
  };
}

/**
 * Compare two quality metrics and determine winner
 */
export function compareQuality(a: QualityMetrics, b: QualityMetrics): number {
  // Return positive if a is better, negative if b is better
  const scoreDiff = a.overall - b.overall;
  
  // If scores are very close (within 5 points), use tiebreakers
  if (Math.abs(scoreDiff) < 5) {
    // Prefer more complete code
    if (a.completeness !== b.completeness) {
      return a.completeness - b.completeness;
    }
    // Then prefer better code quality
    if (a.codeQuality !== b.codeQuality) {
      return a.codeQuality - b.codeQuality;
    }
    // Then prefer better functionality
    return a.functionality - b.functionality;
  }
  
  return scoreDiff;
}
