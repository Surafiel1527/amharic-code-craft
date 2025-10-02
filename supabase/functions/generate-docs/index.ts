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
    const { code, filePath, projectId, docType = 'inline' } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    let systemPrompt = '';
    
    if (docType === 'inline') {
      systemPrompt = `You are a documentation expert. Add comprehensive JSDoc/TSDoc comments to the code.

Include:
- Function/component descriptions
- Parameter types and descriptions
- Return value descriptions
- Usage examples where helpful
- Important notes or warnings

Return the fully documented code with all original functionality preserved.`;
    } else if (docType === 'readme') {
      systemPrompt = `Generate a comprehensive README.md for this project.

Include:
- Project title and description
- Features list
- Installation instructions
- Usage examples
- API documentation if applicable
- Contributing guidelines
- License information

Use proper markdown formatting.`;
    } else if (docType === 'api') {
      systemPrompt = `Generate API documentation in JSON format.

Return:
{
  "endpoints": [{"method": "", "path": "", "description": "", "params": [], "returns": ""}],
  "components": [{"name": "", "props": [], "description": ""}],
  "functions": [{"name": "", "params": [], "returns": "", "description": ""}]
}`;
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
          { role: 'user', content: `Generate ${docType} documentation for:\n\n${code}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const generatedDocs = aiData.choices[0].message.content;

    let readmeContent = null;
    let apiDocs = null;
    let documentedCode = generatedDocs;

    if (docType === 'readme') {
      readmeContent = generatedDocs;
      documentedCode = code;
    } else if (docType === 'api') {
      const jsonMatch = generatedDocs.match(/\{[\s\S]*\}/);
      apiDocs = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      documentedCode = code;
    }

    // Save to database
    const { data: documentation, error: dbError } = await supabaseClient
      .from('code_documentation')
      .insert({
        user_id: user.id,
        project_id: projectId,
        file_path: filePath || 'project',
        original_code: code,
        documented_code: documentedCode,
        readme_content: readmeContent,
        api_docs: apiDocs,
        doc_type: docType
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ 
        documentation,
        documentedCode,
        readmeContent,
        apiDocs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-docs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});