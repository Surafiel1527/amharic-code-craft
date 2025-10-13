/**
 * Post-Generation Quality Validator
 * 
 * Validates that generated code meets quality standards:
 * - Framework completeness (all required files present)
 * - File tree display requirements
 * - Preview renderability
 * - Production readiness
 */

export interface QualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'framework_incomplete' | 'missing_infrastructure' | 'preview_issue' | 'file_tree_issue';
  description: string;
  missingFiles?: string[];
  suggestedFix?: string;
}

export interface QualityReport {
  passed: boolean;
  qualityScore: number; // 0-100
  issues: QualityIssue[];
  frameworkComplete: boolean;
  previewRenderable: boolean;
  fileTreeComplete: boolean;
  requiredFilesMissing: string[];
  optionalFilesMissing: string[];
}

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

/**
 * Validate post-generation quality
 */
export async function validatePostGeneration(
  files: GeneratedFile[],
  framework: string,
  request: string,
  logger?: any
): Promise<QualityReport> {
  const log = logger || console;
  log.info(`POST-GENERATION VALIDATION: Checking ${files.length} ${framework} files`);

  const issues: QualityIssue[] = [];
  let qualityScore = 100;

  // Get framework requirements
  const requirements = getFrameworkRequirements(framework);
  
  // Check 1: Framework Completeness
  const { complete: frameworkComplete, missing: requiredMissing } = checkFrameworkCompleteness(
    files,
    requirements.required
  );

  if (!frameworkComplete) {
    const issue: QualityIssue = {
      severity: 'critical',
      category: 'framework_incomplete',
      description: `Missing ${requiredMissing.length} critical ${framework} files`,
      missingFiles: requiredMissing,
      suggestedFix: `Add missing files: ${requiredMissing.join(', ')}`
    };
    issues.push(issue);
    qualityScore -= 40;
    console.error(`❌ Framework Incomplete: Missing ${requiredMissing.join(', ')}`);
  } else {
    console.log(`✅ Framework Complete: All required files present`);
  }

  // Check 2: Optional Infrastructure Files
  const { missing: optionalMissing } = checkFrameworkCompleteness(
    files,
    requirements.optional
  );

  if (optionalMissing.length > 0) {
    const issue: QualityIssue = {
      severity: 'medium',
      category: 'missing_infrastructure',
      description: `Missing ${optionalMissing.length} recommended files`,
      missingFiles: optionalMissing,
      suggestedFix: `Consider adding: ${optionalMissing.join(', ')}`
    };
    issues.push(issue);
    qualityScore -= 10;
    console.warn(`⚠️ Optional files missing: ${optionalMissing.join(', ')}`);
  }

  // Check 3: File Tree Display
  const fileTreeComplete = checkFileTreeRequirements(files, framework);
  if (!fileTreeComplete) {
    const issue: QualityIssue = {
      severity: 'high',
      category: 'file_tree_issue',
      description: 'File structure may not display correctly in file tree',
      suggestedFix: 'Ensure proper file hierarchy and naming'
    };
    issues.push(issue);
    qualityScore -= 20;
    console.warn(`⚠️ File tree structure incomplete`);
  }

  // Check 4: Preview Renderability
  const previewRenderable = checkPreviewRenderable(files, framework);
  if (!previewRenderable) {
    const issue: QualityIssue = {
      severity: 'critical',
      category: 'preview_issue',
      description: 'Generated code may not render correctly in preview',
      suggestedFix: 'Ensure entry point and dependencies are correct'
    };
    issues.push(issue);
    qualityScore -= 30;
    console.error(`❌ Preview may not render correctly`);
  } else {
    console.log(`✅ Preview should render correctly`);
  }

  const passed = qualityScore >= 70 && frameworkComplete && previewRenderable;

  const report: QualityReport = {
    passed,
    qualityScore: Math.max(0, qualityScore),
    issues,
    frameworkComplete,
    previewRenderable,
    fileTreeComplete,
    requiredFilesMissing: requiredMissing,
    optionalFilesMissing: optionalMissing
  };

  console.log(`📊 QUALITY SCORE: ${report.qualityScore}/100 ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Framework: ${frameworkComplete ? '✅' : '❌'} | Preview: ${previewRenderable ? '✅' : '❌'} | File Tree: ${fileTreeComplete ? '✅' : '❌'}`);

  return report;
}

/**
 * Get framework-specific file requirements
 */
function getFrameworkRequirements(framework: string): {
  required: string[];
  optional: string[];
} {
  switch (framework.toLowerCase()) {
    case 'react':
      return {
        required: [
          'index.html',
          'package.json',
          'vite.config.ts',
          'tsconfig.json',
          'src/main.tsx',
          'src/App.tsx',
          'src/index.css'
        ],
        optional: [
          'tsconfig.node.json',
          'tailwind.config.js',
          'postcss.config.js',
          '.gitignore',
          'README.md'
        ]
      };
    
    case 'html':
      return {
        required: [
          'index.html'
        ],
        optional: [
          'styles.css',
          'style.css',
          'script.js',
          'main.js'
        ]
      };
    
    default:
      return {
        required: ['index.html'],
        optional: []
      };
  }
}

/**
 * Check if all required files are present
 */
function checkFrameworkCompleteness(
  files: GeneratedFile[],
  requiredFiles: string[]
): { complete: boolean; missing: string[] } {
  const presentFiles = new Set(files.map(f => f.path.toLowerCase()));
  const missing = requiredFiles.filter(
    required => !presentFiles.has(required.toLowerCase())
  );

  return {
    complete: missing.length === 0,
    missing
  };
}

/**
 * Check if file tree will display correctly
 */
function checkFileTreeRequirements(files: GeneratedFile[], framework: string): boolean {
  // Basic check: ensure we have at least 2 files for tree display
  if (files.length < 2) {
    return false;
  }

  // Framework-specific checks
  if (framework === 'react') {
    // React needs src/ directory structure
    const hasSrcFiles = files.some(f => f.path.startsWith('src/'));
    const hasRootFiles = files.some(f => !f.path.includes('/'));
    return hasSrcFiles && hasRootFiles;
  }

  if (framework === 'html') {
    // HTML should have at least index.html
    return files.some(f => f.path.toLowerCase() === 'index.html');
  }

  return true;
}

/**
 * Check if generated code will render in preview
 */
function checkPreviewRenderable(files: GeneratedFile[], framework: string): boolean {
  switch (framework.toLowerCase()) {
    case 'react': {
      // React needs: index.html, main entry point, and App component
      const hasIndexHtml = files.some(f => f.path.toLowerCase() === 'index.html');
      const hasMainEntry = files.some(f => 
        f.path.toLowerCase() === 'src/main.tsx' || 
        f.path.toLowerCase() === 'src/index.tsx'
      );
      const hasAppComponent = files.some(f => 
        f.path.toLowerCase() === 'src/app.tsx' ||
        f.path.toLowerCase() === 'src/app.jsx'
      );

      if (!hasIndexHtml || !hasMainEntry || !hasAppComponent) {
        console.log(`Preview check: indexHtml=${hasIndexHtml}, mainEntry=${hasMainEntry}, app=${hasAppComponent}`);
        return false;
      }

      // Check if index.html references the entry point
      const indexFile = files.find(f => f.path.toLowerCase() === 'index.html');
      if (indexFile && !indexFile.content.includes('src/main.tsx')) {
        console.log(`Preview check: index.html doesn't reference src/main.tsx`);
        return false;
      }

      return true;
    }

    case 'html': {
      // HTML needs index.html with proper structure
      const indexFile = files.find(f => f.path.toLowerCase() === 'index.html');
      if (!indexFile) return false;

      const hasDoctype = indexFile.content.toLowerCase().includes('<!doctype html>');
      const hasHtmlTag = indexFile.content.toLowerCase().includes('<html');
      const hasBody = indexFile.content.toLowerCase().includes('<body');

      return hasDoctype && hasHtmlTag && hasBody;
    }

    default:
      return true;
  }
}

/**
 * Get human-readable quality report
 */
export function formatQualityReport(report: QualityReport): string {
  let output = `\n📊 POST-GENERATION QUALITY REPORT\n`;
  output += `═══════════════════════════════════\n`;
  output += `Overall Score: ${report.qualityScore}/100 ${report.passed ? '✅' : '❌'}\n\n`;

  output += `Framework Complete: ${report.frameworkComplete ? '✅' : '❌'}\n`;
  output += `Preview Renderable: ${report.previewRenderable ? '✅' : '❌'}\n`;
  output += `File Tree Complete: ${report.fileTreeComplete ? '✅' : '❌'}\n\n`;

  if (report.issues.length > 0) {
    output += `Issues Found (${report.issues.length}):\n`;
    report.issues.forEach((issue, i) => {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🔵';
      output += `${i + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.description}\n`;
      if (issue.missingFiles && issue.missingFiles.length > 0) {
        output += `   Missing: ${issue.missingFiles.join(', ')}\n`;
      }
      if (issue.suggestedFix) {
        output += `   Fix: ${issue.suggestedFix}\n`;
      }
    });
  } else {
    output += `✅ No issues found!\n`;
  }

  return output;
}
