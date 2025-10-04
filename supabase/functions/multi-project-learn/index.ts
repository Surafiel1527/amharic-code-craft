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

// Extract reusable patterns from code
function extractPatterns(code: string) {
  const patterns: any[] = [];
  
  // Extract functions
  const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:async)?\s*\([^)]*\)\s*(?:=>)?\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = functionRegex.exec(code)) !== null) {
    patterns.push({
      type: 'function',
      name: match[1],
      code: match[0],
      complexity: match[2].split('\n').length
    });
  }
  
  // Extract classes
  const classRegex = /class\s+(\w+)\s*(?:extends\s+\w+)?\s*\{([^}]+)\}/g;
  while ((match = classRegex.exec(code)) !== null) {
    patterns.push({
      type: 'class',
      name: match[1],
      code: match[0],
      complexity: match[2].split('\n').length
    });
  }
  
  // Extract hooks (React patterns)
  const hookRegex = /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState/g;
  while ((match = hookRegex.exec(code)) !== null) {
    patterns.push({
      type: 'react-hook',
      name: match[1],
      code: match[0],
      complexity: 1
    });
  }
  
  // Extract API patterns
  if (code.includes('fetch(') || code.includes('axios.')) {
    const apiMatches = code.match(/(?:fetch|axios\.(?:get|post|put|delete))\([^)]+\)/g);
    if (apiMatches) {
      apiMatches.forEach(apiCall => {
        patterns.push({
          type: 'api-call',
          name: 'API Request',
          code: apiCall,
          complexity: 2
        });
      });
    }
  }
  
  return patterns;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action,
      userId, 
      generatedCode, 
      context,
      patternType,
      success = true
    } = await req.json();
    
    console.log('🔄 Multi-project learning:', { action, userId, patternType });

    if (action === 'learn') {
      // Extract and store patterns from generated code
      if (!userId || !generatedCode) {
        throw new Error('userId and generatedCode required');
      }

      const patterns = extractPatterns(generatedCode);
      console.log(`📚 Extracted ${patterns.length} patterns`);

      // Store each pattern
      for (const pattern of patterns) {
        // Check if pattern already exists
        const { data: existing } = await supabase
          .from('cross_project_patterns')
          .select('*')
          .eq('user_id', userId)
          .eq('pattern_type', pattern.type)
          .eq('pattern_name', pattern.name)
          .single();

        if (existing) {
          // Update existing pattern
          const newUsageCount = existing.usage_count + 1;
          const newSuccessRate = success 
            ? ((existing.success_rate * existing.usage_count) + 100) / newUsageCount
            : ((existing.success_rate * existing.usage_count)) / newUsageCount;
          
          await supabase
            .from('cross_project_patterns')
            .update({
              usage_count: newUsageCount,
              success_rate: newSuccessRate,
              confidence_score: Math.min(95, existing.confidence_score + 5),
              contexts: [...(existing.contexts || []), context].slice(-10), // Keep last 10
              last_used_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Create new pattern
          await supabase
            .from('cross_project_patterns')
            .insert({
              user_id: userId,
              pattern_type: pattern.type,
              pattern_name: pattern.name,
              pattern_code: pattern.code,
              usage_count: 1,
              success_rate: success ? 100 : 0,
              contexts: [context],
              confidence_score: 50
            });
        }
      }

      console.log('✅ Patterns learned and stored');

      return new Response(
        JSON.stringify({
          success: true,
          patternsLearned: patterns.length,
          message: `Learned ${patterns.length} reusable patterns`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'retrieve') {
      // Retrieve relevant patterns for a new request
      const minConfidence = 70;

      // Get user's high-confidence patterns
      const { data: patterns } = await supabase
        .from('cross_project_patterns')
        .select('*')
        .eq('user_id', userId)
        .gte('confidence_score', minConfidence)
        .order('usage_count', { ascending: false })
        .limit(20);

      console.log(`📦 Retrieved ${patterns?.length || 0} relevant patterns`);

      return new Response(
        JSON.stringify({
          success: true,
          patterns: patterns || [],
          summary: {
            totalPatterns: patterns?.length || 0,
            byType: patterns?.reduce((acc: any, p: any) => {
              acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1;
              return acc;
            }, {})
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'apply') {
      // Get patterns and generate with AI - use body data already parsed
      const userRequest = context;
      const currentCode = generatedCode;

      // Retrieve user's patterns
      const { data: patterns } = await supabase
        .from('cross_project_patterns')
        .select('*')
        .eq('user_id', userId)
        .gte('confidence_score', 70)
        .order('confidence_score', { ascending: false })
        .limit(10);

      if (!patterns || patterns.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No learned patterns available yet'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate code using learned patterns
      const patternPrompt = `You are generating code for a user who has established patterns.

USER REQUEST: ${userRequest}

LEARNED PATTERNS (apply these when relevant):
${patterns.map(p => `
Type: ${p.pattern_type}
Name: ${p.pattern_name}
Usage: ${p.usage_count} times (${p.success_rate.toFixed(0)}% success rate)
Code: ${p.pattern_code}
`).join('\n---\n')}

${currentCode ? `CURRENT CODE:\n${currentCode}\n` : ''}

INSTRUCTIONS:
1. Use the learned patterns when they fit the request
2. Follow the user's established coding style
3. Generate consistent, high-quality code
4. Wrap code in <code></code> tags

Generate the requested code:`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: patternPrompt }],
          temperature: 0.5,
        }),
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      const codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
      const code = codeMatch ? codeMatch[1].trim() : null;

      return new Response(
        JSON.stringify({
          success: true,
          code,
          patternsApplied: patterns.length,
          explanation: aiResponse.replace(/<code>[\s\S]*?<\/code>/, '').trim()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use: learn, retrieve, or apply');

  } catch (error: any) {
    console.error('💥 Error in multi-project learning:', error);
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