import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { AIReasoningEngine } from '../aiReasoningEngine.ts';

Deno.test('AIReasoningEngine - analyzes requirements correctly', async () => {
  const engine = new AIReasoningEngine();
  
  const analysis = await engine.analyzeRequirements(
    'Create a user authentication system'
  );
  
  assertExists(analysis);
  assertEquals(typeof analysis.complexity, 'string');
  assertEquals(typeof analysis.estimatedEffort, 'number');
});

Deno.test('AIReasoningEngine - breaks down complex tasks', async () => {
  const engine = new AIReasoningEngine();
  
  const breakdown = await engine.breakdownTask(
    'Build a full-stack social media app'
  );
  
  assertExists(breakdown);
  assertEquals(Array.isArray(breakdown.subtasks), true);
  assertEquals(breakdown.subtasks.length > 0, true);
});

Deno.test('AIReasoningEngine - validates technical feasibility', async () => {
  const engine = new AIReasoningEngine();
  
  const validation = await engine.validateFeasibility(
    'Add machine learning model training to frontend'
  );
  
  assertExists(validation);
  assertEquals(typeof validation.feasible, 'boolean');
  assertExists(validation.reasoning);
});

Deno.test('AIReasoningEngine - generates implementation strategy', async () => {
  const engine = new AIReasoningEngine();
  
  const strategy = await engine.generateStrategy({
    requirement: 'Payment processing',
    complexity: 'high',
    constraints: ['PCI compliance', 'security']
  });
  
  assertExists(strategy);
  assertEquals(Array.isArray(strategy.steps), true);
  assertExists(strategy.risks);
});

Deno.test('AIReasoningEngine - handles edge cases', async () => {
  const engine = new AIReasoningEngine();
  
  const analysis = await engine.analyzeRequirements('');
  
  assertExists(analysis);
  assertEquals(analysis.complexity, 'unknown');
});
