import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMegaMind } from '../useMegaMind';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('useMegaMind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useMegaMind());
    
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.currentPhase).toBeNull();
    expect(result.current.decision).toBeNull();
  });

  it('should analyze user request successfully', async () => {
    const mockDecision = {
      understood: true,
      confidence: 0.9,
      complexity: 'medium' as const,
      requiredPhases: ['design', 'implementation'],
      reasoning: 'Test reasoning',
      plan: []
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockDecision,
      error: null
    });

    const { result } = renderHook(() => useMegaMind());

    const decision = await result.current.analyze(
      'Create a login page',
      'conv-123',
      'proj-123'
    );

    await waitFor(() => {
      expect(decision).toEqual(mockDecision);
      expect(result.current.decision).toEqual(mockDecision);
    });
  });

  it('should handle analysis errors gracefully', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error('Network error')
    });

    const { result } = renderHook(() => useMegaMind());

    const decision = await result.current.analyze(
      'Create a login page',
      'conv-123'
    );

    expect(decision).toBeNull();
  });

  it('should execute plan successfully', async () => {
    const mockDecision = {
      understood: true,
      confidence: 0.9,
      complexity: 'low' as const,
      requiredPhases: ['implementation'],
      reasoning: 'Simple task',
      plan: [{ phase: 'implementation', actions: [] }]
    };

    const mockExecutionResult = {
      success: true,
      generatedFiles: []
    };

    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({
        data: mockDecision,
        error: null
      })
      .mockResolvedValueOnce({
        data: mockExecutionResult,
        error: null
      });

    const { result } = renderHook(() => useMegaMind());

    await result.current.analyze('Create a button', 'conv-123');
    const executionResult = await result.current.execute(mockDecision);

    expect(executionResult).toEqual(mockExecutionResult);
  });
});
