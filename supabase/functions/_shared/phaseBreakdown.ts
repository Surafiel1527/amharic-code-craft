/**
 * Phase Breakdown - Intelligently splits large apps into build phases
 * 
 * Analyzes dependencies and complexity to create optimal build phases.
 */

export interface PhaseBreakdownResult {
  phases: Phase[];
  totalFiles: number;
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export interface Phase {
  id: string;
  name: string;
  files: string[];
  dependencies: string[];
  priority: number;
  complexity: number;
}

export class PhaseBreakdown {
  /**
   * Analyzes and breaks down project into phases
   */
  breakdown(files: any[], features: any[]): PhaseBreakdownResult {
    const phases: Phase[] = [];
    const filesByType = this.categorizeFiles(files);
    const complexity = this.calculateComplexity(files, features);

    // Phase 1: Foundation
    phases.push(this.createFoundationPhase(filesByType));

    // Phase 2: Core Features
    phases.push(this.createCorePhase(filesByType, features));

    // Phase 3+: Additional Features
    const featurePhases = this.createFeaturePhases(filesByType, features);
    phases.push(...featurePhases);

    // Phase N: Polish & Optimization
    phases.push(this.createPolishPhase(filesByType));

    const totalFiles = files.length;
    const estimatedTime = this.estimateTime(totalFiles, complexity);

    return {
      phases,
      totalFiles,
      estimatedTime,
      complexity,
    };
  }

  /**
   * Categorizes files by type and purpose
   */
  private categorizeFiles(files: any[]): Map<string, any[]> {
    const categories = new Map<string, any[]>();

    const categoryPatterns = {
      auth: /auth|login|signup|session/i,
      database: /database|schema|migration|supabase/i,
      api: /api|endpoint|function|edge/i,
      components: /component|ui/i,
      pages: /page|route/i,
      hooks: /hook|use[A-Z]/,
      utils: /util|helper|lib/i,
      types: /type|interface|\.d\.ts/,
      config: /config|setting|env/i,
      tests: /test|spec|\.test\.|\.spec\./i,
    };

    files.forEach(file => {
      let categorized = false;

      for (const [category, pattern] of Object.entries(categoryPatterns)) {
        if (pattern.test(file.path)) {
          if (!categories.has(category)) {
            categories.set(category, []);
          }
          categories.get(category)!.push(file);
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        if (!categories.has('other')) {
          categories.set('other', []);
        }
        categories.get('other')!.push(file);
      }
    });

    return categories;
  }

  /**
   * Calculates overall project complexity
   */
  private calculateComplexity(files: any[], features: any[]): PhaseBreakdownResult['complexity'] {
    const fileCount = files.length;
    const featureCount = features.length;
    const hasAuth = features.some((f: any) => f.id === 'authentication');
    const hasVideo = features.some((f: any) => f.id === 'videoUpload');
    const hasPayments = features.some((f: any) => f.id === 'payments');

    if (fileCount > 80 || featureCount > 15 || hasVideo || hasPayments) {
      return 'enterprise';
    }
    if (fileCount > 50 || featureCount > 10) {
      return 'complex';
    }
    if (fileCount > 25 || featureCount > 5 || hasAuth) {
      return 'moderate';
    }
    return 'simple';
  }

  /**
   * Creates foundation phase
   */
  private createFoundationPhase(filesByType: Map<string, any[]>): Phase {
    const foundationFiles: string[] = [];

    // Config files
    filesByType.get('config')?.forEach(f => foundationFiles.push(f.path));

    // Database setup
    filesByType.get('database')?.forEach(f => foundationFiles.push(f.path));

    // Core types
    filesByType.get('types')?.slice(0, 5).forEach(f => foundationFiles.push(f.path));

    // Core utils
    filesByType.get('utils')?.slice(0, 5).forEach(f => foundationFiles.push(f.path));

    return {
      id: 'phase-1',
      name: 'Foundation & Setup',
      files: foundationFiles.slice(0, 15),
      dependencies: [],
      priority: 1,
      complexity: 2,
    };
  }

  /**
   * Creates core features phase
   */
  private createCorePhase(filesByType: Map<string, any[]>, features: any[]): Phase {
    const coreFiles: string[] = [];

    // Auth
    filesByType.get('auth')?.forEach(f => coreFiles.push(f.path));

    // Core API
    filesByType.get('api')?.slice(0, 5).forEach(f => coreFiles.push(f.path));

    // Essential hooks
    filesByType.get('hooks')?.slice(0, 5).forEach(f => coreFiles.push(f.path));

    // Core components
    filesByType.get('components')?.slice(0, 8).forEach(f => coreFiles.push(f.path));

    return {
      id: 'phase-2',
      name: 'Core Features',
      files: coreFiles.slice(0, 20),
      dependencies: ['phase-1'],
      priority: 2,
      complexity: 5,
    };
  }

  /**
   * Creates feature-specific phases
   */
  private createFeaturePhases(filesByType: Map<string, any[]>, features: any[]): Phase[] {
    const phases: Phase[] = [];
    let phaseNumber = 3;

    // Remaining components
    const remainingComponents = filesByType.get('components')?.slice(8) || [];
    if (remainingComponents.length > 0) {
      phases.push({
        id: `phase-${phaseNumber++}`,
        name: 'UI Components',
        files: remainingComponents.slice(0, 20).map(f => f.path),
        dependencies: ['phase-2'],
        priority: 3,
        complexity: 3,
      });
    }

    // Pages
    const pages = filesByType.get('pages') || [];
    if (pages.length > 0) {
      phases.push({
        id: `phase-${phaseNumber++}`,
        name: 'Pages & Routes',
        files: pages.slice(0, 15).map(f => f.path),
        dependencies: ['phase-2', 'phase-3'],
        priority: 4,
        complexity: 4,
      });
    }

    // Remaining API endpoints
    const remainingAPIs = filesByType.get('api')?.slice(5) || [];
    if (remainingAPIs.length > 0) {
      phases.push({
        id: `phase-${phaseNumber++}`,
        name: 'Advanced API',
        files: remainingAPIs.slice(0, 15).map(f => f.path),
        dependencies: ['phase-2'],
        priority: 5,
        complexity: 6,
      });
    }

    return phases;
  }

  /**
   * Creates polish & optimization phase
   */
  private createPolishPhase(filesByType: Map<string, any[]>): Phase {
    const polishFiles: string[] = [];

    // Tests
    filesByType.get('tests')?.forEach(f => polishFiles.push(f.path));

    // Remaining utils
    filesByType.get('utils')?.slice(5).forEach(f => polishFiles.push(f.path));

    // Other files
    filesByType.get('other')?.forEach(f => polishFiles.push(f.path));

    return {
      id: 'phase-final',
      name: 'Polish & Optimization',
      files: polishFiles,
      dependencies: ['phase-2'],
      priority: 10,
      complexity: 2,
    };
  }

  /**
   * Estimates total time
   */
  private estimateTime(fileCount: number, complexity: string): string {
    const baseMinutes = fileCount * 2; // 2 minutes per file
    
    const complexityMultiplier: Record<string, number> = {
      simple: 0.8,
      moderate: 1.0,
      complex: 1.3,
      enterprise: 1.6,
    };

    const totalMinutes = baseMinutes * complexityMultiplier[complexity];
    
    if (totalMinutes < 60) {
      return `${Math.ceil(totalMinutes)} minutes`;
    }

    const hours = Math.ceil(totalMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}
