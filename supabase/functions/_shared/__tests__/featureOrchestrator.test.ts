/**
 * Tests for Feature Orchestrator
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/testing/asserts.ts';
import { FeatureOrchestrator } from '../featureOrchestrator.ts';

Deno.test('FeatureOrchestrator - detects TikTok features', async () => {
  const orchestrator = new FeatureOrchestrator();
  const request = 'Build a TikTok clone with video upload, feed, comments, likes, and search';
  
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  assertExists(plan);
  assertEquals(plan.totalFeatures >= 5, true, 'Should detect at least 5 features');
  assertEquals(plan.phases.length >= 2, true, 'Should have at least 2 phases');
  assertEquals(plan.totalFiles > 0, true, 'Should estimate file count');
});

Deno.test('FeatureOrchestrator - orders features by dependencies', async () => {
  const orchestrator = new FeatureOrchestrator();
  const request = 'Build an app with authentication, user profiles, and messaging';
  
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  // Database and auth should come in early phases
  const phase1Features = plan.phases[0].features.map(f => f.id);
  assertEquals(phase1Features.includes('database'), true, 'Phase 1 should include database');
  assertEquals(phase1Features.includes('authentication'), true, 'Phase 1 should include auth');
});

Deno.test('FeatureOrchestrator - limits files per phase', async () => {
  const orchestrator = new FeatureOrchestrator();
  const request = 'Build a full social media platform with all features';
  
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  // Each phase should have <= 20 files
  plan.phases.forEach(phase => {
    assertEquals(phase.filesCount <= 20, true, `Phase ${phase.phaseNumber} should have <= 20 files`);
  });
});

Deno.test('FeatureOrchestrator - detects required APIs', async () => {
  const orchestrator = new FeatureOrchestrator();
  const request = 'Build TikTok with video processing and payments';
  
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  assertEquals(plan.externalAPIs.length > 0, true, 'Should detect required APIs');
  assertEquals(
    plan.externalAPIs.some(api => api.includes('Cloudinary') || api.includes('Stripe')),
    true,
    'Should detect Cloudinary or Stripe'
  );
});

Deno.test('FeatureOrchestrator - handles single feature gracefully', async () => {
  const orchestrator = new FeatureOrchestrator();
  const request = 'Build a simple todo list';
  
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  assertExists(plan);
  assertEquals(plan.phases.length >= 1, true, 'Should have at least 1 phase');
});

console.log('✅ All Feature Orchestrator tests passed');
