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

    // Get comprehensive project context
    const { data: recentErrors } = await supabase
      .from('detected_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: projectFiles } = await supabase
      .from('project_files')
      .select('file_path, content, language')
      .limit(100);

    const { data: recentJobs } = await supabase
      .from('ai_generation_jobs')
      .select('job_type, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Build comprehensive system context
    const fileList = projectFiles?.map(f => f.file_path).join('\n- ') || 'No files';
    const jobSummary = recentJobs?.map(j => 
      `${j.job_type}: ${j.status}${j.error_message ? ` - ${j.error_message}` : ''}`
    ).join('\n- ') || 'No recent jobs';

    const systemPrompt = `You are an intelligent error analyst and autonomous agent advisor with FULL PROJECT AWARENESS.

CURRENT WORKSPACE STATE:
📁 Project Files (${projectFiles?.length || 0} files):
- ${fileList}

🔄 Recent Generation Jobs (${recentJobs?.length || 0}):
- ${jobSummary}

⚠️ Recent Errors (${recentErrors?.length || 0}):
- ${recentErrors?.map(e => `${e.error_type}: ${e.error_message || 'No message'}`).join('\n- ') || 'none'}

CAPABILITIES:
You understand the complete workspace context including:
- All project files and their structure
- Code generation history and patterns
- Error patterns and healing attempts
- System health and status

Your role is to:
1. Answer questions about the project with full context awareness
2. Analyze errors with understanding of the codebase
3. Suggest intelligent fixes based on actual project structure
4. Explain autonomous healing capabilities
5. Provide actionable, project-specific recommendations

When users ask about missing code, preview issues, or functionality:
- Reference specific files from the workspace
- Consider recent generation attempts
- Suggest fixes based on actual project structure`;

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
