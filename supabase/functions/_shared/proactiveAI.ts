/**
 * Proactive AI - ML-driven suggestions and next steps
 * Analyzes generation context to provide intelligent recommendations
 */

import { callAIWithFallback } from './aiHelpers.ts';
import { FileMetadata, ProactiveSuggestion } from './generationMetadata.ts';

export interface NextStepSuggestion {
  title: string;
  description: string;
  category: 'feature' | 'optimization' | 'testing' | 'deployment' | 'documentation';
  priority: number; // 1-10
  estimatedEffort: 'low' | 'medium' | 'high';
  prerequisites: string[];
  expectedBenefits: string[];
  implementationHints: string[];
}

/**
 * Generate ML-driven next steps after generation
 */
export async function generateNextSteps(ctx: {
  request: string;
  framework: string;
  analysis: any;
  files: FileMetadata[];
  conversationHistory: any[];
  projectContext?: any;
}): Promise<NextStepSuggestion[]> {
  console.log('🤖 Generating proactive next-step suggestions...');
  
  const { request, framework, analysis, files, conversationHistory, projectContext } = ctx;
  
  // Analyze what was built
  const builtFeatures = analyzeBuiltFeatures(files, analysis);
  const missingFeatures = identifyMissingFeatures(request, builtFeatures, analysis);
  const improvementAreas = identifyImprovementAreas(files, analysis);
  
  // Generate AI-powered suggestions
  const aiSuggestions = await generateAISuggestions({
    request,
    framework,
    builtFeatures,
    missingFeatures,
    improvementAreas,
    conversationHistory
  });
  
  // Combine with rule-based suggestions
  const ruleSuggestions = generateRuleBasedSuggestions(files, analysis, projectContext);
  
  // Merge and rank suggestions
  const allSuggestions = [...aiSuggestions, ...ruleSuggestions];
  const rankedSuggestions = rankSuggestions(allSuggestions, ctx);
  
  console.log(`✅ Generated ${rankedSuggestions.length} proactive suggestions`);
  return rankedSuggestions.slice(0, 10); // Top 10
}

/**
 * Analyze what features were built
 */
function analyzeBuiltFeatures(files: FileMetadata[], analysis: any): string[] {
  const features: Set<string> = new Set();
  
  // Detect features from files
  files.forEach(file => {
    if (file.path.includes('Auth')) features.add('authentication');
    if (file.path.includes('Database')) features.add('database');
    if (file.path.includes('Form')) features.add('forms');
    if (file.path.includes('Table') || file.path.includes('List')) features.add('data_display');
    if (file.path.includes('Dashboard')) features.add('analytics');
    if (file.path.includes('Chat')) features.add('messaging');
    if (file.path.includes('Upload')) features.add('file_upload');
    if (file.path.includes('Payment')) features.add('payments');
  });
  
  // Detect from analysis
  if (analysis.backendRequirements?.needsAuth) features.add('authentication');
  if (analysis.backendRequirements?.needsDatabase) features.add('database');
  if (analysis.backendRequirements?.needsStorage) features.add('file_storage');
  
  return Array.from(features);
}

/**
 * Identify features mentioned in request but not built
 */
function identifyMissingFeatures(request: string, builtFeatures: string[], analysis: any): string[] {
  const missing: string[] = [];
  
  const requestLower = request.toLowerCase();
  
  const featureChecks = [
    { keyword: ['search', 'filter'], feature: 'search_functionality', built: 'search' },
    { keyword: ['notification', 'alert'], feature: 'notifications', built: 'notifications' },
    { keyword: ['comment', 'review'], feature: 'comments_reviews', built: 'comments' },
    { keyword: ['analytics', 'tracking'], feature: 'analytics', built: 'analytics' },
    { keyword: ['export', 'download'], feature: 'data_export', built: 'export' },
    { keyword: ['theme', 'dark mode'], feature: 'theming', built: 'theme' },
    { keyword: ['mobile', 'responsive'], feature: 'mobile_optimization', built: 'mobile' },
    { keyword: ['email'], feature: 'email_notifications', built: 'email' },
    { keyword: ['admin', 'dashboard'], feature: 'admin_panel', built: 'admin' },
  ];
  
  featureChecks.forEach(check => {
    const mentioned = check.keyword.some(kw => requestLower.includes(kw));
    const built = builtFeatures.includes(check.built);
    if (mentioned && !built) {
      missing.push(check.feature);
    }
  });
  
  return missing;
}

/**
 * Identify areas for improvement
 */
function identifyImprovementAreas(files: FileMetadata[], analysis: any): string[] {
  const areas: string[] = [];
  
  const hasTests = files.some(f => f.type === 'test');
  if (!hasTests) areas.push('testing');
  
  const hasDocumentation = files.some(f => f.path.includes('README') || f.path.includes('.md'));
  if (!hasDocumentation) areas.push('documentation');
  
  const avgFileSize = files.reduce((sum, f) => sum + f.content.length, 0) / files.length;
  if (avgFileSize > 500) areas.push('code_splitting');
  
  const hasErrorBoundary = files.some(f => f.content.includes('ErrorBoundary'));
  if (!hasErrorBoundary) areas.push('error_handling');
  
  const hasAccessibility = files.some(f => f.content.includes('aria-'));
  if (!hasAccessibility) areas.push('accessibility');
  
  return areas;
}

/**
 * Generate AI-powered suggestions
 */
async function generateAISuggestions(ctx: {
  request: string;
  framework: string;
  builtFeatures: string[];
  missingFeatures: string[];
  improvementAreas: string[];
  conversationHistory: any[];
}): Promise<NextStepSuggestion[]> {
  const prompt = `Analyze this project and suggest the next best steps:

**User Request**: ${ctx.request}
**Framework**: ${ctx.framework}
**Features Built**: ${ctx.builtFeatures.join(', ')}
**Missing Features**: ${ctx.missingFeatures.join(', ')}
**Improvement Areas**: ${ctx.improvementAreas.join(', ')}
**Conversation Context**: ${ctx.conversationHistory.slice(-3).map(m => m.content).join(' | ')}

Generate 5-7 actionable next-step suggestions that would provide the most value to the user.
Each suggestion should:
- Build on what was already created
- Address missing features or improvements
- Be realistic and actionable
- Provide clear value

Return ONLY valid JSON array of suggestions:
[
  {
    "title": "Add user authentication",
    "description": "Implement secure login and signup with Supabase Auth",
    "category": "feature",
    "priority": 8,
    "estimatedEffort": "medium",
    "prerequisites": ["Supabase project configured"],
    "expectedBenefits": ["Secure user access", "Personalized experience"],
    "implementationHints": ["Use Supabase Auth hooks", "Add protected routes"]
  }
]`;

  try {
    const aiResponse = await callAIWithFallback([
      { role: 'system', content: PROACTIVE_AI_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ], {
      preferredModel: 'google/gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 2000
    });
    
    const content = aiResponse.data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('⚠️ AI suggestion generation failed:', error);
  }
  
  return [];
}

const PROACTIVE_AI_SYSTEM_PROMPT = `You are an expert product manager and software architect.
Your role is to analyze projects and suggest the most valuable next steps.

Focus on:
- User value and impact
- Technical feasibility
- Natural progression from current state
- Industry best practices
- Common user needs

Be specific, actionable, and prioritize suggestions by value.`;

/**
 * Generate rule-based suggestions
 */
function generateRuleBasedSuggestions(
  files: FileMetadata[],
  analysis: any,
  projectContext?: any
): NextStepSuggestion[] {
  const suggestions: NextStepSuggestion[] = [];
  
  // Always suggest testing if not present
  if (!files.some(f => f.type === 'test')) {
    suggestions.push({
      title: 'Add comprehensive testing',
      description: 'Set up automated testing with Jest/Vitest and React Testing Library to ensure code quality',
      category: 'testing',
      priority: 9,
      estimatedEffort: 'medium',
      prerequisites: ['Install testing dependencies'],
      expectedBenefits: [
        'Catch bugs early',
        'Enable confident refactoring',
        'Improve code reliability',
        'Facilitate CI/CD'
      ],
      implementationHints: [
        'Generate test files for each component',
        'Add test scripts to package.json',
        'Set up coverage reporting'
      ]
    });
  }
  
  // Suggest deployment if project is ready
  if (files.length >= 3 && !projectContext?.deployed) {
    suggestions.push({
      title: 'Deploy to production',
      description: 'Deploy your app to Vercel or Netlify with one click',
      category: 'deployment',
      priority: 8,
      estimatedEffort: 'low',
      prerequisites: ['GitHub repository'],
      expectedBenefits: [
        'Make app publicly accessible',
        'Get real user feedback',
        'Enable continuous deployment'
      ],
      implementationHints: [
        'Connect GitHub to Vercel',
        'Configure environment variables',
        'Set up custom domain'
      ]
    });
  }
  
  // Suggest documentation
  if (!files.some(f => f.path.includes('README'))) {
    suggestions.push({
      title: 'Add project documentation',
      description: 'Create README with setup instructions, API docs, and architecture overview',
      category: 'documentation',
      priority: 6,
      estimatedEffort: 'low',
      prerequisites: [],
      expectedBenefits: [
        'Easier onboarding for new developers',
        'Better project maintainability',
        'Clear API reference'
      ],
      implementationHints: [
        'Document installation steps',
        'Add API endpoint documentation',
        'Include architecture diagrams'
      ]
    });
  }
  
  // Suggest performance optimization
  if (files.length > 10) {
    suggestions.push({
      title: 'Optimize performance with code splitting',
      description: 'Implement lazy loading and route-based code splitting to reduce bundle size',
      category: 'optimization',
      priority: 7,
      estimatedEffort: 'medium',
      prerequisites: ['Vite/Webpack configured'],
      expectedBenefits: [
        'Faster initial load time',
        'Better user experience',
        'Reduced bandwidth usage'
      ],
      implementationHints: [
        'Use React.lazy() for routes',
        'Add Suspense boundaries',
        'Configure chunk optimization'
      ]
    });
  }
  
  // Suggest accessibility improvements
  if (!files.some(f => f.content.includes('aria-'))) {
    suggestions.push({
      title: 'Improve accessibility',
      description: 'Add ARIA labels, keyboard navigation, and screen reader support',
      category: 'optimization',
      priority: 7,
      estimatedEffort: 'medium',
      prerequisites: [],
      expectedBenefits: [
        'Reach wider audience',
        'Better SEO',
        'Legal compliance',
        'Improved UX for all users'
      ],
      implementationHints: [
        'Add ARIA labels to interactive elements',
        'Ensure keyboard navigation works',
        'Test with screen readers'
      ]
    });
  }
  
  return suggestions;
}

/**
 * Rank suggestions by priority and relevance
 */
function rankSuggestions(
  suggestions: NextStepSuggestion[],
  ctx: any
): NextStepSuggestion[] {
  return suggestions
    .map(s => ({
      ...s,
      // Adjust priority based on context
      adjustedPriority: calculateAdjustedPriority(s, ctx)
    }))
    .sort((a, b) => b.adjustedPriority - a.adjustedPriority)
    .map(({ adjustedPriority, ...s }) => s); // Remove temporary field
}

function calculateAdjustedPriority(suggestion: NextStepSuggestion, ctx: any): number {
  let priority = suggestion.priority;
  
  // Boost testing priority if no tests exist
  if (suggestion.category === 'testing' && !ctx.files.some((f: any) => f.type === 'test')) {
    priority += 2;
  }
  
  // Boost deployment if project is mature
  if (suggestion.category === 'deployment' && ctx.files.length > 5) {
    priority += 1;
  }
  
  // Lower priority for high-effort items if project is new
  if (suggestion.estimatedEffort === 'high' && ctx.files.length < 5) {
    priority -= 1;
  }
  
  return priority;
}

/**
 * Format suggestions for display
 */
export function formatNextStepsForDisplay(suggestions: NextStepSuggestion[]): string {
  return `
# 🚀 Recommended Next Steps

${suggestions.map((s, i) => `
## ${i + 1}. ${s.title} 
**Priority**: ${'⭐'.repeat(Math.min(5, Math.ceil(s.priority / 2)))} (${s.priority}/10)
**Effort**: ${s.estimatedEffort.toUpperCase()}
**Category**: ${s.category}

${s.description}

**Expected Benefits:**
${s.expectedBenefits.map(b => `- ${b}`).join('\n')}

**Prerequisites:**
${s.prerequisites.length > 0 ? s.prerequisites.map(p => `- ${p}`).join('\n') : '- None'}

**Implementation Hints:**
${s.implementationHints.map(h => `- ${h}`).join('\n')}

---
`).join('')}

**Want to implement any of these? Just let me know!**
`;
}
