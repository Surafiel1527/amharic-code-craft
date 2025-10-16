/**
 * Direct Code Editor - Fast path for simple changes
 * 
 * Handles simple, surgical edits without heavy AI orchestration:
 * - Color/style changes
 * - Text updates
 * - Simple visibility toggles
 * - Single-line fixes
 * 
 * Performance target: < 2s, ~$0.02 per request
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { generateNaturalResponse } from '../_shared/aiResponseGenerator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EditInstruction {
  file: string;
  action: 'replace' | 'insert' | 'delete';
  startLine?: number;
  endLine?: number;
  insertAfterLine?: number;
  content: string;
  description: string;
}

/**
 * Parse simple edit request into structured instructions
 */
function parseSimpleEdit(request: string, projectContext: any): EditInstruction[] {
  const edits: EditInstruction[] = [];
  const lowerRequest = request.toLowerCase();
  
  // Extract target (what to change)
  const colorMatch = request.match(/(background|color|text)\s+(color\s+)?(?:to|into)?\s+(\w+)/i);
  const textMatch = request.match(/change\s+(?:the\s+)?(["\'].*?["\']|text|title|heading)\s+(?:to|into)\s+(["\'].*?["\']|\w+)/i);
  
  if (colorMatch) {
    const [, property, , value] = colorMatch;
    
    // For now, return a placeholder - in production, this would analyze the codebase
    edits.push({
      file: 'src/index.css',
      action: 'replace',
      startLine: 1,
      endLine: 5,
      content: `:root {\n  --${property}: ${value};\n}`,
      description: `Update ${property} to ${value}`
    });
  }
  
  return edits;
}

/**
 * Apply surgical edits using Lovable AI for intelligent code changes
 */
async function applySurgicalEdits(
  request: string,
  projectContext: any
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }
  
  // Build surgical edit prompt
  const systemPrompt = `You are a precise code editor. Make ONLY the specific change requested.
Return your response as a JSON object with this structure:
{
  "edits": [
    {
      "file": "path/to/file.ts",
      "action": "replace",
      "startLine": 10,
      "endLine": 15,
      "content": "new code here",
      "description": "what changed"
    }
  ],
  "summary": "Brief summary of changes"
}

Rules:
1. ONLY change what's requested - nothing more
2. Keep all existing functionality
3. Preserve code style and formatting
4. Return valid JSON only`;

  const userPrompt = `Make this change: "${request}"

Current project structure:
${projectContext.files ? projectContext.files.map((f: any) => `- ${f.path}`).join('\n') : 'No files provided'}

Focus on finding the exact line(s) to change and make minimal edits.`;

  // Call Lovable AI for intelligent edit instructions
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  // Parse AI response
  try {
    const parsed = JSON.parse(aiResponse);
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse AI response:', aiResponse);
    throw new Error('AI returned invalid JSON');
  }
}

/**
 * Main request handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { 
      request, 
      conversationId, 
      userId,
      projectId,
      context = {}
    } = await req.json();

    console.log('⚡ Direct Code Editor:', { 
      request: request.substring(0, 100),
      projectId
    });

    // Initialize Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Broadcast progress
    const channel = supabase.channel(`ai-status-${conversationId}`);
    await channel.subscribe();
    
    const broadcast = async (event: string, data: any) => {
      await channel.send({
        type: 'broadcast',
        event: 'status-update',
        payload: { event, ...data, timestamp: new Date().toISOString() }
      });
    };

    await broadcast('edit:started', { 
      message: '⚡ Analyzing change...',
      progress: 10
    });

    // Apply surgical edit using AI
    const editResult = await applySurgicalEdits(request, context);

    await broadcast('edit:applying', { 
      message: '✏️ Applying changes...',
      progress: 60
    });

    // Generate natural AI response instead of hardcoded text
    const aiResponse = await generateNaturalResponse(request, {
      action: 'edit_complete',
      details: {
        filesChanged: editResult.edits.map((e: any) => e.file),
        timeElapsed: `${Math.round((Date.now() - startTime) / 100) / 10}s`
      }
    });

    // Store edit in conversation history with AI-generated response using resilient wrapper
    const { createResilientDb } = await import('../_shared/resilientDbWrapper.ts');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const resilientDb = createResilientDb(supabase, lovableApiKey);
    
    await resilientDb.insert('messages', {
      conversation_id: conversationId,
      role: 'assistant',
      content: aiResponse,
      user_id: userId,
      metadata: {
        editType: 'surgical',
        edits: editResult.edits,
        duration: Date.now() - startTime
      }
    });

    await broadcast('edit:complete', { 
      message: '✅ Changes applied!',
      progress: 100
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Direct edit completed in ${duration}ms`);

    // Unsubscribe from channel
    await channel.unsubscribe();

    return new Response(
      JSON.stringify({
        success: true,
        edits: editResult.edits,
        summary: editResult.summary,
        metrics: {
          duration,
          route: 'DIRECT_EDIT',
          cost: 0.02
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Direct edit error:', error);
    
    const duration = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: { duration }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
