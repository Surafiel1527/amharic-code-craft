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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { project_id, build_data, request_type } = await req.json();

    console.log(`🚀 Smart Build Optimizer: ${request_type} for project ${project_id}`);

    if (request_type === 'check_cache') {
      // Check for cached build
      const cacheKey = generateCacheKey(build_data);
      const { data: cached } = await supabase
        .from('build_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        // Update cache stats
        await supabase
          .from('build_cache')
          .update({
            last_used_at: new Date().toISOString(),
            cache_hit_rate: (cached.cache_hit_rate || 0) + 1
          })
          .eq('id', cached.id);

        return new Response(
          JSON.stringify({
            cache_hit: true,
            cache_data: cached.cache_data,
            optimization_score: cached.optimization_score,
            recommendations: cached.ai_recommendations
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ cache_hit: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request_type === 'optimize') {
      // AI-powered build optimization
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Analyze this build configuration and suggest optimizations:

Build Data: ${JSON.stringify(build_data)}

Provide:
1. Cache strategy recommendations
2. Build time optimizations
3. Bundle size improvements
4. Performance enhancements
5. Estimated improvement percentage

Format as JSON.`
          }]
        })
      });

      const aiData = await aiResponse.json();
      const optimizations = JSON.parse(
        aiData.choices[0].message.content.replace(/```json\n?|\n?```/g, '')
      );

      // Store optimization
      const { data: optimization } = await supabase
        .from('build_optimizations')
        .upsert({
          optimization_type: 'build',
          optimization_name: `Build optimization for ${project_id}`,
          before_metrics: build_data.metrics || {},
          after_metrics: optimizations.expected_metrics || {},
          improvement_percentage: optimizations.estimated_improvement || 0,
          optimization_code: JSON.stringify(optimizations.recommendations),
          confidence_score: optimizations.confidence || 70,
          auto_apply: optimizations.confidence > 80
        })
        .select()
        .single();

      // Cache the build
      const cacheKey = generateCacheKey(build_data);
      await supabase
        .from('build_cache')
        .insert({
          project_id,
          cache_key: cacheKey,
          cache_data: build_data,
          optimization_score: optimizations.optimization_score || 0,
          ai_recommendations: optimizations.recommendations || []
        });

      return new Response(
        JSON.stringify({
          optimizations,
          optimization_id: optimization?.id,
          cache_key: cacheKey
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request_type === 'apply_optimization') {
      const { optimization_id } = build_data;
      
      const { data: optimization } = await supabase
        .from('build_optimizations')
        .select('*')
        .eq('id', optimization_id)
        .single();

      if (!optimization) {
        throw new Error('Optimization not found');
      }

      // Apply optimization and track results
      await supabase
        .from('build_optimizations')
        .update({
          applied_count: (optimization.applied_count || 0) + 1,
          last_applied_at: new Date().toISOString()
        })
        .eq('id', optimization_id);

      return new Response(
        JSON.stringify({
          success: true,
          optimization: optimization.optimization_code
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid request_type');

  } catch (error) {
    console.error('Error in smart-build-optimizer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateCacheKey(buildData: any): string {
  const key = `${buildData.dependencies || ''}-${buildData.config || ''}-${buildData.timestamp || Date.now()}`;
  return btoa(key).substring(0, 50);
}