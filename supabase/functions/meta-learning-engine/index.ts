import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create authenticated client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, decisionId, outcomeId } = await req.json();

    console.log('Meta-Learning Engine Action:', action);

    // ACTION 1: Learn from a mistake
    if (action === 'learn_from_mistake') {
      // Get decision and outcome details
      const { data: decision, error: decisionError } = await supabaseClient
        .from('decision_logs')
        .select('*')
        .eq('id', decisionId)
        .single();

      if (decisionError) throw decisionError;

      // Validate user owns this decision
      if (decision.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden: Cannot learn from another user\'s decision' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: outcome, error: outcomeError } = await supabaseClient
        .from('decision_outcomes')
        .select('*')
        .eq('id', outcomeId)
        .single();

      if (outcomeError) throw outcomeError;

      console.log('Learning from mistake:', {
        wrongClassification: decision.classified_as,
        correctClassification: outcome.actual_intent,
        userRequest: decision.user_request
      });

      // Use AI to analyze the mistake
      const analysisPrompt = `Analyze this AI decision mistake:

User Request: "${decision.user_request}"

Wrong Classification: ${decision.classified_as}
Correct Classification: ${outcome.actual_intent}

Decision Context:
- Intent Detected: ${decision.intent_detected}
- Confidence: ${decision.confidence_score}
- Symptoms: ${JSON.stringify(outcome.symptoms)}

Your task:
1. Extract keywords that led to wrong classification
2. Identify context indicators that should have triggered correct classification
3. Suggest a correction strategy
4. Rate confidence (0-1) in this pattern

Return JSON:
{
  "pattern_name": "descriptive name",
  "common_keywords": ["keyword1", "keyword2"],
  "context_indicators": ["indicator1", "indicator2"],
  "correction_strategy": {
    "rules": ["rule1", "rule2"],
    "confidence_adjustment": -0.2
  },
  "confidence": 0.8,
  "explanation": "why this mistake happened"
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an AGI meta-learning system that analyzes AI mistakes to improve future decisions.' },
            { role: 'user', content: analysisPrompt }
          ],
          response_format: { type: 'json_object' }
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI analysis failed: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();
      const analysis = JSON.parse(aiResult.choices[0].message.content);

      console.log('AI Analysis Result:', analysis);

      // Store or update the misclassification pattern
      const patternName = analysis.pattern_name || 
        `${decision.classified_as}_to_${outcome.actual_intent}`;

      const { data: existingPattern } = await supabaseClient
        .from('misclassification_patterns')
        .select('*')
        .eq('pattern_name', patternName)
        .single();

      if (existingPattern) {
        // Update existing pattern
        const { error: updateError } = await supabaseClient
          .from('misclassification_patterns')
          .update({
            occurrences: existingPattern.occurrences + 1,
            confidence_score: (existingPattern.confidence_score + analysis.confidence) / 2,
            last_seen_at: new Date().toISOString(),
            common_keywords: [...new Set([
              ...(existingPattern.common_keywords as string[]),
              ...analysis.common_keywords
            ])],
            context_indicators: [...new Set([
              ...(existingPattern.context_indicators as string[]),
              ...analysis.context_indicators
            ])],
            example_requests: [
              ...(existingPattern.example_requests as any[]),
              { request: decision.user_request, timestamp: new Date().toISOString() }
            ].slice(-5) // Keep last 5 examples
          })
          .eq('id', existingPattern.id);

        if (updateError) throw updateError;

        console.log('✅ Updated existing pattern:', patternName);
      } else {
        // Create new pattern
        const { error: insertError } = await supabaseClient
          .from('misclassification_patterns')
          .insert({
            pattern_name: patternName,
            pattern_type: 'classification_error',
            wrong_classification: decision.classified_as,
            correct_classification: outcome.actual_intent,
            common_keywords: analysis.common_keywords,
            context_indicators: analysis.context_indicators,
            correction_strategy: analysis.correction_strategy,
            confidence_score: analysis.confidence,
            example_requests: [{
              request: decision.user_request,
              timestamp: new Date().toISOString()
            }]
          });

        if (insertError) throw insertError;

        console.log('✅ Created new pattern:', patternName);
      }

      return new Response(JSON.stringify({
        success: true,
        patternName,
        analysis,
        message: 'Successfully learned from mistake'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 2: Get correction suggestions
    if (action === 'get_correction_suggestions') {
      const { userRequest, currentClassification } = await req.json();

      // Find matching patterns
      const { data: patterns } = await supabaseClient
        .from('misclassification_patterns')
        .select('*')
        .eq('wrong_classification', currentClassification)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
        .limit(3);

      if (!patterns || patterns.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          hasSuggestions: false,
          message: 'No correction patterns found'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if user request matches any pattern keywords
      const matchingPatterns = patterns.filter(pattern => {
        const keywords = pattern.common_keywords as string[];
        return keywords.some(keyword => 
          userRequest.toLowerCase().includes(keyword.toLowerCase())
        );
      });

      if (matchingPatterns.length > 0) {
        const bestMatch = matchingPatterns[0];
        return new Response(JSON.stringify({
          success: true,
          hasSuggestions: true,
          suggestedClassification: bestMatch.correct_classification,
          confidence: bestMatch.confidence_score,
          reasoning: `Pattern "${bestMatch.pattern_name}" matched (${bestMatch.occurrences} occurrences)`,
          correctionStrategy: bestMatch.correction_strategy
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        hasSuggestions: false,
        message: 'No matching correction patterns'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION 3: Get learning stats
    if (action === 'get_stats') {
      const { data: patterns } = await supabaseClient
        .from('misclassification_patterns')
        .select('*')
        .eq('is_active', true);

      const { data: outcomes } = await supabaseClient
        .from('decision_outcomes')
        .select('was_correct')
        .not('was_correct', 'is', null);

      const totalDecisions = outcomes?.length || 0;
      const correctDecisions = outcomes?.filter(o => o.was_correct).length || 0;
      const accuracy = totalDecisions > 0 ? (correctDecisions / totalDecisions) * 100 : 0;

      return new Response(JSON.stringify({
        success: true,
        stats: {
          totalPatterns: patterns?.length || 0,
          activePatterns: patterns?.filter(p => p.is_active).length || 0,
          totalDecisions,
          correctDecisions,
          wrongDecisions: totalDecisions - correctDecisions,
          accuracy: accuracy.toFixed(2) + '%',
          improvementRate: patterns && patterns.length > 0 ? 
            (patterns.reduce((sum, p) => sum + (p.success_rate || 0), 0) / patterns.length).toFixed(2) + '%' : '0%'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action specified');

  } catch (error: any) {
    console.error('Meta-Learning Engine Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to execute meta-learning'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});