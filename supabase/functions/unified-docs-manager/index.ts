import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Docs Manager
 * Consolidates:
 * - generate-docs (documentation generation)
 * - fetch-documentation (external docs retrieval)
 */

interface DocsRequest {
  action: 'generate' | 'fetch' | 'update' | 'search';
  code?: string;
  filePath?: string;
  docType?: 'api' | 'component' | 'readme' | 'guide';
  searchQuery?: string;
  externalSource?: 'mdn' | 'react' | 'npm' | 'github';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      action,
      code,
      filePath,
      docType = 'api',
      searchQuery,
      externalSource
    } = await req.json() as DocsRequest;

    console.log('[unified-docs-manager] Action:', action, { docType, filePath });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'generate': {
        if (!code) {
          throw new Error('Code required for documentation generation');
        }

        console.log('[generate] Generating documentation');

        const docPrompt = `Generate comprehensive ${docType} documentation for this code:

\`\`\`typescript
${code}
\`\`\`

File: ${filePath || 'unknown'}

Documentation should include:
${docType === 'api' ? '- Function signatures\n- Parameters and return types\n- Usage examples\n- Error handling' : ''}
${docType === 'component' ? '- Component props\n- Usage examples\n- Styling guidelines\n- Best practices' : ''}
${docType === 'readme' ? '- Project overview\n- Installation steps\n- Quick start guide\n- Features list' : ''}
${docType === 'guide' ? '- Step-by-step instructions\n- Code examples\n- Common pitfalls\n- Tips and tricks' : ''}

Return JSON:
{
  "documentation": "... markdown formatted ...",
  "sections": [
    {
      "title": "...",
      "content": "...",
      "examples": ["..."]
    }
  ],
  "metadata": {
    "completeness": "low|medium|high",
    "suggestedImprovements": ["..."]
  }
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a technical documentation expert. Generate clear, comprehensive documentation.'
              },
              {
                role: 'user',
                content: docPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3500,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const docs = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...docs,
            docType,
            filePath,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fetch': {
        if (!searchQuery || !externalSource) {
          throw new Error('Search query and external source required');
        }

        console.log('[fetch] Fetching external documentation');

        const fetchPrompt = `Search for documentation about "${searchQuery}" from ${externalSource}.

Provide:
1. Official documentation links
2. Key concepts and APIs
3. Code examples
4. Best practices
5. Common issues and solutions

Return JSON:
{
  "results": [
    {
      "title": "...",
      "url": "...",
      "summary": "...",
      "relevance": "high|medium|low"
    }
  ],
  "quickReference": {
    "keyAPIs": ["..."],
    "codeExamples": ["..."],
    "commonPatterns": ["..."]
  },
  "additionalResources": ["..."]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a documentation research assistant with access to ${externalSource} documentation.`
              },
              {
                role: 'user',
                content: fetchPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 2500,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const fetchedDocs = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...fetchedDocs,
            searchQuery,
            source: externalSource,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!code) {
          throw new Error('Code required for documentation update');
        }

        console.log('[update] Updating existing documentation');

        const updatePrompt = `Update the documentation for this code, preserving existing structure:

\`\`\`typescript
${code}
\`\`\`

Identify:
- Outdated information
- Missing documentation
- New features to document
- Deprecated features

Return JSON with updated documentation and change summary.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a documentation maintenance expert. Update docs accurately.'
              },
              {
                role: 'user',
                content: updatePrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3000,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const updated = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...updated,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'search': {
        if (!searchQuery) {
          throw new Error('Search query required');
        }

        console.log('[search] Searching documentation');

        // Search in user's project documentation
        const { data: docs, error } = await supabase
          .from('project_documentation')
          .select('*')
          .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            results: docs || [],
            searchQuery,
            count: docs?.length || 0,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-docs-manager] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
