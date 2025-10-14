import { assertEquals } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { RateLimiter } from '../rateLimiter.ts';

Deno.test('RateLimiter - allows requests within limit', async () => {
  const limiter = new RateLimiter({
    maxTokens: 5,
    refillRate: 1,
    refillInterval: 1000
  });

  const identifier = 'test-user-1';
  
  // First 5 requests should be allowed
  for (let i = 0; i < 5; i++) {
    const result = await limiter.checkLimit(identifier);
    assertEquals(result.allowed, true, `Request ${i + 1} should be allowed`);
  }
});

Deno.test('RateLimiter - blocks requests over limit', async () => {
  const limiter = new RateLimiter({
    maxTokens: 3,
    refillRate: 1,
    refillInterval: 1000
  });

  const identifier = 'test-user-2';
  
  // Use up all tokens
  for (let i = 0; i < 3; i++) {
    await limiter.checkLimit(identifier);
  }
  
  // Next request should be blocked
  const result = await limiter.checkLimit(identifier);
  assertEquals(result.allowed, false);
  assertEquals(typeof result.retryAfter, 'number');
});

Deno.test('RateLimiter - refills tokens over time', async () => {
  const limiter = new RateLimiter({
    maxTokens: 2,
    refillRate: 2,
    refillInterval: 100 // 100ms for faster test
  });

  const identifier = 'test-user-3';
  
  // Use up all tokens
  await limiter.checkLimit(identifier);
  await limiter.checkLimit(identifier);
  
  // Should be blocked
  let result = await limiter.checkLimit(identifier);
  assertEquals(result.allowed, false);
  
  // Wait for refill
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Should be allowed again
  result = await limiter.checkLimit(identifier);
  assertEquals(result.allowed, true);
});

Deno.test('RateLimiter - different identifiers have separate buckets', async () => {
  const limiter = new RateLimiter({
    maxTokens: 2,
    refillRate: 1,
    refillInterval: 1000
  });

  // Use up tokens for user 1
  await limiter.checkLimit('user-1');
  await limiter.checkLimit('user-1');
  
  // User 2 should still have tokens
  const result = await limiter.checkLimit('user-2');
  assertEquals(result.allowed, true);
});
