/**
 * Unified Healing Engine - Phase 1 Consolidation
 * 
 * Replaces 3 separate functions:
 * - auto-fix-engine
 * - autonomous-healing-engine
 * - mega-mind-self-healer
 * 
 * Features:
 * - Error detection and analysis
 * - Automatic fix generation
 * - Self-healing capabilities
 * - Pattern learning
 * - Fix validation
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealingRequest {
  action: 'analyze' | 'fix' | 'validate' | 'learn';
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
  fileContext?: string;
  filePath?: string;
  projectId?: string;
  userId?: string;
  fixId?: string;
  appliedFix?: string;
  success?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const {
      action,
      errorCode,
      errorMessage,
      stackTrace,
      fileContext,
      filePath,
      projectId,
      userId,
      fixId,
      appliedFix,
      success
    }: HealingRequest = await req.json();

    console.log(`[Healing Engine] Action: ${action}`);

    // Route to appropriate handler
    switch (action) {
      case 'analyze':
        return await analyzeError(supabase, geminiApiKey, {
          errorCode,
          errorMessage,
          stackTrace,
          fileContext,
          filePath,
          projectId,
          userId
        });

      case 'fix':
        return await generateFix(supabase, geminiApiKey, {
          errorCode,
          errorMessage,
          stackTrace,
          fileContext,
          filePath,
          projectId,
          userId
        });

      case 'validate':
        return await validateFix(supabase, {
          fixId,
          appliedFix,
          success,
          projectId
        });

      case 'learn':
        return await learnFromFix(supabase, {
          errorMessage,
          appliedFix,
          success,
          projectId
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[Healing Engine] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Analyze error and determine severity and type
 */
async function analyzeError(supabase: any, geminiApiKey: string, params: any) {
  const { errorMessage, stackTrace, fileContext, filePath } = params;

  console.log('[Healing] Analyzing error...');

  // Check for known patterns first
  const { data: patterns } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .gte('confidence_score', 0.7)
    .order('confidence_score', { ascending: false })
    .limit(10);

  let matchedPattern = null;
  if (patterns) {
    matchedPattern = patterns.find((p: any) => 
      errorMessage?.toLowerCase().includes(p.error_pattern.toLowerCase())
    );
  }

  // Use AI for deep analysis
  const analysisPrompt = `Analyze this error and provide insights:

Error: ${errorMessage}
Stack Trace: ${stackTrace || 'N/A'}
File Context: ${fileContext || 'N/A'}
File Path: ${filePath || 'N/A'}

Provide:
1. Error type (syntax, runtime, logic, type, import, etc.)
2. Severity (low, medium, high, critical)
3. Root cause analysis
4. Affected components/files
5. Recommended fix strategy`;

  const aiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: analysisPrompt }]
        }]
      })
    }
  );

  const aiData = await aiResponse.json();
  const analysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable';

  return new Response(
    JSON.stringify({
      success: true,
      analysis: {
        aiAnalysis: analysis,
        matchedPattern: matchedPattern ? {
          id: matchedPattern.id,
          pattern: matchedPattern.error_pattern,
          solution: matchedPattern.fix_template,
          confidence: matchedPattern.confidence_score
        } : null,
        errorType: extractErrorType(analysis),
        severity: extractSeverity(analysis)
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Generate automatic fix for the error
 */
async function generateFix(supabase: any, geminiApiKey: string, params: any) {
  const { errorMessage, stackTrace, fileContext, filePath, projectId, userId } = params;

  console.log('[Healing] Generating fix...');

  // Check if we have a proven fix pattern
  const { data: patterns } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .gte('confidence_score', 0.8)
    .order('success_count', { ascending: false });

  let knownFix = null;
  if (patterns) {
    const match = patterns.find((p: any) =>
      errorMessage?.toLowerCase().includes(p.error_pattern.toLowerCase())
    );
    if (match) {
      knownFix = match.fix_template;
    }
  }

  // Generate AI-based fix
  const fixPrompt = `Generate a fix for this error:

Error: ${errorMessage}
Stack Trace: ${stackTrace || 'N/A'}
File: ${filePath || 'unknown'}
Context:
\`\`\`
${fileContext || 'No context provided'}
\`\`\`

${knownFix ? `Known solution pattern: ${knownFix}\n\n` : ''}

Provide:
1. Complete fixed code
2. Explanation of changes
3. Prevention tips for future

Return as JSON:
{
  "fixedCode": "...",
  "explanation": "...",
  "preventionTips": ["..."]
}`;

  const aiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fixPrompt }]
        }]
      })
    }
  );

  const aiData = await aiResponse.json();
  const fixText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  let fixData;
  try {
    const jsonMatch = fixText.match(/\{[\s\S]*\}/);
    fixData = jsonMatch ? JSON.parse(jsonMatch[0]) : { fixedCode: fixText, explanation: '', preventionTips: [] };
  } catch {
    fixData = { fixedCode: fixText, explanation: 'AI-generated fix', preventionTips: [] };
  }

  // Store the fix
  const { data: healingRecord } = await supabase
    .from('ai_healing_logs')
    .insert({
      user_id: userId,
      project_id: projectId,
      error_message: errorMessage,
      error_location: filePath,
      fix_applied: fixData.fixedCode,
      success: false, // Will be updated on validation
      healing_strategy: knownFix ? 'pattern-based' : 'ai-generated'
    })
    .select()
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      fix: {
        id: healingRecord?.id,
        fixedCode: fixData.fixedCode,
        explanation: fixData.explanation,
        preventionTips: fixData.preventionTips,
        confidence: knownFix ? 'high' : 'medium',
        source: knownFix ? 'proven-pattern' : 'ai-generated'
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Validate if applied fix worked
 */
async function validateFix(supabase: any, params: any) {
  const { fixId, appliedFix, success, projectId } = params;

  console.log(`[Healing] Validating fix: ${fixId}, success: ${success}`);

  if (fixId) {
    await supabase
      .from('ai_healing_logs')
      .update({
        success,
        validated_at: new Date().toISOString()
      })
      .eq('id', fixId);
  }

  return new Response(
    JSON.stringify({
      success: true,
      validated: true,
      fixWorked: success
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Learn from fix results to improve future healing
 */
async function learnFromFix(supabase: any, params: any) {
  const { errorMessage, appliedFix, success } = params;

  console.log('[Healing] Learning from fix result...');

  if (!success || !errorMessage || !appliedFix) {
    return new Response(
      JSON.stringify({ success: true, learned: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update or create error pattern
  const errorPattern = extractErrorPattern(errorMessage);
  
  const { data: existing } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .eq('error_pattern', errorPattern)
    .single();

  if (existing) {
    // Update existing pattern
    await supabase
      .from('universal_error_patterns')
      .update({
        success_count: existing.success_count + 1,
        last_success_at: new Date().toISOString(),
        confidence_score: Math.min(1.0, existing.confidence_score + 0.05)
      })
      .eq('id', existing.id);
  } else {
    // Create new pattern
    await supabase
      .from('universal_error_patterns')
      .insert({
        error_pattern: errorPattern,
        fix_template: appliedFix,
        success_count: 1,
        failure_count: 0,
        confidence_score: 0.6,
        last_success_at: new Date().toISOString()
      });
  }

  return new Response(
    JSON.stringify({
      success: true,
      learned: true,
      pattern: errorPattern
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

// Helper functions
function extractErrorType(analysis: string): string {
  const types = ['syntax', 'runtime', 'logic', 'type', 'import'];
  const lower = analysis.toLowerCase();
  return types.find(t => lower.includes(t)) || 'unknown';
}

function extractSeverity(analysis: string): string {
  const severities = ['critical', 'high', 'medium', 'low'];
  const lower = analysis.toLowerCase();
  return severities.find(s => lower.includes(s)) || 'medium';
}

function extractErrorPattern(errorMessage: string): string {
  // Extract the core error pattern by removing specific details
  return errorMessage
    .replace(/['"].*?['"]/g, '""') // Remove quoted strings
    .replace(/\d+/g, 'N') // Replace numbers with N
    .replace(/at\s+.*$/gm, '') // Remove stack trace locations
    .trim()
    .substring(0, 200); // Limit length
}