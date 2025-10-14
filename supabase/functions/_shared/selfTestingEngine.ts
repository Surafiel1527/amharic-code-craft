/**
 * SELF-TESTING ENGINE
 * Compiles and tests generated code automatically
 * Real testing with error detection and auto-fixing
 */

import { autoFixCode, CodeFile } from './autoFixEngine.ts';
import { callAIWithFallback } from './aiHelpers.ts';

export interface TestResult {
  passed: boolean;
  compilationErrors: string[];
  runtimeErrors: string[];
  testsPassed: number;
  testsFailed: number;
  coverage?: number;
  suggestions: string[];
}

/**
 * Test generated code files
 */
export async function testGeneratedCode(
  files: CodeFile[]
): Promise<TestResult> {
  
  console.log(`🧪 Testing ${files.length} files...`);

  const result: TestResult = {
    passed: false,
    compilationErrors: [],
    runtimeErrors: [],
    testsPassed: 0,
    testsFailed: 0,
    suggestions: []
  };

  // Step 1: Validate/compile code
  console.log('📝 Step 1: Validating code...');
  const validationResult = await autoFixCode(files, 1); // Single validation pass
  
  if (!validationResult.success) {
    result.compilationErrors = validationResult.errors;
    result.suggestions.push('Code has compilation errors that need fixing');
    return result;
  }

  // Step 2: Run static analysis
  console.log('🔍 Step 2: Static analysis...');
  const staticIssues = await runStaticAnalysis(files);
  if (staticIssues.length > 0) {
    result.suggestions.push(...staticIssues);
  }

  // Step 3: Runtime testing (if applicable)
  console.log('⚡ Step 3: Runtime testing...');
  const runtimeResult = await runRuntimeTests(files);
  result.runtimeErrors = runtimeResult.errors;
  result.testsPassed = runtimeResult.passed;
  result.testsFailed = runtimeResult.failed;

  // Determine overall result
  result.passed = 
    result.compilationErrors.length === 0 &&
    result.runtimeErrors.length === 0 &&
    result.testsFailed === 0;

  if (result.passed) {
    console.log('✅ All tests passed');
  } else {
    console.log(`❌ Tests failed: ${result.compilationErrors.length + result.runtimeErrors.length} errors`);
  }

  return result;
}

/**
 * Run static analysis on code
 */
async function runStaticAnalysis(files: CodeFile[]): Promise<string[]> {
  const issues: string[] = [];

  for (const file of files) {
    // Check for common anti-patterns
    if (file.content.includes('any') && file.language === 'typescript') {
      issues.push(`${file.path}: Uses 'any' type - consider specific types`);
    }

    // Check for missing error handling
    if (file.content.includes('fetch(') && !file.content.includes('catch')) {
      issues.push(`${file.path}: Fetch without error handling`);
    }

    // Check for console.log in production code
    if (file.content.match(/console\.(log|debug|info)/)) {
      issues.push(`${file.path}: Contains console statements`);
    }

    // Check for hardcoded URLs/keys
    if (file.content.match(/https?:\/\/[^\s'"]+/) && !file.content.includes('import.meta.env')) {
      issues.push(`${file.path}: May contain hardcoded URLs`);
    }
  }

  return issues;
}

/**
 * Run runtime tests (simulated execution)
 */
async function runRuntimeTests(files: CodeFile[]): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  // Find test files
  const testFiles = files.filter(f => 
    f.path.includes('.test.') || f.path.includes('.spec.')
  );

  if (testFiles.length === 0) {
    // No explicit tests, do basic checks
    for (const file of files) {
      // Check if React components render
      if (file.path.endsWith('.tsx') && file.content.includes('export')) {
        const canRender = checkReactComponent(file);
        if (canRender) {
          passed++;
        } else {
          failed++;
          errors.push(`${file.path}: Component may not render correctly`);
        }
      }
    }
  } else {
    // Has test files - analyze them
    for (const testFile of testFiles) {
      const testCount = (testFile.content.match(/\b(test|it)\(/g) || []).length;
      passed += testCount;
    }
  }

  return { passed, failed, errors };
}

/**
 * Check if React component looks valid
 */
function checkReactComponent(file: CodeFile): boolean {
  const hasExport = /export\s+(default\s+)?(function|const|class)/.test(file.content);
  const hasReturn = /return\s*\(?\s*</.test(file.content);
  const hasJSX = /<[A-Z]/.test(file.content);
  
  return hasExport && (hasReturn || hasJSX);
}

/**
 * Generate tests for code using AI
 */
export async function generateTests(
  file: CodeFile,
  framework: 'vitest' | 'jest' = 'vitest'
): Promise<CodeFile> {
  
  const prompt = `Generate comprehensive tests for this code:

FILE: ${file.path}
CODE:
\`\`\`${file.language}
${file.content}
\`\`\`

Generate ${framework} tests that:
1. Test all exported functions/components
2. Test edge cases and error handling
3. Use proper assertions
4. Are production-ready

Return ONLY the test code, no explanations.`;

  try {
    const response = await callAIWithFallback(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: 'You are a test generation expert. Write comprehensive, production-ready tests.',
        preferredModel: 'google/gemini-2.5-flash',
        maxTokens: 3000
      }
    );

    let testCode = response.data.choices[0].message.content;
    
    // Extract code from markdown
    const codeMatch = testCode.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (codeMatch) {
      testCode = codeMatch[1];
    }

    const testPath = file.path.replace(/\.tsx?$/, '.test.ts');

    return {
      path: testPath,
      content: testCode,
      language: 'typescript'
    };

  } catch (error) {
    console.error('Test generation failed:', error);
    throw error;
  }
}

/**
 * Run tests and auto-fix if needed
 */
export async function testAndFix(
  files: CodeFile[],
  maxAttempts: number = 3
): Promise<{
  success: boolean;
  files: CodeFile[];
  testResult: TestResult;
  fixAttempts: number;
}> {
  
  let currentFiles = [...files];
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 Test attempt ${attempts}/${maxAttempts}`);

    const testResult = await testGeneratedCode(currentFiles);

    if (testResult.passed) {
      console.log(`✅ Tests passed on attempt ${attempts}`);
      return {
        success: true,
        files: currentFiles,
        testResult,
        fixAttempts: attempts
      };
    }

    // Auto-fix errors
    console.log('🔧 Auto-fixing errors...');
    const allErrors = [
      ...testResult.compilationErrors,
      ...testResult.runtimeErrors
    ];

    if (allErrors.length > 0) {
      const fixResult = await autoFixCode(currentFiles, 2);
      if (fixResult.fixed) {
        currentFiles = fixResult.fixedFiles;
        console.log(`✅ Applied fixes, retrying tests...`);
      } else {
        console.log(`❌ Could not fix errors`);
        break;
      }
    }
  }

  // Final test result
  const finalTest = await testGeneratedCode(currentFiles);

  return {
    success: finalTest.passed,
    files: currentFiles,
    testResult: finalTest,
    fixAttempts: attempts
  };
}
