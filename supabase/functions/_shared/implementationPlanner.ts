/**
 * Implementation Planner - Generates detailed execution plans with AI
 * 
 * Creates structured, reviewable plans before code generation
 */

import { callAIWithFallback } from './aiHelpers.ts';

interface DetailedPlan {
  summary: string;
  approach: string;
  steps: Array<{
    step: number;
    action: string;
    files: string[];
    purpose: string;
    estimatedTime: string;
  }>;
  fileBreakdown: Array<{
    path: string;
    type: string;
    purpose: string;
    keyFeatures: string[];
    dependencies: string[];
    risks: string[];
  }>;
  integrationStrategy: {
    existingFiles: Array<{
      file: string;
      changes: string[];
      reason: string;
    }>;
    newConnections: Array<{
      from: string;
      to: string;
      type: string;
      purpose: string;
    }>;
  };
  testingStrategy: {
    unitTests: string[];
    integrationTests: string[];
    manualChecks: string[];
  };
  rollbackPlan: {
    steps: string[];
    safetyMeasures: string[];
  };
  successCriteria: string[];
}

/**
 * Generate detailed implementation plan using AI
 */
export async function generateDetailedPlan(
  request: string,
  analysis: any,
  codebaseAnalysis: any,
  LOVABLE_API_KEY: string
): Promise<DetailedPlan> {
  console.log('📋 Generating detailed implementation plan...');

  const prompt = buildPlanningPrompt(request, analysis, codebaseAnalysis);

  const aiResponse = await callAIWithFallback([
    { role: 'system', content: PLANNING_SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ], {
    preferredModel: 'google/gemini-2.5-flash',
    temperature: 0.3
  });

  // Parse AI response
  const plan = parseAIResponse(aiResponse.data, request, analysis, codebaseAnalysis);
  
  console.log('✅ Plan generated successfully');
  
  return plan;
}

/**
 * Build prompt for AI planning
 */
function buildPlanningPrompt(
  request: string,
  analysis: any,
  codebaseAnalysis: any
): string {
  return `
# Implementation Planning Request

## User Request
${request}

## Request Analysis
- Main Goal: ${analysis.mainGoal}
- Output Type: ${analysis.outputType}
- Complexity: ${analysis.complexity}
- Backend Needs: ${JSON.stringify(analysis.backendRequirements || {})}

## Codebase Analysis Results

### Similar Functionality Found
${codebaseAnalysis.similarFunctionality.length} file(s) with similar functionality:
${codebaseAnalysis.similarFunctionality.slice(0, 5).map((m: any) => 
  `- ${m.file} (${m.similarity}% match) - ${m.reason}`
).join('\n')}

### Duplicates Detected
${codebaseAnalysis.duplicates.duplicates.length} duplicate(s):
${codebaseAnalysis.duplicates.duplicates.map((d: any) => 
  `- ${d.name} in ${d.locations.join(', ')}`
).join('\n')}

### Conflicts
${codebaseAnalysis.duplicates.conflicts.length} conflict(s):
${codebaseAnalysis.duplicates.conflicts.map((c: any) => 
  `- [${c.severity.toUpperCase()}] ${c.issue}`
).join('\n')}

### Integration Points
${codebaseAnalysis.integrationPoints.length} integration point(s):
${codebaseAnalysis.integrationPoints.map((p: any) => 
  `- ${p.file}: ${p.connection} (${p.impact} impact)`
).join('\n')}

## Implementation Plan (Auto-Generated)
- Approach: ${codebaseAnalysis.implementationPlan.approach}
- Files to Enhance: ${codebaseAnalysis.implementationPlan.existingToEnhance.join(', ') || 'None'}
- New Files: ${codebaseAnalysis.implementationPlan.newFilesToCreate.join(', ')}
- Complexity: ${codebaseAnalysis.implementationPlan.estimatedComplexity}

## Recommendations
${codebaseAnalysis.recommendations.join('\n')}

---

Please create a DETAILED, PRODUCTION-READY implementation plan that:
1. Addresses all conflicts and duplicates FIRST
2. Shows EXACTLY what will be enhanced vs created new
3. Includes complete file structure with purposes
4. Details integration strategy with existing code
5. Provides testing and rollback plans
6. Sets clear success criteria

Return ONLY valid JSON matching the DetailedPlan interface.
`;
}

/**
 * System prompt for planning AI
 */
const PLANNING_SYSTEM_PROMPT = `You are an expert software architect creating detailed implementation plans.

Your plans must be:
- DETAILED with step-by-step actions
- PRODUCTION-READY with testing and rollback strategies
- CONFLICT-AWARE addressing all duplicates and issues
- INTEGRATION-FOCUSED showing how new code connects to existing
- TESTABLE with clear success criteria

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief 1-2 sentence overview",
  "approach": "Detailed explanation of the implementation approach",
  "steps": [
    {
      "step": 1,
      "action": "What to do",
      "files": ["file1.tsx"],
      "purpose": "Why this step",
      "estimatedTime": "5 minutes"
    }
  ],
  "fileBreakdown": [
    {
      "path": "src/components/Example.tsx",
      "type": "component",
      "purpose": "Main component for...",
      "keyFeatures": ["Feature 1", "Feature 2"],
      "dependencies": ["react", "other-file"],
      "risks": ["Potential issue 1"]
    }
  ],
  "integrationStrategy": {
    "existingFiles": [
      {
        "file": "src/App.tsx",
        "changes": ["Add import", "Update routing"],
        "reason": "To integrate new component"
      }
    ],
    "newConnections": [
      {
        "from": "NewComponent",
        "to": "ExistingComponent",
        "type": "props",
        "purpose": "Pass data"
      }
    ]
  },
  "testingStrategy": {
    "unitTests": ["Test 1", "Test 2"],
    "integrationTests": ["Integration test 1"],
    "manualChecks": ["Check 1", "Check 2"]
  },
  "rollbackPlan": {
    "steps": ["Step 1 to rollback", "Step 2"],
    "safetyMeasures": ["Backup strategy", "Verification"]
  },
  "successCriteria": ["Criterion 1", "Criterion 2"]
}

NEVER include markdown, explanations, or anything except the JSON object.`;

/**
 * Parse AI response into structured plan
 */
function parseAIResponse(
  aiResponse: any,
  request: string,
  analysis: any,
  codebaseAnalysis: any
): DetailedPlan {
  try {
    const content = aiResponse.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const plan = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!plan.summary || !plan.approach || !plan.steps) {
      throw new Error('Missing required plan fields');
    }

    return plan as DetailedPlan;
  } catch (error) {
    console.error('Failed to parse AI plan:', error);
    
    // Fallback to basic plan
    return generateFallbackPlan(request, analysis, codebaseAnalysis);
  }
}

/**
 * Generate fallback plan if AI fails
 */
function generateFallbackPlan(
  request: string,
  analysis: any,
  codebaseAnalysis: any
): DetailedPlan {
  const plan = codebaseAnalysis.implementationPlan;
  
  return {
    summary: `Implement ${analysis.mainGoal} using ${plan.approach} approach`,
    approach: `${plan.approach === 'enhance_existing' ? 'Enhance existing files' : 'Create new implementation'} with ${plan.estimatedComplexity} complexity`,
    steps: plan.newFilesToCreate.map((file: string, i: number) => ({
      step: i + 1,
      action: `Create ${file}`,
      files: [file],
      purpose: `Implement ${analysis.mainGoal}`,
      estimatedTime: '10-15 minutes'
    })),
    fileBreakdown: plan.fileStructure.map((f: any) => ({
      path: f.path,
      type: f.type,
      purpose: f.purpose,
      keyFeatures: [analysis.mainGoal],
      dependencies: f.dependencies,
      risks: plan.risks
    })),
    integrationStrategy: {
      existingFiles: plan.existingToEnhance.map((file: string) => ({
        file,
        changes: ['Enhance with new functionality'],
        reason: 'Similar functionality detected'
      })),
      newConnections: plan.integrationPoints.map((p: any) => ({
        from: 'New implementation',
        to: p.file,
        type: p.type,
        purpose: p.connection
      }))
    },
    testingStrategy: {
      unitTests: ['Test main functionality', 'Test edge cases'],
      integrationTests: ['Test integration with existing code'],
      manualChecks: ['Verify UI', 'Test user flows']
    },
    rollbackPlan: {
      steps: ['Revert file changes', 'Clear cache', 'Verify system'],
      safetyMeasures: ['Automatic backups', 'Version control']
    },
    successCriteria: [
      'Feature works as expected',
      'No regressions in existing code',
      'All tests pass'
    ]
  };
}

/**
 * Format plan for display to user
 */
export function formatPlanForDisplay(plan: DetailedPlan): string {
  return `
# 📋 Implementation Plan

## Summary
${plan.summary}

## Approach
${plan.approach}

## Implementation Steps
${plan.steps.map(s => `
${s.step}. **${s.action}** (${s.estimatedTime})
   - Files: ${s.files.join(', ')}
   - Purpose: ${s.purpose}
`).join('')}

## File Breakdown
${plan.fileBreakdown.map(f => `
### ${f.path}
- **Type**: ${f.type}
- **Purpose**: ${f.purpose}
- **Key Features**: ${f.keyFeatures.join(', ')}
- **Dependencies**: ${f.dependencies.join(', ')}
${f.risks.length > 0 ? `- **Risks**: ${f.risks.join(', ')}` : ''}
`).join('')}

## Integration Strategy

### Existing Files to Modify
${plan.integrationStrategy.existingFiles.map(f => `
- **${f.file}**
  - Changes: ${f.changes.join(', ')}
  - Reason: ${f.reason}
`).join('')}

### New Connections
${plan.integrationStrategy.newConnections.map(c => `
- ${c.from} → ${c.to} (${c.type}): ${c.purpose}
`).join('')}

## Testing Strategy
- **Unit Tests**: ${plan.testingStrategy.unitTests.join(', ')}
- **Integration Tests**: ${plan.testingStrategy.integrationTests.join(', ')}
- **Manual Checks**: ${plan.testingStrategy.manualChecks.join(', ')}

## Rollback Plan
${plan.rollbackPlan.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Safety Measures**: ${plan.rollbackPlan.safetyMeasures.join(', ')}

## Success Criteria
${plan.successCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

---
**Ready to proceed? Reply "yes" to start implementation or suggest changes.**
`;
}
