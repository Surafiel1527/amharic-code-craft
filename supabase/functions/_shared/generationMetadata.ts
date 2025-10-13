/**
 * Generation Metadata - Structured output for all AI generations
 * Provides ApexBuilder-style JSON metadata for transparency and tracking
 */

export interface TechStack {
  frontend: string[];
  backend: string[];
  database: string[];
  other: string[];
}

export interface FileMetadata {
  path: string;
  content: string;
  language: string;
  imports: string[];
  purpose: string;
  type: 'component' | 'hook' | 'util' | 'api' | 'page' | 'config' | 'test' | 'style';
  dependencies: string[];
  testCoverage?: number;
}

export interface DeploymentOption {
  platform: string;
  instructions: string;
  cliCommands?: string[];
  envVarsRequired?: string[];
  estimatedTime?: string;
}

export interface OptimizationSuggestion {
  category: 'performance' | 'security' | 'accessibility' | 'seo' | 'ux';
  priority: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  impact: string;
  implementationSteps?: string[];
}

export interface ProactiveSuggestion {
  title: string;
  description: string;
  category: string;
  estimatedTime: string;
  prerequisites: string[];
  benefits: string[];
}

export interface GenerationMetadata {
  projectName: string;
  description: string;
  techStack: TechStack;
  files: FileMetadata[];
  
  // Dependencies
  dependencies: {
    installCommands: string[];
    packageList: string[];
    devDependencies?: string[];
  };
  
  // Setup and deployment
  setupInstructions: string[];
  deployment: {
    options: DeploymentOption[];
    recommended: string;
  };
  
  // Testing
  tests: {
    generated: string[];
    coverage: number;
    frameworks: string[];
    instructions: string;
  };
  
  // Quality and optimization
  optimizations: OptimizationSuggestion[];
  securityAudit: {
    checks: string[];
    vulnerabilities: string[];
    recommendations: string[];
  };
  
  // Proactive suggestions
  suggestions: ProactiveSuggestion[];
  
  // Metrics
  metrics: {
    totalFiles: number;
    totalLines: number;
    estimatedBuildTime: string;
    complexityScore: number;
    performanceScore?: number;
  };
  
  // Generation context
  generationContext: {
    userRequest: string;
    framework: string;
    generatedAt: string;
    generationTimeMs: number;
    aiModel: string;
    confidenceScore: number;
  };
}

/**
 * Create metadata from generation result
 */
export function createGenerationMetadata(ctx: {
  request: string;
  framework: string;
  analysis: any;
  generatedCode: any;
  startTime: number;
  validationResult: any;
  autoFixResult?: any;
}): GenerationMetadata {
  const { request, framework, analysis, generatedCode, startTime, validationResult, autoFixResult } = ctx;
  
  const files: FileMetadata[] = generatedCode.files.map((f: any) => ({
    path: f.path,
    content: f.content,
    language: f.language || 'typescript',
    imports: f.imports || [],
    purpose: detectFilePurpose(f.path, f.content),
    type: detectFileType(f.path),
    dependencies: extractDependencies(f.content),
    testCoverage: 0
  }));
  
  const techStack = detectTechStack(framework, analysis, files);
  const optimizations = generateOptimizations(framework, analysis, validationResult);
  const suggestions = generateProactiveSuggestions(framework, analysis, files);
  const deploymentOptions = generateDeploymentOptions(framework, analysis);
  
  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
  const complexityScore = calculateComplexityScore(files, analysis);
  
  return {
    projectName: analysis.projectName || 'Untitled Project',
    description: analysis.description || `${framework} application built with AI`,
    techStack,
    files,
    
    dependencies: {
      installCommands: generateInstallCommands(framework, files),
      packageList: extractPackageList(files),
      devDependencies: extractDevDependencies(files)
    },
    
    setupInstructions: generateSetupInstructions(framework, files),
    deployment: {
      options: deploymentOptions,
      recommended: deploymentOptions[0]?.platform || 'Vercel'
    },
    
    tests: {
      generated: files.filter(f => f.type === 'test').map(f => f.path),
      coverage: calculateTestCoverage(files),
      frameworks: detectTestFrameworks(files),
      instructions: generateTestInstructions(framework)
    },
    
    optimizations,
    securityAudit: {
      checks: ['XSS protection', 'CSRF tokens', 'Input validation', 'Secure dependencies'],
      vulnerabilities: validationResult.errors || [],
      recommendations: autoFixResult?.fixedErrorTypes || []
    },
    
    suggestions,
    
    metrics: {
      totalFiles: files.length,
      totalLines,
      estimatedBuildTime: estimateBuildTime(files.length),
      complexityScore,
      performanceScore: calculatePerformanceScore(files)
    },
    
    generationContext: {
      userRequest: request,
      framework,
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startTime,
      aiModel: 'google/gemini-2.5-flash',
      confidenceScore: analysis.confidence || 0.8
    }
  };
}

// Helper functions

function detectFilePurpose(path: string, content: string): string {
  if (path.includes('test')) return 'Testing and quality assurance';
  if (path.includes('component')) return 'UI component for user interface';
  if (path.includes('hook')) return 'React hook for state and logic management';
  if (path.includes('util')) return 'Utility functions and helpers';
  if (path.includes('api')) return 'API endpoints and backend logic';
  if (path.includes('page')) return 'Page component for routing';
  if (path.includes('config')) return 'Configuration and setup';
  return 'Application logic and functionality';
}

function detectFileType(path: string): FileMetadata['type'] {
  if (path.includes('test.')) return 'test';
  if (path.includes('/hooks/')) return 'hook';
  if (path.includes('/utils/') || path.includes('/lib/')) return 'util';
  if (path.includes('/api/') || path.includes('/functions/')) return 'api';
  if (path.includes('/pages/')) return 'page';
  if (path.includes('config') || path.includes('.config.')) return 'config';
  if (path.endsWith('.css') || path.endsWith('.scss')) return 'style';
  return 'component';
}

function extractDependencies(content: string): string[] {
  const importRegex = /import .+ from ['"](.+)['"]/g;
  const deps: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const dep = match[1];
    if (!dep.startsWith('.') && !dep.startsWith('/')) {
      deps.push(dep.split('/')[0]);
    }
  }
  return [...new Set(deps)];
}

function detectTechStack(framework: string, analysis: any, files: FileMetadata[]): TechStack {
  const stack: TechStack = {
    frontend: [],
    backend: [],
    database: [],
    other: []
  };
  
  if (framework === 'react') {
    stack.frontend = ['React', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'];
  } else if (framework === 'html') {
    stack.frontend = ['HTML5', 'CSS3', 'Vanilla JavaScript'];
  }
  
  if (analysis.backendRequirements?.needsDatabase) {
    stack.backend.push('Supabase Edge Functions');
    stack.database.push('PostgreSQL (Supabase)');
  }
  
  if (analysis.backendRequirements?.needsAuth) {
    stack.backend.push('Supabase Auth');
  }
  
  if (analysis.backendRequirements?.needsStorage) {
    stack.backend.push('Supabase Storage');
  }
  
  stack.other = ['Vite', 'ESLint', 'Docker'];
  
  return stack;
}

function generateOptimizations(framework: string, analysis: any, validationResult: any): OptimizationSuggestion[] {
  const opts: OptimizationSuggestion[] = [
    {
      category: 'performance',
      priority: 'high',
      suggestion: 'Implement lazy loading for components',
      impact: 'Reduces initial bundle size by 30-40%',
      implementationSteps: [
        'Use React.lazy() for route-based code splitting',
        'Add Suspense boundaries with loading states',
        'Configure Vite for chunk optimization'
      ]
    },
    {
      category: 'performance',
      priority: 'medium',
      suggestion: 'Add Redis caching for API responses',
      impact: 'Reduces API response time by 60-80%'
    },
    {
      category: 'security',
      priority: 'critical',
      suggestion: 'Enable HTTPS and security headers',
      impact: 'Prevents XSS and CSRF attacks',
      implementationSteps: [
        'Configure Content Security Policy',
        'Add X-Frame-Options header',
        'Enable HSTS'
      ]
    },
    {
      category: 'accessibility',
      priority: 'high',
      suggestion: 'Add ARIA labels and keyboard navigation',
      impact: 'Makes app accessible to screen readers and keyboard users'
    },
    {
      category: 'seo',
      priority: 'medium',
      suggestion: 'Implement server-side rendering or static generation',
      impact: 'Improves SEO and initial page load time'
    }
  ];
  
  if (validationResult.warnings?.length > 0) {
    opts.push({
      category: 'security',
      priority: 'medium',
      suggestion: 'Fix validation warnings',
      impact: 'Improves code quality and prevents potential bugs'
    });
  }
  
  return opts;
}

function generateProactiveSuggestions(framework: string, analysis: any, files: FileMetadata[]): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  
  if (!files.some(f => f.type === 'test')) {
    suggestions.push({
      title: 'Add automated testing',
      description: 'Set up Jest and React Testing Library for comprehensive test coverage',
      category: 'quality',
      estimatedTime: '30-45 minutes',
      prerequisites: ['Install testing dependencies'],
      benefits: [
        'Catch bugs early in development',
        'Enable confident refactoring',
        'Improve code quality',
        'Facilitate CI/CD integration'
      ]
    });
  }
  
  if (analysis.backendRequirements?.needsDatabase) {
    suggestions.push({
      title: 'Add database migrations and seeding',
      description: 'Set up proper database version control and test data',
      category: 'backend',
      estimatedTime: '20-30 minutes',
      prerequisites: ['Database connection configured'],
      benefits: [
        'Version control for database schema',
        'Easy rollback capabilities',
        'Consistent development environments'
      ]
    });
  }
  
  suggestions.push({
    title: 'Implement analytics and monitoring',
    description: 'Add Sentry for error tracking and Google Analytics for user insights',
    category: 'monitoring',
    estimatedTime: '15-20 minutes',
    prerequisites: ['Sentry account', 'GA account'],
    benefits: [
      'Real-time error notifications',
      'User behavior insights',
      'Performance monitoring'
    ]
  });
  
  suggestions.push({
    title: 'Add internationalization (i18n)',
    description: 'Support multiple languages with react-i18next',
    category: 'features',
    estimatedTime: '45-60 minutes',
    prerequisites: ['Define target languages'],
    benefits: [
      'Reach global audience',
      'Improve user experience',
      'Increase market potential'
    ]
  });
  
  return suggestions;
}

function generateDeploymentOptions(framework: string, analysis: any): DeploymentOption[] {
  const options: DeploymentOption[] = [
    {
      platform: 'Vercel',
      instructions: 'Connect GitHub repo and deploy with zero configuration',
      cliCommands: ['npm install -g vercel', 'vercel --prod'],
      envVarsRequired: analysis.backendRequirements?.needsDatabase 
        ? ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
        : [],
      estimatedTime: '5 minutes'
    },
    {
      platform: 'Netlify',
      instructions: 'Deploy via GitHub integration or drag-and-drop',
      cliCommands: ['npm install -g netlify-cli', 'netlify deploy --prod'],
      envVarsRequired: analysis.backendRequirements?.needsDatabase 
        ? ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
        : [],
      estimatedTime: '5 minutes'
    },
    {
      platform: 'AWS (EC2 + S3)',
      instructions: 'Deploy to EC2 instance with S3 for static assets',
      cliCommands: [
        'npm run build',
        'aws s3 sync dist/ s3://your-bucket',
        'aws cloudfront create-invalidation'
      ],
      envVarsRequired: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
      estimatedTime: '30 minutes'
    }
  ];
  
  return options;
}

function generateInstallCommands(framework: string, files: FileMetadata[]): string[] {
  if (framework === 'react') {
    return ['npm install'];
  }
  return ['# No dependencies required for vanilla HTML/CSS/JS'];
}

function extractPackageList(files: FileMetadata[]): string[] {
  const packages = new Set<string>();
  files.forEach(f => f.dependencies.forEach(d => packages.add(d)));
  return Array.from(packages).sort();
}

function extractDevDependencies(files: FileMetadata[]): string[] {
  return ['@types/react', '@types/node', 'vite', 'eslint', 'typescript'];
}

function generateSetupInstructions(framework: string, files: FileMetadata[]): string[] {
  const instructions = [
    '1. Clone the repository',
    '2. Run `npm install` to install dependencies',
    '3. Create a `.env` file with required environment variables',
    '4. Run `npm run dev` to start development server',
    '5. Open http://localhost:5173 in your browser'
  ];
  
  return instructions;
}

function calculateTestCoverage(files: FileMetadata[]): number {
  const testFiles = files.filter(f => f.type === 'test').length;
  const codeFiles = files.filter(f => f.type !== 'test' && f.type !== 'style' && f.type !== 'config').length;
  return codeFiles > 0 ? Math.round((testFiles / codeFiles) * 100) : 0;
}

function detectTestFrameworks(files: FileMetadata[]): string[] {
  const frameworks = new Set<string>();
  files.forEach(f => {
    if (f.content.includes('@testing-library')) frameworks.add('React Testing Library');
    if (f.content.includes('jest')) frameworks.add('Jest');
    if (f.content.includes('vitest')) frameworks.add('Vitest');
    if (f.content.includes('cypress')) frameworks.add('Cypress');
  });
  return Array.from(frameworks);
}

function generateTestInstructions(framework: string): string {
  return 'Run `npm test` to execute all tests. Use `npm run test:coverage` for coverage reports.';
}

function estimateBuildTime(fileCount: number): string {
  const minutes = Math.ceil(fileCount * 0.5);
  return `${minutes}-${minutes + 5} minutes`;
}

function calculateComplexityScore(files: FileMetadata[], analysis: any): number {
  let score = files.length * 2;
  if (analysis.backendRequirements?.needsDatabase) score += 20;
  if (analysis.backendRequirements?.needsAuth) score += 15;
  if (analysis.backendRequirements?.needsEdgeFunctions) score += 10;
  return Math.min(100, score);
}

function calculatePerformanceScore(files: FileMetadata[]): number {
  // Simple heuristic: fewer files and smaller code = better performance
  const avgFileSize = files.reduce((sum, f) => sum + f.content.length, 0) / files.length;
  const sizeScore = Math.max(0, 100 - (avgFileSize / 1000));
  const countScore = Math.max(0, 100 - files.length);
  return Math.round((sizeScore + countScore) / 2);
}
