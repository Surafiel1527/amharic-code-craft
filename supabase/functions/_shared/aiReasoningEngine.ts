/**
 * AI REASONING ENGINE
 * Dynamic AI-powered decision making and code generation
 * No hardcoded patterns - uses real AI models
 */

import { callAIWithFallback } from './aiHelpers.ts';
import { logger } from './logger.ts';
import { retryWithBackoff, withTimeout, TimeoutError } from './errorHandler.ts';
import { validateString, validateObject } from './validation.ts';

export interface ReasoningContext {
  userRequest: string;
  projectContext: any;
  conversationHistory: any[];
  searchResults?: any;
  constraints?: string[];
}

export interface ReasoningResult {
  decision: string;
  confidence: number;
  reasoning: string[];
  suggestedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
  risks: string[];
  alternatives: string[];
}

/**
 * Use AI to reason about what to do
 */
export async function reasonAboutRequest(
  context: ReasoningContext
): Promise<ReasoningResult> {
  // Validate inputs
  const requestValidation = validateString(context.userRequest, { 
    minLength: 1, 
    maxLength: 50000 
  });
  if (!requestValidation.success) {
    logger.error('Invalid user request for reasoning', requestValidation.error);
    throw new Error(`Invalid user request: ${requestValidation.error}`);
  }

  const contextValidation = validateObject(context.projectContext);
  if (!contextValidation.success) {
    logger.error('Invalid project context', contextValidation.error);
    throw new Error(`Invalid project context: ${contextValidation.error}`);
  }

  logger.info('Starting AI reasoning', { 
    requestLength: context.userRequest.length,
    hasSearchResults: !!context.searchResults
  });
  
  const prompt = buildReasoningPrompt(context);
  
  try {
    const response = await retryWithBackoff(
      () => withTimeout(
        () => callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are an expert software architect and developer. Provide deep, structured reasoning about development requests.',
            preferredModel: 'google/gemini-2.5-pro',
            maxTokens: 2000
          }
        ),
        30000 // 30 second timeout
      ),
      { 
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          logger.warn(`AI reasoning retry attempt ${attempt}`, { error: error.message });
        }
      }
    );

    const reasoning = response.data.choices[0].message.content;
    const result = parseReasoningResponse(reasoning);
    
    logger.info('AI reasoning completed', { 
      decision: result.decision, 
      confidence: result.confidence 
    });
    
    return result;

  } catch (error) {
    logger.error('AI reasoning failed', error);
    return {
      decision: 'proceed_cautiously',
      confidence: 0.5,
      reasoning: ['AI reasoning unavailable, using conservative approach'],
      suggestedActions: [],
      risks: ['Unknown complexity'],
      alternatives: []
    };
  }
}

/**
 * Build comprehensive reasoning prompt
 */
function buildReasoningPrompt(context: ReasoningContext): string {
  return `Analyze this development request and provide structured reasoning:

USER REQUEST: "${context.userRequest}"

PROJECT CONTEXT:
${JSON.stringify(context.projectContext, null, 2)}

${context.searchResults ? `
WEB RESEARCH RESULTS:
${JSON.stringify(context.searchResults, null, 2)}
` : ''}

${context.constraints && context.constraints.length > 0 ? `
CONSTRAINTS:
${context.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}
` : ''}

Provide your analysis in this JSON structure:
{
  "decision": "implement|research_first|clarify|reject",
  "confidence": 0.0-1.0,
  "reasoning": ["step 1", "step 2", "..."],
  "suggestedActions": [
    {
      "action": "specific action to take",
      "priority": "high|medium|low",
      "reasoning": "why this action"
    }
  ],
  "risks": ["potential risk 1", "potential risk 2"],
  "alternatives": ["alternative approach 1", "alternative approach 2"]
}

Think step by step. Be specific and actionable.`;
}

/**
 * Parse AI reasoning response
 */
function parseReasoningResponse(response: string): ReasoningResult {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        decision: parsed.decision || 'proceed_cautiously',
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || [],
        suggestedActions: parsed.suggestedActions || [],
        risks: parsed.risks || [],
        alternatives: parsed.alternatives || []
      };
    }
  } catch (error) {
    console.error('Failed to parse reasoning response:', error);
  }

  // Fallback: extract insights from text
  return {
    decision: 'proceed_cautiously',
    confidence: 0.6,
    reasoning: [response.slice(0, 200)],
    suggestedActions: [],
    risks: [],
    alternatives: []
  };
}

/**
 * Generate code using AI reasoning
 */
export async function generateCodeWithReasoning(
  requirements: {
    functionality: string;
    framework: string;
    requirements?: string;
    existingCode?: Record<string, string>;
    awashContext?: any;
  }
): Promise<{
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  explanation: string;
  reasoning: string[];
}> {
  // Validate inputs
  const funcValidation = validateString(requirements.functionality, { 
    minLength: 1, 
    maxLength: 10000 
  });
  if (!funcValidation.success) {
    throw new Error(`Invalid functionality: ${funcValidation.error}`);
  }

  const frameworkValidation = validateString(requirements.framework, { 
    minLength: 1, 
    maxLength: 100 
  });
  if (!frameworkValidation.success) {
    throw new Error(`Invalid framework: ${frameworkValidation.error}`);
  }

  logger.info('Starting code generation with reasoning', { 
    framework: requirements.framework,
    hasWorkspaceContext: !!requirements.awashContext
  });
  
  const existingFilesInfo = requirements.existingCode 
    ? `\n\nEXISTING FILES:\n${Object.keys(requirements.existingCode).join('\n')}`
    : '';
    
  const workspaceInfo = requirements.awashContext?.workspace 
    ? `\n\nWORKSPACE CONTEXT:\n${JSON.stringify(requirements.awashContext.workspace, null, 2)}`
    : '';

  const workspaceContext = requirements.awashContext?.workspace 
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ YOUR WORKSPACE ACCESS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have FULL ACCESS to this project workspace:

📁 PROJECT STRUCTURE:
${requirements.awashContext.workspace.fileSystem?.totalFiles || 0} files, ${requirements.awashContext.workspace.fileSystem?.totalSize || 0} bytes
Files: ${requirements.awashContext.workspace.fileSystem?.files?.slice(0, 10).map((f: any) => f.path).join(', ') || 'None yet'}

🔧 TECH STACK:
- Framework: ${requirements.awashContext.workspace.metadata?.framework || requirements.framework}
- Backend: ${requirements.awashContext.workspace.capabilities?.hasDatabase ? '✓ Database enabled' : '✗ No database'}
- Auth: ${requirements.awashContext.workspace.capabilities?.hasAuth ? '✓ Authentication enabled' : '✗ No auth'}
- Storage: ${requirements.awashContext.workspace.capabilities?.hasStorage ? '✓ File storage enabled' : '✗ No storage'}

📦 INSTALLED PACKAGES:
${requirements.awashContext.workspace.dependencies?.slice(0, 15).join(', ') || 'None'}

⚠️ RECENT ERRORS:
${requirements.awashContext.workspace.recentErrors?.length || 0} recent errors in workspace

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 YOUR ROLE:
You are generating files for a REAL PROJECT that will be:
1. Saved to the project database
2. Rendered in a live preview
3. Editable by the user
4. Part of a complete application

This is NOT a code snippet - this is ACTUAL PRODUCTION CODE.
`
    : '';

  const prompt = `${workspaceContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 GENERATION REQUEST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNCTIONALITY: ${requirements.functionality}
FRAMEWORK: ${requirements.framework}
REQUIREMENTS: ${requirements.requirements || 'None specified'}${existingFilesInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 WHAT TO GENERATE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate COMPLETE, PRODUCTION-READY code:
1. ✓ All necessary files with proper paths (src/components/, src/hooks/, etc.)
2. ✓ Full file content - NOT placeholders or "// ... rest of code"
3. ✓ TypeScript types and interfaces
4. ✓ Error handling and validation
5. ✓ Responsive design using Tailwind CSS
6. ✓ Comments explaining key decisions
7. ✓ Integration with existing workspace capabilities (database, auth, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 OUTPUT FORMAT (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON with this EXACT structure:
{
  "files": [
    {
      "path": "src/App.tsx",
      "content": "import React from 'react';\n\nexport default function App() {\n  return <div>Hello</div>;\n}",
      "language": "typescript"
    },
    {
      "path": "src/components/Button.tsx",
      "content": "export function Button() { return <button>Click</button>; }",
      "language": "typescript"
    }
  ],
  "explanation": "Generated a React app with a custom Button component",
  "reasoning": ["Used TypeScript for type safety", "Separated Button into its own component for reusability"]
}

⚠️ CRITICAL RULES:
- Generate 3-10 files minimum for a proper application structure
- Each file must have complete, working code (no placeholders!)
- Use proper file paths (src/components/, src/hooks/, src/lib/, etc.)
- Files will be saved to database and rendered immediately
- This is a REAL project, not a code example`;

  try {
    const response = await retryWithBackoff(
      () => withTimeout(
        () => callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: `You are a code generation API. You ONLY output valid JSON. No conversation, no explanations outside the JSON structure.

OUTPUT FORMAT:
{
  "files": [{"path": "...", "content": "...", "language": "..."}],
  "explanation": "...",
  "reasoning": ["..."]
}

RULES:
1. Return ONLY JSON, nothing else
2. Generate 3-10 complete, production-ready files
3. No placeholders or incomplete code
4. Use TypeScript for React projects
5. Include proper imports and exports`,
            preferredModel: 'google/gemini-2.5-flash',
            maxTokens: 4000,
            temperature: 0.3 // Lower temperature for more predictable, structured output
          }
        ),
        45000 // 45 second timeout for code generation
      ),
      { 
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          logger.warn(`Code generation retry attempt ${attempt}`, { error: error.message });
        }
      }
    );

    let content = response.data.choices[0].message.content;
    logger.info('Raw AI response received', { 
      contentLength: content.length,
      startsWithBrace: content.trim().startsWith('{'),
      preview: content.substring(0, 200)
    });
    
    // ✅ FIX: Strip markdown code fences if present
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    
    // ✅ FIX: Try to find JSON object more carefully
    let jsonStr = content;
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = content.substring(firstBrace, lastBrace + 1);
    }
    
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Validate that we have files array
      if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
        logger.error('❌ AI returned invalid response - no files array!', { parsed });
        throw new Error('AI code generation failed: Response missing files array. AI must return {files: [...], explanation: "...", reasoning: [...]}');
      }
      
      // Validate each file has required fields
      const validFiles = parsed.files.filter((f: any) => {
        if (!f.path || !f.content) {
          logger.warn('Skipping invalid file in AI response', { 
            path: f.path,
            hasContent: !!f.content 
          });
          return false;
        }
        
        // CRITICAL: Detect if content is accidentally JSON stringified
        if (typeof f.content === 'string' && f.content.trim().startsWith('{') && f.content.includes('"files"')) {
          logger.error('❌ DETECTED NESTED JSON IN FILE CONTENT!', {
            path: f.path,
            contentPreview: f.content.substring(0, 200)
          });
          throw new Error(`File ${f.path} contains nested JSON instead of actual code. This indicates AI prompt failure.`);
        }
        
        return true;
      });
      
      if (validFiles.length === 0) {
        throw new Error('AI generated no valid files - all files missing path or content');
      }
      
      const result = {
        files: validFiles.map((f: any) => ({
          path: f.path,
          content: f.content,
          language: f.language || 'typescript'
        })),
        explanation: parsed.explanation || '',
        reasoning: parsed.reasoning || []
      };
      
      logger.info('Code generation completed', { 
        filesCount: result.files.length,
        hasExplanation: !!result.explanation 
      });
      
      return result;
    } catch (parseError) {
      // NO FALLBACK - AI MUST return valid JSON
      logger.error('❌ AI returned unparseable JSON!', { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        rawResponse: content.substring(0, 1000)
      });
      throw new Error(`AI code generation failed: Invalid JSON response. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

  } catch (error) {
    logger.error('Code generation failed', error);
    throw error;
  }
}

/**
 * Analyze errors using AI
 */
export async function analyzeErrorWithAI(
  error: string,
  code: string,
  context: any
): Promise<{
  diagnosis: string;
  rootCause: string;
  suggestedFixes: Array<{
    fix: string;
    confidence: number;
    reasoning: string;
  }>;
}> {
  // Validate inputs
  const errorValidation = validateString(error, { minLength: 1, maxLength: 10000 });
  if (!errorValidation.success) {
    throw new Error(`Invalid error string: ${errorValidation.error}`);
  }

  const codeValidation = validateString(code, { minLength: 0, maxLength: 50000 });
  if (!codeValidation.success) {
    throw new Error(`Invalid code string: ${codeValidation.error}`);
  }

  logger.info('Starting error analysis', { 
    errorLength: error.length,
    codeLength: code.length 
  });
  
  const prompt = `Analyze this error and suggest fixes:

ERROR: ${error}

CODE:
\`\`\`
${code.slice(0, 1000)}
\`\`\`

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON:
{
  "diagnosis": "what's wrong",
  "rootCause": "underlying cause",
  "suggestedFixes": [
    {
      "fix": "specific fix to apply",
      "confidence": 0.0-1.0,
      "reasoning": "why this will work"
    }
  ]
}`;

  try {
    const response = await retryWithBackoff(
      () => withTimeout(
        () => callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: 'You are a debugging expert. Identify root causes and provide precise fixes.',
            preferredModel: 'google/gemini-2.5-flash',
            maxTokens: 2000
          }
        ),
        30000 // 30 second timeout
      ),
      { 
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          logger.warn(`Error analysis retry attempt ${attempt}`, { error: error.message });
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      logger.info('Error analysis completed', { 
        fixCount: result.suggestedFixes?.length || 0 
      });
      return result;
    }

    logger.warn('Could not parse structured error analysis response');
    return {
      diagnosis: content,
      rootCause: 'Unknown',
      suggestedFixes: []
    };

  } catch (error) {
    logger.error('Error analysis failed', error);
    throw error;
  }
}
