import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAGICapabilities } from '../useAGICapabilities';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('useAGICapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAGICapabilities());
    
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.isHealing).toBe(false);
    expect(result.current.capabilities).toEqual([]);
  });

  it('should analyze codebase successfully', async () => {
    const mockAnalysis = {
      files: 10,
      components: 5,
      issues: 2
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockAnalysis,
      error: null
    });

    const { result } = renderHook(() => useAGICapabilities());

    const analysis = await result.current.analyzeCodebase('proj-123');

    await waitFor(() => {
      expect(analysis).toEqual(mockAnalysis);
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  it('should handle analysis errors gracefully', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error('Analysis failed')
    });

    const { result } = renderHook(() => useAGICapabilities());

    const analysis = await result.current.analyzeCodebase('proj-123');

    expect(analysis).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
  });

  it('should trigger healing process', async () => {
    const mockHealingResult = {
      fixed: 3,
      remaining: 1
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockHealingResult,
      error: null
    });

    const { result } = renderHook(() => useAGICapabilities());

    const healingResult = await result.current.healIssues(['issue-1', 'issue-2']);

    await waitFor(() => {
      expect(healingResult).toEqual(mockHealingResult);
      expect(result.current.isHealing).toBe(false);
    });
  });
});
