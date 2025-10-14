import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { MegaMindOrchestrator } from '../megaMindOrchestrator.ts';

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

Deno.test('MegaMindOrchestrator - initializes correctly', () => {
  const orchestrator = new MegaMindOrchestrator(mockSupabase as any);
  assertExists(orchestrator);
});

Deno.test('MegaMindOrchestrator - analyzes user request', async () => {
  const orchestrator = new MegaMindOrchestrator(mockSupabase as any);
  
  const decision = await orchestrator.analyzeRequest(
    'Create a login page',
    'conv-123',
    'proj-123'
  );
  
  assertExists(decision);
  assertEquals(typeof decision.understood, 'boolean');
  assertEquals(typeof decision.confidence, 'number');
});

Deno.test('MegaMindOrchestrator - handles complex requests', async () => {
  const orchestrator = new MegaMindOrchestrator(mockSupabase as any);
  
  const decision = await orchestrator.analyzeRequest(
    'Build a full e-commerce platform with payment integration',
    'conv-123',
    'proj-123'
  );
  
  assertExists(decision);
  assertEquals(decision.complexity, 'high');
  assertExists(decision.plan);
});

Deno.test('MegaMindOrchestrator - executes plan successfully', async () => {
  const orchestrator = new MegaMindOrchestrator(mockSupabase as any);
  
  const mockPlan = {
    understood: true,
    confidence: 0.9,
    complexity: 'medium' as const,
    requiredPhases: ['design', 'implementation'],
    reasoning: 'Test plan',
    plan: []
  };
  
  const result = await orchestrator.executePlan(mockPlan, 'proj-123');
  
  assertExists(result);
  assertEquals(typeof result.success, 'boolean');
});
