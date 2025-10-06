import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('base-class', 'additional-class');
    expect(result).toContain('base-class');
    expect(result).toContain('additional-class');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'conditional', false && 'hidden');
    expect(result).toContain('base');
    expect(result).toContain('conditional');
    expect(result).not.toContain('hidden');
  });

  it('handles tailwind merge conflicts', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
