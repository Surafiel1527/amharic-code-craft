import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('useNetworkStatus', () => {
  it('should return online status', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(typeof result.current).toBe('boolean');
  });
});
