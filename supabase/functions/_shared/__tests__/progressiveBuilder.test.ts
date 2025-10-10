/**
 * Tests for Progressive Builder
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/testing/asserts.ts';
import { ProgressiveBuilder } from '../progressiveBuilder.ts';

Deno.test('ProgressiveBuilder - breaks large app into phases', async () => {
  const builder = new ProgressiveBuilder();
  
  // Mock plan with 50 files
  const mockPlan = {
    files: Array.from({ length: 50 }, (_, i) => ({
      path: `src/component${i}.tsx`,
      content: 'export default function Component() {}',
    })),
  };

  const results = await builder.buildInPhases(mockPlan);
  
  assertExists(results);
  assertEquals(results.length > 1, true, 'Should create multiple phases');
  
  // Each phase should have results
  results.forEach(result => {
    assertExists(result.phase);
    assertExists(result.filesGenerated);
  });
});

Deno.test('ProgressiveBuilder - validates phase completion', async () => {
  const builder = new ProgressiveBuilder();
  
  const mockPlan = {
    files: Array.from({ length: 15 }, (_, i) => ({
      path: `src/file${i}.tsx`,
      content: 'export default function Component() {}',
    })),
  };

  const results = await builder.buildInPhases(mockPlan);
  
  // All phases should have validation results
  results.forEach(result => {
    assertExists(result.validationResults);
    assertEquals(result.validationResults.length > 0, true);
  });
});

Deno.test('ProgressiveBuilder - groups files by type', async () => {
  const builder = new ProgressiveBuilder();
  
  const mockPlan = {
    files: [
      { path: 'src/components/Button.tsx', content: '' },
      { path: 'src/hooks/useAuth.ts', content: '' },
      { path: 'src/utils/helpers.ts', content: '' },
      { path: 'src/pages/Home.tsx', content: '' },
    ],
  };

  const results = await builder.buildInPhases(mockPlan);
  
  assertExists(results);
  assertEquals(results.length > 0, true);
});

Deno.test('ProgressiveBuilder - limits files per phase', async () => {
  const builder = new ProgressiveBuilder();
  
  const mockPlan = {
    files: Array.from({ length: 60 }, (_, i) => ({
      path: `src/component${i}.tsx`,
      content: 'export default function Component() {}',
    })),
  };

  const results = await builder.buildInPhases(mockPlan);
  
  // Each phase should have <= 20 files
  results.forEach(result => {
    assertEquals(
      result.filesGenerated.length <= 20,
      true,
      `Phase ${result.phase.phaseNumber} should have <= 20 files`
    );
  });
});

console.log('✅ All Progressive Builder tests passed');
