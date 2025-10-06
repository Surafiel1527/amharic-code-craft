import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearningOperation {
  operation: string;
  conversationId?: string;
  patternId?: string;
  userId?: string;
  data?: any;
  context?: any;
}

interface LearningResult {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  learnedAt?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Learning operation started`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: LearningOperation = await req.json();
    
    // Validate required fields
    if (!payload.operation) {
      throw new Error('Operation type is required');
    }

    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result: LearningResult;

    switch (payload.operation) {
      case 'learn_from_conversation':
        result = await learnFromConversation(payload, supabase, requestId);
        break;
      case 'learn_pattern':
        result = await learnPattern(payload, supabase, requestId);
        break;
      case 'learn_user_preferences':
        result = await learnUserPreferences(payload, supabase, requestId);
        break;
      case 'get_learned_patterns':
        result = await getLearnedPatterns(payload, supabase, requestId);
        break;
      case 'reinforce_pattern':
        result = await reinforcePattern(payload, supabase, requestId);
        break;
      case 'feedback_learning':
        result = await feedbackLearning(payload, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);

    return new Response(JSON.stringify({ 
      requestId,
      ...result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    return new Response(JSON.stringify({ 
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: error instanceof Error && error.message.includes('required') ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Learn from conversation interactions
 * Analyzes conversation patterns and extracts learnings
 */
async function learnFromConversation(
  payload: LearningOperation, 
  supabase: any, 
  requestId: string
): Promise<LearningResult> {
  const { conversationId, userId } = payload;
  
  if (!conversationId || !userId) {
    throw new Error('conversationId and userId are required');
  }

  console.log(`[${requestId}] Learning from conversation: ${conversationId}`);

  // Get conversation messages
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error(`[${requestId}] Failed to fetch messages:`, messagesError);
    throw new Error('Failed to fetch conversation messages');
  }

  // Analyze conversation for patterns
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const analysisPrompt = `
Analyze this conversation and extract key learnings:

${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}

Extract:
1. User preferences and patterns
2. Common requests or pain points
3. Technical patterns used
4. Areas for improvement

Return JSON with:
{
  "patterns": ["pattern1", "pattern2"],
  "preferences": {"key": "value"},
  "confidence": 0-100
}
`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a learning analysis expert. Return valid JSON only.' },
        { role: 'user', content: analysisPrompt }
      ]
    })
  });

  if (!response.ok) {
    console.error(`[${requestId}] AI analysis failed: ${response.status}`);
    throw new Error('AI analysis failed');
  }

  const aiData = await response.json();
  const aiContent = aiData.choices[0].message.content;
  
  let learnings = {
    patterns: [],
    preferences: {},
    confidence: 50
  };
  
  try {
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      learnings = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn(`[${requestId}] Failed to parse AI response, using defaults`);
  }

  // Store learnings
  const { data: learning, error: learningError } = await supabase
    .from('conversation_learnings')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      pattern_category: 'conversation_analysis',
      learned_pattern: JSON.stringify(learnings.patterns),
      context: learnings.preferences,
      confidence: learnings.confidence
    })
    .select()
    .single();

  if (learningError) {
    console.error(`[${requestId}] Failed to store learning:`, learningError);
    throw new Error('Failed to store learning');
  }

  console.log(`[${requestId}] Learning stored with ID: ${learning.id}`);

  return {
    success: true,
    data: learning,
    confidence: learnings.confidence,
    learnedAt: learning.created_at
  };
}

/**
 * Learn and store a specific pattern
 */
async function learnPattern(
  payload: LearningOperation, 
  supabase: any, 
  requestId: string
): Promise<LearningResult> {
  const { userId, data } = payload;
  
  if (!userId || !data?.pattern || !data?.category) {
    throw new Error('userId, pattern, and category are required');
  }

  console.log(`[${requestId}] Learning pattern: ${data.category}`);

  // Check if similar pattern exists
  const { data: existingPatterns } = await supabase
    .from('conversation_learnings')
    .select('*')
    .eq('user_id', userId)
    .eq('pattern_category', data.category)
    .ilike('learned_pattern', `%${data.pattern.substring(0, 50)}%`)
    .limit(1);

  if (existingPatterns && existingPatterns.length > 0) {
    // Reinforce existing pattern
    const existing = existingPatterns[0];
    const { error: updateError } = await supabase
      .from('conversation_learnings')
      .update({
        times_reinforced: existing.times_reinforced + 1,
        confidence: Math.min(100, existing.confidence + 5),
        last_reinforced_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error(`[${requestId}] Failed to reinforce pattern:`, updateError);
      throw new Error('Failed to reinforce pattern');
    }

    console.log(`[${requestId}] Pattern reinforced: ${existing.id}`);

    return {
      success: true,
      data: { id: existing.id, reinforced: true },
      confidence: existing.confidence + 5
    };
  }

  // Create new pattern
  const { data: newPattern, error: insertError } = await supabase
    .from('conversation_learnings')
    .insert({
      user_id: userId,
      pattern_category: data.category,
      learned_pattern: data.pattern,
      context: data.context || {},
      confidence: data.confidence || 50
    })
    .select()
    .single();

  if (insertError) {
    console.error(`[${requestId}] Failed to store pattern:`, insertError);
    throw new Error('Failed to store pattern');
  }

  console.log(`[${requestId}] New pattern learned: ${newPattern.id}`);

  return {
    success: true,
    data: newPattern,
    confidence: newPattern.confidence,
    learnedAt: newPattern.created_at
  };
}

/**
 * Learn user preferences from behavior
 */
async function learnUserPreferences(
  payload: LearningOperation, 
  supabase: any, 
  requestId: string
): Promise<LearningResult> {
  const { userId, data } = payload;
  
  if (!userId || !data?.preferences) {
    throw new Error('userId and preferences are required');
  }

  console.log(`[${requestId}] Learning user preferences for: ${userId}`);

  // Get existing preferences
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const mergedPreferences = {
    ...existing?.preferences || {},
    ...data.preferences
  };

  if (existing) {
    // Update existing
    const { error: updateError } = await supabase
      .from('user_preferences')
      .update({
        preferences: mergedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`[${requestId}] Failed to update preferences:`, updateError);
      throw new Error('Failed to update preferences');
    }

    console.log(`[${requestId}] Preferences updated for user: ${userId}`);
  } else {
    // Create new
    const { error: insertError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        preferences: mergedPreferences
      });

    if (insertError) {
      console.error(`[${requestId}] Failed to create preferences:`, insertError);
      throw new Error('Failed to create preferences');
    }

    console.log(`[${requestId}] Preferences created for user: ${userId}`);
  }

  return {
    success: true,
    data: { preferences: mergedPreferences },
    learnedAt: new Date().toISOString()
  };
}

/**
 * Get learned patterns for a user
 */
async function getLearnedPatterns(
  payload: LearningOperation, 
  supabase: any, 
  requestId: string
): Promise<LearningResult> {
  const { userId, data } = payload;
  
  if (!userId) {
    throw new Error('userId is required');
  }

  console.log(`[${requestId}] Fetching learned patterns for: ${userId}`);

  let query = supabase
    .from('conversation_learnings')
    .select('*')
    .eq('user_id', userId)
    .order('confidence', { ascending: false });

  if (data?.category) {
    query = query.eq('pattern_category', data.category);
  }

  if (data?.minConfidence) {
    query = query.gte('confidence', data.minConfidence);
  }

  const { data: patterns, error } = await query.limit(data?.limit || 50);

  if (error) {
    console.error(`[${requestId}] Failed to fetch patterns:`, error);
    throw new Error('Failed to fetch patterns');
  }

  console.log(`[${requestId}] Found ${patterns.length} patterns`);

  return {
    success: true,
    data: patterns
  };
}

/**
 * Reinforce an existing pattern
 */
async function reinforcePattern(
  payload: LearningOperation, 
  supabase: any, 
  requestId: string
): Promise<LearningResult> {
  const { patternId } = payload;
  
  if (!patternId) {
    throw new Error('patternId is required');
  }

  console.log(`[${requestId}] Reinforcing pattern: ${patternId}`);

  const { data: pattern, error: fetchError } = await supabase
    .from('conversation_learnings')
    .select('*')
    .eq('id', patternId)
    .single();

  if (fetchError || !pattern) {
    console.error(`[${requestId}] Pattern not found:`, fetchError);
    throw new Error('Pattern not found');
  }

  const { error: updateError } = await supabase
    .from('conversation_learnings')
    .update({
      times_reinforced: pattern.times_reinforced + 1,
      confidence: Math.min(100, pattern.confidence + 3),
      last_reinforced_at: new Date().toISOString()
    })
    .eq('id', patternId);

  if (updateError) {
    console.error(`[${requestId}] Failed to reinforce:`, updateError);
    throw new Error('Failed to reinforce pattern');
  }

  console.log(`[${requestId}] Pattern reinforced successfully`);

  return {
    success: true,
    data: { patternId, reinforced: true },
    confidence: pattern.confidence + 3
  };
}

/**
 * Learn from user feedback
 */
async function feedbackLearning(
  payload: LearningOperation, 
  supabase: any, 
  requestId: string
): Promise<LearningResult> {
  const { userId, data } = payload;
  
  if (!userId || !data?.feedback) {
    throw new Error('userId and feedback are required');
  }

  console.log(`[${requestId}] Processing feedback learning for: ${userId}`);

  const { rating, category, context } = data.feedback;

  // Store feedback pattern
  const { data: feedbackPattern, error } = await supabase
    .from('ai_feedback_patterns')
    .insert({
      pattern_category: category || 'general',
      original_prompt: context?.prompt || '',
      improved_prompt: context?.improved || context?.prompt || '',
      avg_user_rating: rating || 0,
      learned_from_feedback_count: 1,
      metadata: context || {}
    })
    .select()
    .single();

  if (error) {
    console.error(`[${requestId}] Failed to store feedback:`, error);
    throw new Error('Failed to store feedback');
  }

  console.log(`[${requestId}] Feedback pattern stored: ${feedbackPattern.id}`);

  return {
    success: true,
    data: feedbackPattern,
    learnedAt: feedbackPattern.created_at
  };
}
