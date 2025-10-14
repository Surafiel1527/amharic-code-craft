import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIAnalysisPanel } from '../AIAnalysisPanel';

vi.mock('@/hooks/useMegaMind', () => ({
  useMegaMind: () => ({
    analyze: vi.fn().mockResolvedValue({
      understood: true,
      confidence: 0.9,
      complexity: 'medium',
      requiredPhases: ['design', 'implementation'],
      reasoning: 'Test reasoning',
      plan: []
    }),
    isProcessing: false,
    decision: null
  })
}));

describe('AIAnalysisPanel', () => {
  it('should render analysis panel', () => {
    render(<AIAnalysisPanel />);
    expect(screen.getByText(/AI Analysis/i)).toBeInTheDocument();
  });

  it('should display confidence score', () => {
    render(<AIAnalysisPanel decision={{ confidence: 0.85 }} />);
    expect(screen.getByText(/85%/i)).toBeInTheDocument();
  });

  it('should show complexity indicator', () => {
    render(<AIAnalysisPanel decision={{ complexity: 'high' }} />);
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it('should render phase breakdown', () => {
    const decision = {
      requiredPhases: ['design', 'implementation', 'testing']
    };
    render(<AIAnalysisPanel decision={decision} />);
    expect(screen.getByText(/Design/i)).toBeInTheDocument();
    expect(screen.getByText(/Implementation/i)).toBeInTheDocument();
  });
});
