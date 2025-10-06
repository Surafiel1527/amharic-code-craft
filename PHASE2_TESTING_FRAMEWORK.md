# Phase 2: Testing Framework Implementation

## Status: **STARTING** 🚀

## Overview
Now that Phase 1 is complete with a clean, optimized codebase, Phase 2 focuses on establishing a comprehensive testing framework to ensure reliability and maintainability.

---

## Objectives

### 1. Testing Infrastructure Setup
- [ ] Install and configure Vitest
- [ ] Set up React Testing Library
- [ ] Configure test environment
- [ ] Create test utilities and helpers
- [ ] Set up coverage reporting

### 2. Core Component Tests
- [ ] Test critical UI components (Button, Input, Card, etc.)
- [ ] Test custom hooks (useAuth, useAIChat, etc.)
- [ ] Test context providers
- [ ] Test utility functions

### 3. Integration Tests
- [ ] Test page-level components
- [ ] Test API integrations
- [ ] Test edge function calls
- [ ] Test authentication flows

### 4. Test Utilities
- [ ] Create mock data generators
- [ ] Create test wrappers (with providers)
- [ ] Create custom matchers
- [ ] Create testing best practices guide

---

## Implementation Plan

### Step 1: Install Dependencies
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Step 2: Configure Vitest
Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 3: Create Test Setup
Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

### Step 4: Create Test Utilities
Create `src/test/utils.tsx`:
```typescript
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Step 5: Write First Tests
Priority test targets:
1. `src/components/ui/button.tsx`
2. `src/hooks/useAuth.tsx`
3. `src/utils/logger.ts`
4. `src/components/ui/input.tsx`
5. `src/contexts/EditModeContext.tsx`

---

## Testing Best Practices

### 1. Test Naming Convention
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {});
  it('should handle user interaction', () => {});
  it('should handle error states', () => {});
});
```

### 2. Use Testing Library Queries (Priority Order)
1. `getByRole` - Most accessible
2. `getByLabelText` - For form elements
3. `getByPlaceholderText` - For inputs
4. `getByText` - For non-interactive elements
5. `getByTestId` - Last resort

### 3. Test User Behavior, Not Implementation
```typescript
// ✅ Good - tests behavior
it('should display error message when login fails', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);
  
  await user.type(screen.getByLabelText(/email/i), 'invalid@email.com');
  await user.click(screen.getByRole('button', { name: /login/i }));
  
  expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
});

// ❌ Bad - tests implementation
it('should set error state to true', () => {
  const { result } = renderHook(() => useAuth());
  act(() => result.current.setError(true));
  expect(result.current.error).toBe(true);
});
```

### 4. Mock External Dependencies
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signIn: vi.fn(),
    },
  },
}));
```

---

## Coverage Goals

### Phase 2 Target Coverage
- **Critical Components**: 80%+
- **Custom Hooks**: 90%+
- **Utility Functions**: 95%+
- **Overall Project**: 60%+

---

## Success Metrics

- [ ] All critical components have tests
- [ ] All custom hooks have tests
- [ ] CI/CD runs tests automatically
- [ ] Coverage reports generated
- [ ] Test documentation created
- [ ] Team trained on testing practices

---

## Timeline

**Estimated Duration**: 2-3 weeks

### Week 1: Setup & Core Tests
- Days 1-2: Infrastructure setup
- Days 3-5: UI component tests

### Week 2: Integration Tests
- Days 1-3: Hook tests
- Days 4-5: Page-level tests

### Week 3: Coverage & Documentation
- Days 1-2: Reach coverage goals
- Days 3-4: Documentation
- Day 5: Review & refinement

---

**Created**: 2025-01-06
**Status**: Ready to begin Phase 2 implementation
