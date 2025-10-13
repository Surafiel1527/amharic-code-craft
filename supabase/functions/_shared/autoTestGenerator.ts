/**
 * Auto Test Generator - Generates tests for every feature automatically
 * Integrates with generation pipeline to ensure test coverage
 */

import { callAIWithFallback } from './aiHelpers.ts';
import { FileMetadata } from './generationMetadata.ts';

export interface GeneratedTest {
  filePath: string;
  testContent: string;
  framework: 'jest' | 'vitest' | 'cypress';
  type: 'unit' | 'integration' | 'e2e';
  coverage: string[];
}

/**
 * Generate tests for all generated files
 */
export async function generateTestsForFiles(
  files: FileMetadata[],
  framework: string,
  analysis: any
): Promise<GeneratedTest[]> {
  console.log(`🧪 Generating tests for ${files.length} files...`);
  
  const tests: GeneratedTest[] = [];
  const testableFiles = files.filter(f => 
    f.type === 'component' || 
    f.type === 'hook' || 
    f.type === 'util' || 
    f.type === 'api'
  );
  
  for (const file of testableFiles) {
    try {
      const test = await generateTestForFile(file, framework, analysis);
      if (test) {
        tests.push(test);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to generate test for ${file.path}:`, error);
    }
  }
  
  console.log(`✅ Generated ${tests.length} test files`);
  return tests;
}

/**
 * Generate test for a single file
 */
async function generateTestForFile(
  file: FileMetadata,
  framework: string,
  analysis: any
): Promise<GeneratedTest | null> {
  const testType = determineTestType(file);
  const testFramework = framework === 'react' ? 'vitest' : 'jest';
  
  const prompt = buildTestPrompt(file, testType, testFramework);
  
  const aiResponse = await callAIWithFallback([
    { role: 'system', content: TEST_GENERATION_SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ], {
    preferredModel: 'google/gemini-2.5-flash',
    temperature: 0.3,
    maxTokens: 2000
  });
  
  const testContent = extractTestCode(aiResponse.data);
  if (!testContent) return null;
  
  const testPath = generateTestPath(file.path, testType);
  const coverage = extractCoveredScenarios(testContent);
  
  return {
    filePath: testPath,
    testContent,
    framework: testFramework,
    type: testType,
    coverage
  };
}

/**
 * Determine what type of test to generate
 */
function determineTestType(file: FileMetadata): 'unit' | 'integration' | 'e2e' {
  if (file.type === 'util' || file.type === 'hook') {
    return 'unit';
  }
  if (file.type === 'api') {
    return 'integration';
  }
  if (file.type === 'page') {
    return 'e2e';
  }
  return 'unit'; // Default for components
}

/**
 * Build AI prompt for test generation
 */
function buildTestPrompt(
  file: FileMetadata,
  testType: 'unit' | 'integration' | 'e2e',
  framework: 'jest' | 'vitest' | 'cypress'
): string {
  return `Generate comprehensive ${testType} tests for the following ${file.type}:

**File**: ${file.path}
**Purpose**: ${file.purpose}
**Dependencies**: ${file.dependencies.join(', ')}

**Code to Test**:
\`\`\`${file.language}
${file.content}
\`\`\`

**Test Requirements**:
1. Use ${framework} and ${file.language === 'typescript' ? 'TypeScript' : 'JavaScript'}
2. For React components: Use React Testing Library
3. Test all major functionality and edge cases
4. Include setup and teardown if needed
5. Mock external dependencies
6. Test error handling
7. Ensure 80%+ code coverage

**Test Categories to Include**:
${testType === 'unit' ? `
- Basic functionality tests
- Edge cases and boundary conditions
- Error handling
- Input validation
` : testType === 'integration' ? `
- Component integration
- API endpoint testing
- Database interactions
- State management
` : `
- User flows
- Navigation
- Form submissions
- Error scenarios
`}

Generate ONLY the test code, no explanations. Use proper imports and setup.`;
}

/**
 * System prompt for test generation
 */
const TEST_GENERATION_SYSTEM_PROMPT = `You are an expert test engineer specializing in automated testing.

Generate comprehensive, production-ready tests that:
- Cover all major functionality and edge cases
- Use modern testing best practices
- Include proper mocking and setup
- Test error conditions
- Provide clear, descriptive test names
- Use arrange-act-assert pattern

Return ONLY the test code, no markdown, no explanations.`;

/**
 * Extract test code from AI response
 */
function extractTestCode(aiResponse: any): string | null {
  const content = aiResponse.choices[0].message.content;
  
  // Remove markdown code blocks if present
  const codeBlockMatch = content.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Return as-is if no code block
  return content.trim();
}

/**
 * Generate test file path
 */
function generateTestPath(originalPath: string, testType: 'unit' | 'integration' | 'e2e'): string {
  const pathParts = originalPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const fileNameWithoutExt = fileName.replace(/\.(tsx?|jsx?)$/, '');
  
  if (testType === 'e2e') {
    return `e2e/${fileNameWithoutExt}.spec.ts`;
  }
  
  if (testType === 'integration') {
    return `src/__tests__/integration/${fileNameWithoutExt}.test.ts`;
  }
  
  // Unit tests go next to the file
  const dirPath = pathParts.slice(0, -1).join('/');
  return `${dirPath}/__tests__/${fileNameWithoutExt}.test.ts`;
}

/**
 * Extract what scenarios are covered by the test
 */
function extractCoveredScenarios(testContent: string): string[] {
  const scenarios: string[] = [];
  
  // Extract test descriptions from it(), test(), or describe() blocks
  const testRegex = /(it|test|describe)\(['"](.*?)['"]/g;
  let match;
  
  while ((match = testRegex.exec(testContent)) !== null) {
    scenarios.push(match[2]);
  }
  
  return scenarios;
}

/**
 * Generate test suite setup file
 */
export function generateTestSetup(framework: string): {
  setupFile: string;
  configFile: string;
} {
  const isReact = framework === 'react';
  
  const setupFile = isReact ? `
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
};
` : `
import { afterEach } from 'vitest';

afterEach(() => {
  // Cleanup after each test
});
`;

  const configFile = isReact ? `
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
` : `
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
`;

  return { setupFile, configFile };
}
