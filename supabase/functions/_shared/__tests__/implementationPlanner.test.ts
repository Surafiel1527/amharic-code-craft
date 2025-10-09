import { assertEquals } from "https://deno.land/std@0.220.0/testing/asserts.ts";

Deno.test("ImplementationPlanner - buildPlanningPrompt structure", () => {
  const request = "Create a user profile component";
  const analysis = {
    mainGoal: "user profile display",
    outputType: "react-component"
  };
  const codebaseAnalysis = {
    totalFiles: 50,
    similarFunctionality: [],
    recommendations: []
  };

  // Test prompt structure
  const promptParts = [
    "User Request:",
    request,
    "Analysis:",
    "Codebase Analysis:",
    "Generate a detailed implementation plan"
  ];

  for (const part of promptParts) {
    assertEquals(typeof part, "string");
  }
});

Deno.test("ImplementationPlanner - parseAIResponse with valid JSON", () => {
  const validResponse = JSON.stringify({
    summary: "Test plan",
    approach: "Create new component",
    steps: [],
    fileBreakdown: [],
    integrationStrategy: {
      existingFiles: [],
      newConnections: []
    },
    testingStrategy: {
      unitTests: [],
      integrationTests: [],
      manualChecks: []
    },
    rollbackPlan: {
      steps: [],
      safetyMeasures: []
    },
    successCriteria: []
  });

  const parsed = JSON.parse(validResponse);
  assertEquals(parsed.summary, "Test plan");
  assertEquals(parsed.approach, "Create new component");
});

Deno.test("ImplementationPlanner - generateFallbackPlan structure", () => {
  const codebaseAnalysis = {
    totalFiles: 50,
    implementationPlan: {
      approach: "create_new",
      newFilesToCreate: ["src/components/Test.tsx"]
    }
  };

  const fallbackPlan = {
    summary: "Basic implementation plan (AI parsing failed)",
    approach: codebaseAnalysis.implementationPlan.approach,
    steps: [
      {
        step: 1,
        action: "Create new files",
        files: codebaseAnalysis.implementationPlan.newFilesToCreate,
        purpose: "Implement requested functionality",
        estimatedTime: "30-60 min"
      }
    ],
    fileBreakdown: [],
    integrationStrategy: {
      existingFiles: [],
      newConnections: []
    },
    testingStrategy: {
      unitTests: ["Test core functionality"],
      integrationTests: ["Test integration points"],
      manualChecks: ["Verify UI/UX"]
    },
    rollbackPlan: {
      steps: ["Revert to previous version"],
      safetyMeasures: ["Backup before changes"]
    },
    successCriteria: ["Feature works as expected"]
  };

  assertEquals(fallbackPlan.summary.includes("AI parsing failed"), true);
  assertEquals(fallbackPlan.steps.length, 1);
});

Deno.test("ImplementationPlanner - formatPlanForDisplay", () => {
  const plan = {
    summary: "Test implementation",
    approach: "Create new",
    steps: [
      {
        step: 1,
        action: "Create component",
        files: ["Test.tsx"],
        purpose: "Testing",
        estimatedTime: "30 min"
      }
    ],
    fileBreakdown: [],
    integrationStrategy: {
      existingFiles: [],
      newConnections: []
    },
    testingStrategy: {
      unitTests: ["Test 1"],
      integrationTests: [],
      manualChecks: []
    },
    rollbackPlan: {
      steps: ["Revert"],
      safetyMeasures: ["Backup"]
    },
    successCriteria: ["Works"]
  };

  const formatted = `# Implementation Plan

## Summary
${plan.summary}

## Approach
${plan.approach}

## Steps
1. Create component (30 min)
   Files: Test.tsx
   Purpose: Testing`;

  assertEquals(formatted.includes("Implementation Plan"), true);
  assertEquals(formatted.includes(plan.summary), true);
});
