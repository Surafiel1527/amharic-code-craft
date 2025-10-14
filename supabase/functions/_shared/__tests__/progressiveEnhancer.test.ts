import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { ProgressiveEnhancer } from '../progressiveBuilder.ts';

const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: {}, error: null })
      })
    }),
    insert: () => Promise.resolve({ data: {}, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ data: {}, error: null })
    })
  })
};

Deno.test('ProgressiveEnhancer - builds incrementally', async () => {
  const enhancer = new ProgressiveEnhancer(mockSupabase as any);
  
  const result = await enhancer.buildIncremental({
    feature: 'Login form',
    phase: 'initial'
  });
  
  assertExists(result);
  assertEquals(typeof result.success, 'boolean');
});

Deno.test('ProgressiveEnhancer - validates each build step', async () => {
  const enhancer = new ProgressiveEnhancer(mockSupabase as any);
  
  const validation = await enhancer.validateStep({
    step: 'component-creation',
    artifacts: []
  });
  
  assertExists(validation);
  assertEquals(typeof validation.valid, 'boolean');
});

Deno.test('ProgressiveEnhancer - handles build failures', async () => {
  const enhancer = new ProgressiveEnhancer(mockSupabase as any);
  
  const result = await enhancer.handleFailure({
    step: 'integration',
    error: 'Test error'
  });
  
  assertExists(result);
  assertExists(result.rollbackPlan);
  assertExists(result.retryStrategy);
});

Deno.test('ProgressiveEnhancer - tracks progress accurately', async () => {
  const enhancer = new ProgressiveEnhancer(mockSupabase as any);
  
  await enhancer.buildIncremental({ feature: 'Step 1', phase: 'initial' });
  await enhancer.buildIncremental({ feature: 'Step 2', phase: 'enhancement' });
  
  const progress = await enhancer.getProgress();
  
  assertExists(progress);
  assertEquals(typeof progress.percentage, 'number');
  assertEquals(progress.percentage >= 0 && progress.percentage <= 100, true);
});
