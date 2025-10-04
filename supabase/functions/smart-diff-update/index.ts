import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analyze what sections of code need changes
function analyzeChanges(userRequest: string, code: string): {
  scope: 'minimal' | 'moderate' | 'extensive';
  affectedSections: string[];
  strategy: string;
} {
  const requestLower = userRequest.toLowerCase();
  const codeLength = code.length;
  
  // Determine scope
  let scope: 'minimal' | 'moderate' | 'extensive' = 'minimal';
  const affectedSections: string[] = [];
  
  // Styling changes are usually minimal
  if (requestLower.includes('color') || requestLower.includes('style') || 
      requestLower.includes('font') || requestLower.includes('design')) {
    scope = 'minimal';
    affectedSections.push('CSS styles');
  }
  
  // Content changes
  if (requestLower.includes('text') || requestLower.includes('content') || 
      requestLower.includes('heading') || requestLower.includes('button text')) {
    scope = 'minimal';
    affectedSections.push('HTML content');
  }
  
  // Component additions
  if (requestLower.includes('add') || requestLower.includes('new section') || 
      requestLower.includes('create')) {
    scope = 'moderate';
    affectedSections.push('HTML structure');
  }
  
  // Functionality changes
  if (requestLower.includes('function') || requestLower.includes('feature') || 
      requestLower.includes('interactive') || requestLower.includes('click')) {
    scope = 'moderate';
    affectedSections.push('JavaScript logic');
  }
  
  // Major refactors
  if (requestLower.includes('refactor') || requestLower.includes('reorganize') || 
      requestLower.includes('restructure') || codeLength > 10000) {
    scope = 'extensive';
    affectedSections.push('Full codebase');
  }
  
  const strategy = scope === 'minimal' 
    ? 'Target specific lines/sections only'
    : scope === 'moderate'
    ? 'Update relevant components while preserving others'
    : 'Comprehensive refactor with careful preservation';
    
  return { scope, affectedSections, strategy };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userRequest, 
      currentCode, 
      conversationId,
      userId 
    } = await req.json();
    
    console.log('🔍 Smart diff update:', { 
      requestLength: userRequest.length,
      codeLength: currentCode.length 
    });

    // Analyze what needs to change
    const changeAnalysis = analyzeChanges(userRequest, currentCode);
    console.log('📊 Change analysis:', changeAnalysis);

    // Get project memory for context
    const { data: memory } = await supabase
      .from('project_memory')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    // Create focused prompt based on analysis
    const diffPrompt = `You are an expert at making SURGICAL code updates. Make MINIMAL changes.

CHANGE ANALYSIS:
- Scope: ${changeAnalysis.scope}
- Affected Sections: ${changeAnalysis.affectedSections.join(', ')}
- Strategy: ${changeAnalysis.strategy}

USER REQUEST: "${userRequest}"

CURRENT CODE:
${currentCode}

${memory ? `
PROJECT PATTERNS:
${JSON.stringify(memory.coding_patterns || {})}
` : ''}

CRITICAL INSTRUCTIONS:
1. ${changeAnalysis.scope === 'minimal' 
  ? 'Make ONLY the specific changes requested. Change as few lines as possible.' 
  : changeAnalysis.scope === 'moderate'
  ? 'Update only the relevant sections. Preserve all unrelated code exactly as-is.'
  : 'Make comprehensive changes but maintain all existing functionality.'}

2. DO NOT rewrite entire sections unnecessarily
3. Preserve all formatting, indentation, and code style
4. Keep all existing functionality that isn't being modified
5. Only output the CHANGED code sections with context

OUTPUT FORMAT:
Provide a brief explanation of what you changed, then the COMPLETE updated code in <code></code> tags.

Focus on surgical precision - change only what's needed!`;

    console.log('🚀 Calling AI for diff-based update...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: changeAnalysis.scope === 'minimal' 
          ? "google/gemini-2.5-flash-lite" // Fast model for simple changes
          : "google/gemini-2.5-flash", // Balanced for moderate changes
        messages: [
          { role: "user", content: diffPrompt }
        ],
        temperature: 0.3, // Lower temperature for precise changes
        max_tokens: changeAnalysis.scope === 'minimal' ? 4000 : 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('rate_limit');
      } else if (response.status === 402) {
        throw new Error('payment_required');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Extract code
    const codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
    const updatedCode = codeMatch ? codeMatch[1].trim() : null;
    const explanation = aiResponse.replace(/<code>[\s\S]*?<\/code>/, '').trim();

    // Calculate efficiency metrics
    const originalLength = currentCode.length;
    const newLength = updatedCode?.length || 0;
    const changePercent = Math.abs((newLength - originalLength) / originalLength * 100).toFixed(1);

    console.log('✅ Diff update complete:', {
      originalLength,
      newLength,
      changePercent: `${changePercent}%`,
      scope: changeAnalysis.scope
    });

    // Track the update
    if (userId) {
      await supabase
        .from('generation_analytics')
        .insert({
          user_id: userId,
          model_used: changeAnalysis.scope === 'minimal' 
            ? 'google/gemini-2.5-flash-lite' 
            : 'google/gemini-2.5-flash',
          user_prompt: userRequest,
          system_prompt: 'Diff-based smart update',
          generated_code: updatedCode || '',
          existing_code_context: `${originalLength} chars -> ${newLength} chars (${changePercent}% change)`,
          status: 'success'
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: updatedCode,
        explanation,
        changeAnalysis: {
          ...changeAnalysis,
          efficiency: {
            originalLength,
            newLength,
            changePercent: `${changePercent}%`,
            linesPreserved: Math.floor((1 - Math.abs(newLength - originalLength) / originalLength) * 100)
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Error in smart-diff-update:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        type: error.message.includes('rate_limit') ? 'rate_limit' : 
              error.message.includes('payment_required') ? 'payment_required' : 'unknown'
      }),
      { 
        status: error.message.includes('rate_limit') ? 429 : 
                error.message.includes('payment_required') ? 402 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});