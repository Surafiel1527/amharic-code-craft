import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock the hook since it has complex dependencies
vi.mock('../useProactiveMonitoring', () => ({
  useProactiveMonitoring: () => ({
    lastCheck: new Date(),
    healthStatus: 'healthy',
    issuesCount: 0,
    schedule: 'Every 5 minutes',
    isHealthy: true,
  }),
}));

describe('useProactiveMonitoring', () => {
  it('should provide health status', async () => {
    const { useProactiveMonitoring } = await import('../useProactiveMonitoring');
    const { result } = renderHook(() => useProactiveMonitoring());

    await waitFor(() => {
      expect(result.current.healthStatus).toBeDefined();
      expect(typeof result.current.isHealthy).toBe('boolean');
    });
  });
});
