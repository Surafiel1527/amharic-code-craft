import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import {
  ValidationError,
  AuthenticationError,
  classifyError,
  isAppError,
  retryWithBackoff,
  withTimeout
} from '../errorHandler.ts';

Deno.test('ValidationError - creates correct error', () => {
  const error = new ValidationError('Invalid input');
  
  assertEquals(error.type, 'VALIDATION');
  assertEquals(error.statusCode, 400);
  assertEquals(error.retryable, false);
  assertEquals(error.message, 'Invalid input');
});

Deno.test('AuthenticationError - creates correct error', () => {
  const error = new AuthenticationError('Not authenticated');
  
  assertEquals(error.type, 'AUTHENTICATION');
  assertEquals(error.statusCode, 401);
  assertEquals(error.retryable, false);
});

Deno.test('classifyError - handles AppError', () => {
  const error = new ValidationError('Test');
  const classified = classifyError(error);
  
  assertEquals(classified.type, 'VALIDATION');
});

Deno.test('classifyError - handles generic Error', () => {
  const error = new Error('Generic error');
  const classified = classifyError(error);
  
  assertEquals(classified.type, 'INTERNAL');
  assertExists(classified.message);
});

Deno.test('isAppError - type guard works', () => {
  const appError = new ValidationError('Test');
  const genericError = new Error('Test');
  
  assertEquals(isAppError(appError), true);
  assertEquals(isAppError(genericError), false);
  assertEquals(isAppError(null), false);
  assertEquals(isAppError(undefined), false);
});

Deno.test('retryWithBackoff - succeeds on first attempt', async () => {
  let attempts = 0;
  
  const result = await retryWithBackoff(
    async () => {
      attempts++;
      return 'success';
    },
    { maxAttempts: 3, initialDelayMs: 10 }
  );
  
  assertEquals(result, 'success');
  assertEquals(attempts, 1);
});

Deno.test('retryWithBackoff - retries on failure', async () => {
  let attempts = 0;
  
  const result = await retryWithBackoff(
    async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    },
    { maxAttempts: 5, initialDelayMs: 10 }
  );
  
  assertEquals(result, 'success');
  assertEquals(attempts, 3);
});

Deno.test('retryWithBackoff - fails after max attempts', async () => {
  let attempts = 0;
  
  try {
    await retryWithBackoff(
      async () => {
        attempts++;
        throw new Error('Persistent failure');
      },
      { maxAttempts: 3, initialDelayMs: 10 }
    );
  } catch (error) {
    assertEquals((error as Error).message, 'Persistent failure');
    assertEquals(attempts, 3);
  }
});

Deno.test('withTimeout - completes before timeout', async () => {
  const result = await withTimeout(
    async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'success';
    },
    100
  );
  
  assertEquals(result, 'success');
});

Deno.test('withTimeout - throws on timeout', async () => {
  try {
    await withTimeout(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      },
      50
    );
  } catch (error) {
    assertEquals((error as any).type, 'TIMEOUT');
  }
});
