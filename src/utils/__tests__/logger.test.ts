import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, createLogger, LogLevel } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Logging levels', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Test warning');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Test error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      logger.debug('Test debug');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log critical messages', () => {
      logger.critical('Critical issue');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Context handling', () => {
    it('should include context in log messages', () => {
      const context = { userId: '123', action: 'test' };
      logger.info('Test with context', context);
      
      const callArg = (console.log as any).mock.calls[0][0];
      expect(callArg).toContain('userId=123');
      expect(callArg).toContain('action=test');
    });

    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ component: 'TestComponent' });
      childLogger.info('Child log');
      
      const callArg = (console.log as any).mock.calls[0][0];
      expect(callArg).toContain('component=TestComponent');
    });
  });

  describe('Error handling', () => {
    it('should log errors with stack traces', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', undefined, error);
      
      expect(console.error).toHaveBeenCalled();
      const calls = (console.error as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('Timer functionality', () => {
    it('should measure execution time', async () => {
      const timer = logger.startTimer();
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = timer();
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Logger factory', () => {
    it('should create logger with initial context', () => {
      const customLogger = createLogger({ projectId: 'proj-123' });
      customLogger.info('Test message');
      
      const callArg = (console.log as any).mock.calls[0][0];
      expect(callArg).toContain('projectId=proj-123');
    });
  });
});
