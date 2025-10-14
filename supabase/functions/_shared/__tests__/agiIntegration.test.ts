import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { AGIIntegration } from '../agiIntegration.ts';

const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: {}, error: null })
      })
    }),
    insert: () => Promise.resolve({ data: {}, error: null })
  })
};

Deno.test('AGIIntegration - initializes with all capabilities', () => {
  const agi = new AGIIntegration(mockSupabase as any);
  assertExists(agi);
});

Deno.test('AGIIntegration - analyzes codebase structure', async () => {
  const agi = new AGIIntegration(mockSupabase as any);
  
  const analysis = await agi.analyzeCodebase('proj-123');
  
  assertExists(analysis);
  assertEquals(typeof analysis.files, 'number');
  assertEquals(typeof analysis.components, 'number');
});

Deno.test('AGIIntegration - detects issues in code', async () => {
  const agi = new AGIIntegration(mockSupabase as any);
  
  const issues = await agi.detectIssues('proj-123');
  
  assertExists(issues);
  assertEquals(Array.isArray(issues), true);
});

Deno.test('AGIIntegration - suggests improvements', async () => {
  const agi = new AGIIntegration(mockSupabase as any);
  
  const suggestions = await agi.suggestImprovements('proj-123', []);
  
  assertExists(suggestions);
  assertEquals(Array.isArray(suggestions), true);
});

Deno.test('AGIIntegration - applies fixes automatically', async () => {
  const agi = new AGIIntegration(mockSupabase as any);
  
  const result = await agi.applyFix('proj-123', 'issue-123');
  
  assertExists(result);
  assertEquals(typeof result.success, 'boolean');
});
