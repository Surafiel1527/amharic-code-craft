/**
 * Test Setup and Configuration
 */

import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(() => {
  console.log('\n🧪 Starting Test Suite...\n');
});

// Global test teardown
afterAll(() => {
  console.log('\n✅ Test Suite Complete!\n');
});

// Test utilities
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateTestId = (prefix: string) => 
  `AUTO_TEST_${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
