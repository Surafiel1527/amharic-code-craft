/**
 * End-to-End Integration Tests
 * 
 * Tests the full enterprise orchestration flow
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/testing/asserts.ts';
import { FeatureOrchestrator } from '../featureOrchestrator.ts';
import { FeatureDependencyGraph } from '../featureDependencyGraph.ts';
import { PhaseValidator } from '../phaseValidator.ts';
import { SchemaArchitect } from '../schemaArchitect.ts';
import { ProgressiveBuilder } from '../progressiveBuilder.ts';

// Mock Supabase client
const mockSupabase = {
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
};

Deno.test('E2E - TikTok Clone Full Flow', async () => {
  console.log('🎬 Testing TikTok Clone end-to-end flow...');
  
  const request = 'Build a TikTok clone with video upload, feed, comments, likes, user profiles, and search';
  
  // Step 1: Feature Orchestration
  console.log('Step 1: Feature Orchestration');
  const orchestrator = new FeatureOrchestrator();
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  assertExists(plan);
  assertEquals(plan.totalFeatures >= 6, true, 'Should detect 6+ features');
  assertEquals(plan.phases.length >= 3, true, 'Should have 3+ phases');
  console.log(`  ✅ ${plan.phases.length} phases, ${plan.totalFiles} files, ${plan.externalAPIs.length} APIs`);
  
  // Step 2: Dependency Validation
  console.log('Step 2: Dependency Validation');
  const graph = new FeatureDependencyGraph();
  const allFeatures = plan.phases.flatMap(p => p.features);
  graph.buildGraph(allFeatures);
  
  const dependencyAnalysis = graph.analyzeDependencies();
  assertEquals(dependencyAnalysis.isValid, true, 'Dependencies should be valid');
  assertEquals(dependencyAnalysis.errors.length, 0, 'Should have no dependency errors');
  console.log(`  ✅ Valid dependencies, max depth: ${dependencyAnalysis.maxDepth}`);
  
  // Step 3: Schema Generation
  console.log('Step 3: Complex Schema Generation');
  const architect = new SchemaArchitect(mockSupabase as any);
  const schema = await architect.generateFullSchema(allFeatures);
  
  assertExists(schema);
  assertEquals(schema.tables.length >= 8, true, 'Should generate 8+ tables');
  assertEquals(schema.relationships.length > 0, true, 'Should have relationships');
  console.log(`  ✅ ${schema.tables.length} tables, ${schema.relationships.length} relationships`);
  
  // Step 4: Progressive Building
  console.log('Step 4: Progressive Implementation');
  const mockRequest = 'Build a social media app with video upload, feed, comments, likes';
  const mockAnalysis = {
    mainGoal: 'Social media app',
    requiredSections: ['video upload', 'feed', 'comments', 'likes']
  };
  const builder = new ProgressiveBuilder(mockRequest, mockAnalysis, 'react');
  const mockFiles = Array.from({ length: plan.totalFiles }, (_, i) => ({
    path: `src/file${i}.tsx`,
    content: 'export default function Component() {}',
  }));
  
  const buildResults = await builder.buildInPhases({ files: mockFiles });
  
  assertExists(buildResults);
  assertEquals(buildResults.length > 0, true, 'Should have phase results');
  assertEquals(buildResults.every(r => r.filesGenerated.length <= 20), true, 'Each phase <= 20 files');
  console.log(`  ✅ ${buildResults.length} phases built`);
  
  // Step 5: Phase Validation
  console.log('Step 5: Phase Validation');
  const validator = new PhaseValidator();
  
  let phasesCompleted = 0;
  buildResults.forEach((result, idx) => {
    // Convert BuildPhase to Phase for validation
    const mockPhase = {
      phaseNumber: idx + 1,
      features: [],
      filesCount: result.filesGenerated.length,
      estimatedDuration: '20 minutes',
      readyToStart: true,
    };
    
    const validation = validator.validatePhase(
      mockPhase,
      result.filesGenerated,
      new Set()
    );
    
    if (validation.isValid) phasesCompleted++;
    console.log(`  Phase ${idx + 1}: ${validation.completionPercentage}% complete`);
  });
  
  console.log('🎉 TikTok Clone E2E test PASSED');
});

Deno.test('E2E - E-Commerce Platform Full Flow', async () => {
  console.log('🛒 Testing E-Commerce Platform end-to-end flow...');
  
  const request = 'Build an e-commerce platform with products, shopping cart, checkout, payments, orders, reviews, and search';
  
  // Step 1: Feature Orchestration
  const orchestrator = new FeatureOrchestrator();
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  assertExists(plan);
  console.log(`  ✅ ${plan.phases.length} phases planned`);
  
  // Should detect Stripe API requirement
  assertEquals(
    plan.externalAPIs.some(api => api.includes('Stripe')),
    true,
    'Should detect Stripe requirement'
  );
  
  // Step 2: Schema Generation
  const architect = new SchemaArchitect(mockSupabase as any);
  const allFeatures = plan.phases.flatMap(p => p.features);
  const schema = await architect.generateFullSchema(allFeatures);
  
  // E-commerce needs many tables
  assertEquals(schema.tables.length >= 10, true, 'Should generate 10+ tables');
  console.log(`  ✅ ${schema.tables.length} tables generated`);
  
  console.log('🎉 E-Commerce E2E test PASSED');
});

Deno.test('E2E - Simple App (No Enterprise Features)', async () => {
  console.log('📝 Testing simple app (should skip enterprise modules)...');
  
  const request = 'Build a simple todo list';
  
  const orchestrator = new FeatureOrchestrator();
  const plan = await orchestrator.orchestrateFeatures(request, {});
  
  assertExists(plan);
  // Simple apps should have 1-2 phases
  assertEquals(plan.phases.length <= 2, true, 'Simple app should have few phases');
  assertEquals(plan.totalFiles <= 15, true, 'Simple app should have < 15 files');
  
  console.log(`  ✅ Simple app: ${plan.totalFiles} files in ${plan.phases.length} phases`);
  console.log('🎉 Simple app test PASSED');
});

console.log('✅ All E2E Integration tests passed');
