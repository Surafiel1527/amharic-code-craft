import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const { getByText } = render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles', () => {
    const { getByText } = render(<Button variant="destructive">Delete</Button>);
    const button = getByText('Delete');
    expect(button).toBeTruthy();
  });

  it('can be disabled', () => {
    const { getByText } = render(<Button disabled>Disabled</Button>);
    const button = getByText('Disabled') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
