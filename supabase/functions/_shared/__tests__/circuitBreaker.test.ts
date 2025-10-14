import { assertEquals } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { CircuitBreaker, CircuitState } from '../circuitBreaker.ts';

// Mock Supabase client
const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ 
          data: { 
            state: 'CLOSED', 
            failure_count: 0, 
            last_failure_time: null,
            last_success_time: new Date().toISOString()
          }, 
          error: null 
        })
      }),
      maybeSingle: () => Promise.resolve({ 
        data: null, 
        error: null 
      })
    }),
    insert: () => Promise.resolve({ data: {}, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ data: {}, error: null })
    })
  })
};

Deno.test('CircuitBreaker - starts in CLOSED state', async () => {
  const breaker = new CircuitBreaker('test-service-1', mockSupabase as any);
  const state = await breaker.getState();
  
  assertEquals(state, 'CLOSED');
});

Deno.test('CircuitBreaker - records success', async () => {
  const breaker = new CircuitBreaker('test-service-2', mockSupabase as any);
  
  // Should not throw
  await breaker.recordSuccess();
  
  const state = await breaker.getState();
  assertEquals(state, 'CLOSED');
});

Deno.test('CircuitBreaker - records failure', async () => {
  const breaker = new CircuitBreaker('test-service-3', mockSupabase as any, {
    failureThreshold: 3,
    timeoutMs: 5000,
    resetTimeoutMs: 10000
  });
  
  // Should not throw
  await breaker.recordFailure(new Error('Test failure'));
});

Deno.test('CircuitBreaker - executes function when CLOSED', async () => {
  const breaker = new CircuitBreaker('test-service-4', mockSupabase as any);
  
  const result = await breaker.execute(async () => {
    return 'success';
  });
  
  assertEquals(result, 'success');
});

Deno.test('CircuitBreaker - handles function errors', async () => {
  const breaker = new CircuitBreaker('test-service-5', mockSupabase as any);
  
  try {
    await breaker.execute(async () => {
      throw new Error('Function failed');
    });
  } catch (error) {
    assertEquals((error as Error).message, 'Function failed');
  }
});
