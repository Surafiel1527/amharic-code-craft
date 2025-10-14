import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { logger, createLogger } from '../logger.ts';

Deno.test('Logger - info level', () => {
  const testLogger = createLogger({ testContext: 'value' });
  
  // Should not throw
  testLogger.info('Test info message');
  testLogger.info('Test with context', { action: 'test' });
});

Deno.test('Logger - error level', () => {
  const testLogger = createLogger();
  const error = new Error('Test error');
  
  // Should not throw
  testLogger.error('Error occurred', { component: 'test' }, error);
});

Deno.test('Logger - child logger', () => {
  const parentLogger = createLogger({ parent: 'context' });
  const childLogger = parentLogger.child({ child: 'context' });
  
  // Should not throw
  childLogger.info('Child message');
});

Deno.test('Logger - timer functionality', async () => {
  const timer = logger.startTimer();
  await new Promise(resolve => setTimeout(resolve, 10));
  const duration = timer();
  
  assertEquals(duration >= 10, true, 'Duration should be at least 10ms');
  assertEquals(duration < 100, true, 'Duration should be less than 100ms');
});

Deno.test('Logger - all log levels', () => {
  // Should not throw for any level
  logger.debug('Debug message');
  logger.info('Info message');
  logger.warn('Warning message');
  logger.error('Error message');
  logger.critical('Critical message');
});
