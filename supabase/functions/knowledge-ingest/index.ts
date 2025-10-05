import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeEntry {
  domain: string;
  knowledge_type: string;
  title: string;
  content: string;
  code_examples?: Array<{
    language: string;
    code: string;
    description: string;
  }>;
  applicability_score?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { entries, batch = false } = await req.json();

    if (!entries || (Array.isArray(entries) && entries.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'No knowledge entries provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const knowledgeEntries: KnowledgeEntry[] = Array.isArray(entries) ? entries : [entries];

    console.log(`📚 Knowledge Ingest: Processing ${knowledgeEntries.length} entries`);

    // Validate and prepare entries
    const preparedEntries = knowledgeEntries.map(entry => ({
      domain: entry.domain,
      knowledge_type: entry.knowledge_type,
      title: entry.title,
      content: entry.content,
      code_examples: entry.code_examples || [],
      applicability_score: entry.applicability_score || 100,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert into database
    const { data, error } = await supabase
      .from('professional_knowledge')
      .insert(preparedEntries)
      .select();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log(`✅ Successfully ingested ${data.length} knowledge entries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully ingested ${data.length} knowledge entries`,
        ingested_count: data.length,
        entries: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Knowledge ingest error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
