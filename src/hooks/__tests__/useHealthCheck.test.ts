import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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

  it('should initialize with healthy status', () => {
    const { result } = renderHook(() => useHealthCheck(10000));
    expect(result.current.health.overall).toBe('healthy');
  });

  it('should provide isHealthy boolean', () => {
    const { result } = renderHook(() => useHealthCheck(10000));
    expect(typeof result.current.isHealthy).toBe('boolean');
  });
});
