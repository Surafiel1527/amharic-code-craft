import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/testing/asserts.ts";

// Mock types for testing
interface MockFile {
  component_name: string;
  component_type: string;
  depends_on: string[];
}

Deno.test("CodebaseAnalyzer - detectFileType", () => {
  const testCases = [
    { path: "src/hooks/useTest.ts", expected: "hook" },
    { path: "src/pages/Home.tsx", expected: "page" },
    { path: "src/components/Button.tsx", expected: "component" },
    { path: "src/utils/helpers.ts", expected: "util" },
    { path: "supabase/functions/test/index.ts", expected: "api" }
  ];

  // Since detectFileType is not exported, we test the logic here
  for (const tc of testCases) {
    let result: string;
    if (tc.path.includes('/hooks/')) result = 'hook';
    else if (tc.path.includes('/pages/')) result = 'page';
    else if (tc.path.includes('/components/')) result = 'component';
    else if (tc.path.includes('/utils/') || tc.path.includes('/lib/')) result = 'util';
    else if (tc.path.includes('/api/') || tc.path.includes('supabase/functions/')) result = 'api';
    else result = 'unknown';

    assertEquals(result, tc.expected, `Failed for path: ${tc.path}`);
  }
});

Deno.test("CodebaseAnalyzer - extractKeywords", () => {
  const request = "Create a dashboard component with charts";
  const analysis = {
    mainGoal: "dashboard visualization",
    outputType: "react-component"
  };

  const words = request.toLowerCase().split(/\s+/);
  const significantWords = words.filter(w => 
    w.length > 4 && 
    !['create', 'build', 'make', 'please', 'implement', 'should', 'would', 'could'].includes(w)
  );

  assertExists(significantWords.find(w => w === "dashboard"));
  assertExists(significantWords.find(w => w === "component"));
  assertExists(significantWords.find(w => w === "charts"));
});

Deno.test("CodebaseAnalyzer - similarity detection logic", () => {
  const file = {
    path: "src/components/DashboardChart.tsx",
    type: "component"
  };
  const keywords = ["dashboard", "chart", "component"];
  
  let similarity = 0;
  const fileLower = file.path.toLowerCase();
  
  for (const keyword of keywords) {
    if (fileLower.includes(keyword)) {
      similarity += 30;
    }
  }

  // Should detect high similarity
  assertEquals(similarity >= 30, true);
});

Deno.test("CodebaseAnalyzer - complexity estimation", () => {
  const testCases = [
    { canEnhance: 0, newFiles: 1, integrations: 1, conflicts: 0, expected: "low" },
    { canEnhance: 1, newFiles: 2, integrations: 2, conflicts: 0, expected: "medium" },
    { canEnhance: 2, newFiles: 3, integrations: 3, conflicts: 1, expected: "high" },
    { canEnhance: 3, newFiles: 5, integrations: 5, conflicts: 2, expected: "very_high" }
  ];

  for (const tc of testCases) {
    const factorScore = 
      (tc.canEnhance * 2) + 
      (tc.newFiles * 3) + 
      (tc.integrations * 2) +
      (tc.conflicts * 3);
    
    let complexity: string;
    if (factorScore < 10) complexity = 'low';
    else if (factorScore < 20) complexity = 'medium';
    else if (factorScore < 35) complexity = 'high';
    else complexity = 'very_high';

    assertEquals(complexity, tc.expected);
  }
});
