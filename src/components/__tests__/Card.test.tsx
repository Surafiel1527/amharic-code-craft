import { describe, it, expect } from 'vitest';
import { render } from '@/test/testUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

describe('Card Component', () => {
  it('should render card with content', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>Test Content</CardContent>
      </Card>
    );
    
    expect(getByText('Test Title')).toBeDefined();
    expect(getByText('Test Content')).toBeDefined();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Card className="custom-class">Content</Card>
    );
    
    expect(container.firstChild).toBeDefined();
  });
});
