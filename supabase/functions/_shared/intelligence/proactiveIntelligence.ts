/**
 * Proactive Intelligence - Detect Issues BEFORE User Asks
 * 
 * Inspired by Grok's global insights layer.
 * Automatically scans project and detects:
 * - Security vulnerabilities
 * - Performance bottlenecks
 * - Code quality issues
 * - Breaking changes
 */

export interface GlobalInsights {
  security_issues: string[];
  optimization_opportunities: string[];
  code_smells: string[];
  breaking_changes: string[];
  detectedAt: Date;
}

export class ProactiveIntelligence {
  /**
   * Analyze entire project proactively
   */
  async analyze(projectFiles: Record<string, string>, projectContext?: any): Promise<GlobalInsights> {
    console.log('🔬 ProactiveIntelligence: Scanning project...');
    
    const securityIssues: string[] = [];
    const optimizations: string[] = [];
    const codeSmells: string[] = [];
    const breakingChanges: string[] = [];

    // Analyze all files
    for (const [path, content] of Object.entries(projectFiles)) {
      if (typeof content !== 'string') continue;

      // Security analysis
      securityIssues.push(...this.detectSecurityIssues(path, content));
      
      // Performance analysis
      optimizations.push(...this.findOptimizations(path, content));
      
      // Quality analysis
      codeSmells.push(...this.detectCodeSmells(path, content));
      
      // Breaking changes
      breakingChanges.push(...this.detectBreakingChanges(path, content));
    }

    // Project-level insights
    this.analyzeProjectStructure(projectFiles, securityIssues, optimizations);

    const insights = {
      security_issues: [...new Set(securityIssues)],  // Remove duplicates
      optimization_opportunities: [...new Set(optimizations)],
      code_smells: [...new Set(codeSmells)],
      breaking_changes: [...new Set(breakingChanges)],
      detectedAt: new Date()
    };

    console.log('✅ ProactiveIntelligence:', {
      securityIssues: insights.security_issues.length,
      optimizations: insights.optimization_opportunities.length,
      codeSmells: insights.code_smells.length
    });

    return insights;
  }

  /**
   * Detect security vulnerabilities
   */
  private detectSecurityIssues(path: string, content: string): string[] {
    const issues: string[] = [];

    // Dangerous functions
    if (content.includes('eval(')) {
      issues.push(`🔴 CRITICAL: eval() usage in ${path} (code injection risk)`);
    }

    if (content.includes('dangerouslySetInnerHTML')) {
      issues.push(`⚠️ WARNING: dangerouslySetInnerHTML in ${path} (XSS risk)`);
    }

    // Insecure patterns
    if (content.match(/localStorage\.setItem.*password|token/i)) {
      issues.push(`🔴 CRITICAL: Credentials in localStorage in ${path} (use secure storage)`);
    }

    // Missing authentication
    if (path.includes('api/') || path.includes('functions/')) {
      if (!content.includes('auth.uid()') && !content.includes('authorization')) {
        issues.push(`⚠️ WARNING: No authentication check in ${path}`);
      }
    }

    // Exposed secrets
    if (content.match(/api[_-]?key\s*=\s*['"][^'"]+['"]/i)) {
      issues.push(`🔴 CRITICAL: Hardcoded API key in ${path}`);
    }

    return issues;
  }

  /**
   * Find optimization opportunities
   */
  private findOptimizations(path: string, content: string): string[] {
    const optimizations: string[] = [];

    // React performance
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) {
      // Missing memoization
      if (content.includes('map(') && !content.includes('useMemo') && content.length > 500) {
        optimizations.push(`💡 Consider memoizing array operations in ${path}`);
      }

      // Large component without lazy loading
      if (content.length > 1000 && !content.includes('React.lazy')) {
        optimizations.push(`💡 Consider code-splitting ${path} with React.lazy()`);
      }

      // Missing key props
      if (content.match(/\.map\([^)]*\).*?<[A-Z]/s) && !content.includes('key=')) {
        optimizations.push(`⚠️ Missing 'key' props in list rendering in ${path}`);
      }
    }

    // Bundle size
    if (content.includes('import') && content.includes('lodash')) {
      if (!content.match(/import.*from ['"]lodash\/\w+['"]/)) {
        optimizations.push(`💡 Use specific lodash imports in ${path} (reduce bundle size)`);
      }
    }

    // Database queries
    if (content.includes('supabase') && content.includes('.select()')) {
      if (!content.includes('.limit(') && !content.includes('.range(')) {
        optimizations.push(`💡 Add pagination to database queries in ${path}`);
      }
    }

    return optimizations;
  }

  /**
   * Detect code quality issues
   */
  private detectCodeSmells(path: string, content: string): string[] {
    const smells: string[] = [];

    // Large files
    const lines = content.split('\n').length;
    if (lines > 500) {
      smells.push(`📏 Large file: ${path} (${lines} lines - consider splitting)`);
    }

    // Duplicate code
    const functionMatches = content.match(/function \w+\(/g) || [];
    if (functionMatches.length > 15) {
      smells.push(`📦 High function count in ${path} (${functionMatches.length} - consider refactoring)`);
    }

    // Complex conditionals
    const nestedIfCount = (content.match(/if\s*\([^)]*\)\s*{[^}]*if\s*\(/g) || []).length;
    if (nestedIfCount > 3) {
      smells.push(`🔀 Deeply nested conditionals in ${path} (consider early returns)`);
    }

    // Magic numbers
    if (content.match(/\s\d{3,}\s/g)) {
      smells.push(`🔢 Magic numbers in ${path} (use named constants)`);
    }

    // TODO comments
    const todoCount = (content.match(/TODO:|FIXME:/gi) || []).length;
    if (todoCount > 5) {
      smells.push(`📝 ${todoCount} TODO/FIXME comments in ${path}`);
    }

    return smells;
  }

  /**
   * Detect breaking changes and deprecated patterns
   */
  private detectBreakingChanges(path: string, content: string): string[] {
    const changes: string[] = [];

    // Deprecated React patterns
    if (content.includes('componentWillMount') || content.includes('componentWillReceiveProps')) {
      changes.push(`⚠️ Deprecated lifecycle methods in ${path} (use Hooks)`);
    }

    // Old API patterns
    if (content.includes('UNSAFE_')) {
      changes.push(`⚠️ UNSAFE_ methods in ${path} (migrate to safe alternatives)`);
    }

    return changes;
  }

  /**
   * Analyze project-level structure
   */
  private analyzeProjectStructure(
    files: Record<string, string>,
    securityIssues: string[],
    optimizations: string[]
  ): void {
    const paths = Object.keys(files);

    // Check for missing critical files
    if (!paths.some(p => p.includes('.gitignore'))) {
      securityIssues.push('🔴 Missing .gitignore file (secrets may be exposed)');
    }

    if (!paths.some(p => p.includes('README'))) {
      optimizations.push('📄 Missing README.md (add project documentation)');
    }

    // Check for testing
    const hasTests = paths.some(p => p.includes('.test.') || p.includes('.spec.'));
    if (!hasTests && paths.length > 10) {
      optimizations.push('🧪 No test files found (consider adding tests)');
    }

    // Check bundle size
    const componentCount = paths.filter(p => 
      (p.endsWith('.tsx') || p.endsWith('.jsx')) && p.includes('components/')
    ).length;
    
    if (componentCount > 50) {
      optimizations.push(`📦 Large number of components (${componentCount}) - consider lazy loading`);
    }
  }
}
