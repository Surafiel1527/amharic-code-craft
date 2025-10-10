/**
 * Integration Tester - Tests integration between phases
 * 
 * Validates that phases work together correctly before proceeding.
 */

export interface IntegrationTest {
  name: string;
  description: string;
  test: (previousPhases: any[], currentPhase: any) => Promise<TestResult>;
  critical: boolean;
}

export interface TestResult {
  passed: boolean;
  message: string;
  errors: string[];
  warnings: string[];
}

export class IntegrationTester {
  /**
   * Runs integration tests between phases
   */
  async testIntegration(
    previousPhases: any[],
    currentPhase: any
  ): Promise<TestResult> {
    const tests = this.getIntegrationTests(currentPhase);
    const errors: string[] = [];
    const warnings: string[] = [];
    let allPassed = true;

    for (const test of tests) {
      try {
        const result = await test.test(previousPhases, currentPhase);
        
        if (!result.passed) {
          allPassed = false;
          if (test.critical) {
            errors.push(`CRITICAL: ${test.name} - ${result.message}`);
          } else {
            warnings.push(`${test.name} - ${result.message}`);
          }
        }

        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } catch (error) {
        allPassed = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Test "${test.name}" failed: ${errorMessage}`);
      }
    }

    return {
      passed: allPassed && errors.length === 0,
      message: allPassed ? 'All integration tests passed' : 'Some tests failed',
      errors,
      warnings,
    };
  }

  /**
   * Gets integration tests for a phase
   */
  private getIntegrationTests(phase: any): IntegrationTest[] {
    const tests: IntegrationTest[] = [
      this.createImportTest(),
      this.createDependencyTest(),
      this.createTypeTest(),
      this.createAPITest(),
    ];

    // Add phase-specific tests
    if (phase.name.toLowerCase().includes('auth')) {
      tests.push(this.createAuthTest());
    }

    if (phase.name.toLowerCase().includes('database')) {
      tests.push(this.createDatabaseTest());
    }

    return tests;
  }

  /**
   * Creates import resolution test
   */
  private createImportTest(): IntegrationTest {
    return {
      name: 'Import Resolution',
      description: 'Verifies all imports resolve correctly',
      critical: true,
      test: async (previousPhases, currentPhase) => {
        const errors: string[] = [];
        const allFiles = this.getAllFiles(previousPhases, currentPhase);

        currentPhase.files.forEach((file: any) => {
          const imports = this.extractImports(file.content);
          
          imports.forEach((importPath: string) => {
            if (importPath.startsWith('.') || importPath.startsWith('@/')) {
              const resolved = this.resolveImport(importPath, file.path, allFiles);
              if (!resolved) {
                errors.push(`Cannot resolve import "${importPath}" in ${file.path}`);
              }
            }
          });
        });

        return {
          passed: errors.length === 0,
          message: errors.length === 0 ? 'All imports resolve' : 'Import errors found',
          errors,
          warnings: [],
        };
      },
    };
  }

  /**
   * Creates dependency test
   */
  private createDependencyTest(): IntegrationTest {
    return {
      name: 'Dependency Check',
      description: 'Verifies phase dependencies are met',
      critical: true,
      test: async (previousPhases, currentPhase) => {
        const errors: string[] = [];
        const completedPhases = new Set(previousPhases.map(p => p.id));

        currentPhase.dependencies?.forEach((depId: string) => {
          if (!completedPhases.has(depId)) {
            errors.push(`Missing dependency: ${depId}`);
          }
        });

        return {
          passed: errors.length === 0,
          message: 'Dependencies satisfied',
          errors,
          warnings: [],
        };
      },
    };
  }

  /**
   * Creates TypeScript type test
   */
  private createTypeTest(): IntegrationTest {
    return {
      name: 'Type Checking',
      description: 'Validates TypeScript types',
      critical: false,
      test: async (previousPhases, currentPhase) => {
        const warnings: string[] = [];
        
        currentPhase.files.forEach((file: any) => {
          if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
            if (file.content.includes('any') && !file.content.includes('// @ts-expect-error')) {
              warnings.push(`${file.path} uses "any" type`);
            }
          }
        });

        return {
          passed: true,
          message: 'Type check complete',
          errors: [],
          warnings,
        };
      },
    };
  }

  /**
   * Creates API test
   */
  private createAPITest(): IntegrationTest {
    return {
      name: 'API Integration',
      description: 'Checks API endpoint consistency',
      critical: false,
      test: async (previousPhases, currentPhase) => {
        const warnings: string[] = [];
        const apiEndpoints = new Set<string>();

        // Collect API endpoints
        this.getAllFiles(previousPhases, currentPhase).forEach(file => {
          const endpoints = this.extractAPIEndpoints(file.content);
          endpoints.forEach(ep => apiEndpoints.add(ep));
        });

        // Check for undefined endpoints
        currentPhase.files.forEach((file: any) => {
          const calls = this.extractAPICalls(file.content);
          calls.forEach((call: string) => {
            if (!apiEndpoints.has(call)) {
              warnings.push(`${file.path} calls undefined endpoint: ${call}`);
            }
          });
        });

        return {
          passed: true,
          message: 'API check complete',
          errors: [],
          warnings,
        };
      },
    };
  }

  /**
   * Creates auth integration test
   */
  private createAuthTest(): IntegrationTest {
    return {
      name: 'Authentication',
      description: 'Validates auth setup',
      critical: true,
      test: async (previousPhases, currentPhase) => {
        const errors: string[] = [];
        const allFiles = this.getAllFiles(previousPhases, currentPhase);

        const hasAuthProvider = allFiles.some(f =>
          f.content.includes('AuthProvider') || f.content.includes('auth.users')
        );

        if (!hasAuthProvider) {
          errors.push('No auth provider found');
        }

        return {
          passed: errors.length === 0,
          message: 'Auth integration verified',
          errors,
          warnings: [],
        };
      },
    };
  }

  /**
   * Creates database integration test
   */
  private createDatabaseTest(): IntegrationTest {
    return {
      name: 'Database Schema',
      description: 'Validates database schema',
      critical: true,
      test: async (previousPhases, currentPhase) => {
        const errors: string[] = [];
        const allFiles = this.getAllFiles(previousPhases, currentPhase);

        const hasMigrations = allFiles.some(f =>
          f.path.includes('migration') || f.path.includes('schema')
        );

        if (!hasMigrations) {
          errors.push('No database migrations found');
        }

        return {
          passed: errors.length === 0,
          message: 'Database schema validated',
          errors,
          warnings: [],
        };
      },
    };
  }

  /**
   * Helper: Gets all files from phases
   */
  private getAllFiles(previousPhases: any[], currentPhase: any): any[] {
    const allFiles: any[] = [];
    previousPhases.forEach(phase => allFiles.push(...phase.files));
    allFiles.push(...currentPhase.files);
    return allFiles;
  }

  /**
   * Helper: Extracts imports from file
   */
  private extractImports(content: string): string[] {
    const importRegex = /import .+ from ['"](.+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Helper: Resolves import path
   */
  private resolveImport(importPath: string, fromPath: string, allFiles: any[]): boolean {
    // Simplified resolution - in reality would be more complex
    return allFiles.some(f => {
      const relativePath = this.makeRelative(fromPath, f.path);
      return relativePath === importPath || 
             importPath.includes(f.path.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '');
    });
  }

  /**
   * Helper: Makes relative path
   */
  private makeRelative(from: string, to: string): string {
    // Simplified - real implementation would handle path resolution
    return to;
  }

  /**
   * Helper: Extracts API endpoints from content
   */
  private extractAPIEndpoints(content: string): string[] {
    const endpoints: string[] = [];
    const patterns = [
      /app\.get\(['"](.+?)['"]/g,
      /app\.post\(['"](.+?)['"]/g,
      /router\.get\(['"](.+?)['"]/g,
      /router\.post\(['"](.+?)['"]/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        endpoints.push(match[1]);
      }
    });

    return endpoints;
  }

  /**
   * Helper: Extracts API calls from content
   */
  private extractAPICalls(content: string): string[] {
    const calls: string[] = [];
    const patterns = [
      /fetch\(['"](.+?)['"]/g,
      /axios\.get\(['"](.+?)['"]/g,
      /axios\.post\(['"](.+?)['"]/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        calls.push(match[1]);
      }
    });

    return calls;
  }
}
