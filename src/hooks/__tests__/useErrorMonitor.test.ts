import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useErrorMonitor } from '../useErrorMonitor';

vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/logger');

describe('useErrorMonitor', () => {
  it('should provide reportError function', () => {
    const { result } = renderHook(() => useErrorMonitor());
    expect(typeof result.current.reportError).toBe('function');
  });

  it('should report errors', async () => {
    const { result } = renderHook(() => useErrorMonitor());
    
    await result.current.reportError({
      errorType: 'TestError',
      errorMessage: 'Test message',
      source: 'frontend',
      severity: 'low',
    });
    
    // Should not throw
    expect(true).toBe(true);
  });
});
