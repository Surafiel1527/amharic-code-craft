import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logError, withErrorLogging, logSuccess } from '../errorLogger';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('errorLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('logError', () => {
    it('should log error with all parameters', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true },
        error: null
      });

      await logError({
        message: 'Test error',
        error: new Error('Test'),
        source: 'frontend',
        severity: 'high',
        filePath: 'test.ts',
        context: { userId: '123' }
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'unified-monitoring',
        expect.objectContaining({
          body: expect.objectContaining({
            type: 'error',
            message: 'Test error',
            source: 'frontend',
            severity: 'high'
          })
        })
      );
    });

    it('should handle errors when reporting fails', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Should not throw
      await expect(
        logError({
          message: 'Test error',
          source: 'frontend'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('withErrorLogging', () => {
    it('should wrap async function and log errors', async () => {
      const testFn = async (arg: string) => {
        throw new Error('Test error');
      };

      const wrapped = withErrorLogging(testFn, {
        filePath: 'test.ts',
        functionName: 'testFn',
        source: 'frontend'
      });

      await expect(wrapped('test')).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should not interfere with successful execution', async () => {
      const testFn = async (arg: string) => {
        return `Result: ${arg}`;
      };

      const wrapped = withErrorLogging(testFn, {
        filePath: 'test.ts',
        functionName: 'testFn',
        source: 'frontend'
      });

      const result = await wrapped('test');
      expect(result).toBe('Result: test');
    });
  });

  describe('logSuccess', () => {
    it('should log success messages', () => {
      logSuccess('Operation completed', { userId: '123' });
      expect(console.log).toHaveBeenCalled();
    });
  });
});
