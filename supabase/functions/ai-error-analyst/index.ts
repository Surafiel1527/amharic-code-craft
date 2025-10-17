import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, errorContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent errors from database
    const { data: recentErrors } = await supabase
      .from('detected_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get workspace context
    const { data: projectFiles } = await supabase
      .from('project_files')
      .select('file_path, content')
      .limit(20);

    const { data: recentGenerations } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Prepare system context with full project awareness
    const systemPrompt = `You are an intelligent error analyst with full awareness of the project workspace and autonomous agent system.

PROJECT CONTEXT:
- Workspace files: ${projectFiles?.length || 0} files detected
- File tree: ${projectFiles?.map(f => f.file_path).join(', ') || 'No files yet'}
- Recent generations: ${recentGenerations?.length || 0} attempts
- Recent errors: ${recentErrors?.length || 0} detected
- Error types: ${recentErrors?.map(e => e.error_type).join(', ') || 'none'}

CAPABILITIES:
You understand:
1. The complete file structure and what exists in the workspace
2. Code generation patterns and what was attempted
3. Error patterns and their root causes
4. The autonomous healing system's capabilities

When users ask about missing code or preview issues:
- Check what files actually exist in the workspace
- Analyze what was supposed to be generated vs what exists
- Explain the gap and why it happened
- Provide specific steps to resolve
- Suggest whether to regenerate, manually fix, or use the autonomous system

Be conversational, intelligent, and helpful. Use the context to give accurate, specific answers.`;

    let contextMessage = message;
    if (errorContext) {
      contextMessage = `Error Context: ${JSON.stringify(errorContext)}\n\nUser Question: ${message}`;
    }

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
          { role: 'user', content: contextMessage }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        errorCount: recentErrors?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-error-analyst:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
