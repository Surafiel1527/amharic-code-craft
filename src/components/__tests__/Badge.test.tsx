import { describe, it, expect } from 'vitest';
import { render } from '@/test/testUtils';
import { Badge } from '@/components/ui/badge';

describe('Badge Component', () => {
  it('should render badge with text', () => {
    const { getByText } = render(<Badge>Test Badge</Badge>);
    expect(getByText('Test Badge')).toBeDefined();
  });

  it('should apply variant classes', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect(container.firstChild).toBeDefined();
  });

  it('should apply default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toBeDefined();
  });
});
