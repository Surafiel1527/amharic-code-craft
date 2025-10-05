import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      sourceCode,
      testType = 'unit',
      framework = 'vitest',
      includeEdgeCases = true,
      includeMocks = true
    } = await req.json();

    if (!sourceCode) {
      throw new Error('Source code is required');
    }

    // Generate appropriate tests based on type
    let tests = '';

    if (framework === 'vitest' || framework === 'jest') {
      tests = generateUnitTests(sourceCode, testType, includeEdgeCases, includeMocks, framework);
    } else if (framework === 'playwright') {
      tests = generateE2ETests(sourceCode, includeEdgeCases);
    }

    console.log(`Generated ${testType} tests using ${framework}`);

    return new Response(
      JSON.stringify({ tests }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Test generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Generation failed' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function generateUnitTests(
  sourceCode: string, 
  testType: string, 
  includeEdgeCases: boolean, 
  includeMocks: boolean,
  framework: string
): string {
  const importStatement = framework === 'vitest' 
    ? `import { describe, it, expect, vi, beforeEach } from 'vitest';`
    : `import { describe, it, expect, jest, beforeEach } from '@jest/globals';`;

  const mockFunction = framework === 'vitest' ? 'vi' : 'jest';

  return `${importStatement}
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  beforeEach(() => {
    ${mockFunction}.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render component without crashing', () => {
      render(<YourComponent />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should display correct initial state', () => {
      render(<YourComponent />);
      expect(screen.getByText(/your component/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle button clicks', async () => {
      render(<YourComponent />);
      const button = screen.getByRole('button');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/clicked/i)).toBeInTheDocument();
      });
    });

    it('should update input value', () => {
      render(<YourComponent />);
      const input = screen.getByRole('textbox');
      
      fireEvent.change(input, { target: { value: 'test value' } });
      
      expect(input).toHaveValue('test value');
    });
  });

  ${includeEdgeCases ? `describe('Edge Cases', () => {
    it('should handle empty input', () => {
      render(<YourComponent initialValue="" />);
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should handle null props', () => {
      render(<YourComponent data={null} />);
      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      render(<YourComponent value={longString} />);
      expect(screen.getByDisplayValue(longString)).toBeInTheDocument();
    });
  });` : ''}

  ${includeMocks ? `describe('API Interactions', () => {
    it('should fetch data on mount', async () => {
      const mockFetch = ${mockFunction}.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: 'test data' })
        })
      );
      global.fetch = mockFetch as any;

      render(<YourComponent />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText(/test data/i)).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      const mockFetch = ${mockFunction}.fn(() =>
        Promise.reject(new Error('API Error'))
      );
      global.fetch = mockFetch as any;

      render(<YourComponent />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });` : ''}

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<YourComponent />);
      expect(screen.getByRole('region')).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', () => {
      render(<YourComponent />);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});`;
}

function generateE2ETests(sourceCode: string, includeEdgeCases: boolean): string {
  return `import { test, expect } from '@playwright/test';

test.describe('Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/your app/i);
  });

  test('should navigate between pages', async ({ page }) => {
    await page.click('text=About');
    await expect(page).toHaveURL(/about/);
    
    await page.click('text=Home');
    await expect(page).toHaveURL(/\\/$/);
  });

  test('should submit a form', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/success/i)).toBeVisible();
  });

  test('should handle authentication flow', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button:has-text("Sign In")');
    
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  ${includeEdgeCases ? `test('should handle network errors', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    
    await page.reload();
    
    await expect(page.getByText(/error/i)).toBeVisible();
  });

  test('should work offline', async ({ page, context }) => {
    await context.setOffline(true);
    
    await page.reload();
    
    await expect(page.getByText(/offline/i)).toBeVisible();
  });` : ''}

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  test('should maintain state after reload', async ({ page }) => {
    await page.fill('input[name="search"]', 'test query');
    await page.reload();
    
    await expect(page.locator('input[name="search"]')).toHaveValue('test query');
  });
});`;
}
