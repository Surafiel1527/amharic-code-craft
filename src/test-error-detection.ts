/**
 * TEST FILE: Error Detection Validation
 * 
 * This file intentionally creates different types of errors
 * to verify the autonomous agent detects and attempts to heal them.
 * 
 * After running tests, check /agent-status dashboard for results.
 */

// Test 1: Console Error Detection
export const testConsoleError = () => {
  console.error('TEST ERROR: This is a test error for agent detection');
  console.warn('TEST WARNING: Testing warning capture');
};

// Test 2: Runtime Error Detection
export const testRuntimeError = () => {
  try {
    // @ts-ignore - Intentional error for testing
    const obj: any = null;
    console.log(obj.property); // Will throw: Cannot read property of null
  } catch (error) {
    console.error('TEST RUNTIME ERROR:', error);
  }
};

// Test 3: Network Error Simulation
export const testNetworkError = async () => {
  try {
    const response = await fetch('https://nonexistent-api-endpoint-for-testing.com/data');
    await response.json();
  } catch (error) {
    console.error('TEST NETWORK ERROR:', error);
  }
};

// Test 4: Memory Usage Tracking
export const testMemoryTracking = () => {
  const largeArray: any[] = [];
  for (let i = 0; i < 10000; i++) {
    largeArray.push({ 
      data: new Array(1000).fill('test'), 
      timestamp: Date.now() 
    });
  }
  
  // Check if memory spike is detected
  if (performance && (performance as any).memory) {
    const memInfo = (performance as any).memory;
    console.log('Memory usage test:', {
      usedJSHeapSize: memInfo.usedJSHeapSize,
      totalJSHeapSize: memInfo.totalJSHeapSize,
      jsHeapSizeLimit: memInfo.jsHeapSizeLimit
    });
  }
};

// Run all tests
export const runAllAgentTests = async () => {
  console.log('🧪 Starting Agent Detection Tests...');
  
  testConsoleError();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  testRuntimeError();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testNetworkError();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  testMemoryTracking();
  
  console.log('✅ All tests completed. Check /agent-status for detection results.');
  console.log('⏰ Wait 5 minutes for cron job or click "Trigger Healing" button.');
};
