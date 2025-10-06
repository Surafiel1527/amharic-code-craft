import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHealthCheck } from '../useHealthCheck';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  },
}));

describe('useHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with healthy status', async () => {
    const { result } = renderHook(() => useHealthCheck(10000));

    await waitFor(() => {
      expect(result.current.health.overall).toBe('healthy');
    });
  });

  it('should check health on mount', async () => {
    const { result } = renderHook(() => useHealthCheck(10000));

    await waitFor(() => {
      expect(result.current.health.lastCheck).toBeInstanceOf(Date);
    });
  });

  it('should provide isHealthy boolean', async () => {
    const { result } = renderHook(() => useHealthCheck(10000));

    await waitFor(() => {
      expect(typeof result.current.isHealthy).toBe('boolean');
    });
  });
});
