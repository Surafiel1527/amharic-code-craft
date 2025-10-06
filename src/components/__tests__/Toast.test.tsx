import { describe, it, expect } from 'vitest';
import { render } from '@/test/testUtils';
import { Toaster } from '@/components/ui/toaster';

describe('Toast Component', () => {
  it('should render toaster', () => {
    render(<Toaster />);
    expect(document.querySelector('[data-sonner-toaster]')).toBeDefined();
  });
});
