/**
 * Tests for Feature Dependency Graph
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/testing/asserts.ts';
import { FeatureDependencyGraph } from '../featureDependencyGraph.ts';
import { Feature } from '../featureOrchestrator.ts';

Deno.test('FeatureDependencyGraph - builds graph correctly', () => {
  const features: Feature[] = [
    {
      id: 'database',
      name: 'Database',
      description: 'Database setup',
      dependencies: [],
      estimatedFiles: 1,
      complexity: 'medium',
      priority: 1,
    },
    {
      id: 'auth',
      name: 'Authentication',
      description: 'Auth setup',
      dependencies: ['database'],
      estimatedFiles: 5,
      complexity: 'medium',
      priority: 2,
    },
    {
      id: 'profiles',
      name: 'User Profiles',
      description: 'User profiles',
      dependencies: ['auth'],
      estimatedFiles: 3,
      complexity: 'low',
      priority: 3,
    },
  ];

  const graph = new FeatureDependencyGraph();
  graph.buildGraph(features);
  
  const analysis = graph.analyzeDependencies();
  
  assertEquals(analysis.isValid, true);
  assertEquals(analysis.errors.length, 0);
  assertEquals(analysis.criticalPath.length > 0, true);
});

Deno.test('FeatureDependencyGraph - detects circular dependencies', () => {
  const features: Feature[] = [
    {
      id: 'feature1',
      name: 'Feature 1',
      description: 'Test feature',
      dependencies: ['feature2'],
      estimatedFiles: 1,
      complexity: 'low',
      priority: 1,
    },
    {
      id: 'feature2',
      name: 'Feature 2',
      description: 'Test feature',
      dependencies: ['feature1'], // Circular!
      estimatedFiles: 1,
      complexity: 'low',
      priority: 2,
    },
  ];

  const graph = new FeatureDependencyGraph();
  graph.buildGraph(features);
  
  const analysis = graph.analyzeDependencies();
  
  assertEquals(analysis.isValid, false);
  assertEquals(analysis.errors.length > 0, true);
  assertEquals(analysis.errors[0].includes('Circular'), true);
});

Deno.test('FeatureDependencyGraph - finds critical path', () => {
  const features: Feature[] = [
    {
      id: 'database',
      name: 'Database',
      description: 'Database setup',
      dependencies: [],
      estimatedFiles: 1,
      complexity: 'medium',
      priority: 1,
    },
    {
      id: 'auth',
      name: 'Authentication',
      description: 'Auth setup',
      dependencies: ['database'],
      estimatedFiles: 5,
      complexity: 'medium',
      priority: 2,
    },
    {
      id: 'feed',
      name: 'Feed',
      description: 'Content feed',
      dependencies: ['auth', 'database'],
      estimatedFiles: 8,
      complexity: 'high',
      priority: 3,
    },
  ];

  const graph = new FeatureDependencyGraph();
  graph.buildGraph(features);
  
  const analysis = graph.analyzeDependencies();
  
  assertExists(analysis.criticalPath);
  assertEquals(analysis.criticalPath.length >= 2, true);
  // Critical path should start from root (database)
  assertEquals(analysis.criticalPath[0].id, 'database');
});

Deno.test('FeatureDependencyGraph - gets ready features', () => {
  const features: Feature[] = [
    {
      id: 'database',
      name: 'Database',
      description: 'Database setup',
      dependencies: [],
      estimatedFiles: 1,
      complexity: 'medium',
      priority: 1,
    },
    {
      id: 'auth',
      name: 'Authentication',
      description: 'Auth setup',
      dependencies: ['database'],
      estimatedFiles: 5,
      complexity: 'medium',
      priority: 2,
    },
    {
      id: 'profiles',
      name: 'Profiles',
      description: 'User profiles',
      dependencies: ['auth'],
      estimatedFiles: 3,
      complexity: 'low',
      priority: 3,
    },
  ];

  const graph = new FeatureDependencyGraph();
  graph.buildGraph(features);
  
  // Initially, only database is ready
  const ready1 = graph.getReadyFeatures(new Set());
  assertEquals(ready1.length, 1);
  assertEquals(ready1[0].id, 'database');
  
  // After database is complete, auth is ready
  const ready2 = graph.getReadyFeatures(new Set(['database']));
  assertEquals(ready2.length, 1);
  assertEquals(ready2[0].id, 'auth');
  
  // After auth is complete, profiles is ready
  const ready3 = graph.getReadyFeatures(new Set(['database', 'auth']));
  assertEquals(ready3.length, 1);
  assertEquals(ready3[0].id, 'profiles');
});

console.log('✅ All Feature Dependency Graph tests passed');
