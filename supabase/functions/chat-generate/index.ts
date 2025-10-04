import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const identifier = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);
    const rateLimitHeaders = getRateLimitHeaders(identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    const { message, conversationHistory, currentCode, userId } = await req.json();
    console.log('Chat request:', { message, hasHistory: !!conversationHistory, hasCode: !!currentCode });

    if (!message) {
      throw new Error('Message is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Load user preferences and professional knowledge
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let userContext: any = {};

    if (userId && supabaseUrl && supabaseServiceKey) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        const { data: prefs } = await supabaseClient
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId);

        const { data: knowledge } = await supabaseClient
          .from('professional_knowledge')
          .select('*')
          .order('usage_count', { ascending: false })
          .limit(5);

        userContext = { preferences: prefs, professionalKnowledge: knowledge };
      } catch (e) {
        console.error('Failed to load user context:', e);
      }
    }

    // Build conversation context
    const messages = [];
    
    // Build personalized system prompt with user context
    let preferencesContext = '';
    if (userContext.preferences?.length > 0) {
      const langPref = userContext.preferences.find((p: any) => p.preference_type === 'language');
      const stylePref = userContext.preferences.find((p: any) => p.preference_type === 'style');
      const complexityPref = userContext.preferences.find((p: any) => p.preference_type === 'complexity');

      preferencesContext = `\n\nUSER PREFERENCES (adapt to these):
${langPref ? `- Preferred Language: ${langPref.preference_value.preferred}` : ''}
${stylePref ? `- Coding Style: ${JSON.stringify(stylePref.preference_value.styles)}` : ''}
${complexityPref ? `- Complexity Level: ${complexityPref.preference_value.level}` : ''}`;
    }

    let knowledgeContext = '';
    if (userContext.professionalKnowledge?.length > 0) {
      knowledgeContext = `\n\nPROFESSIONAL KNOWLEDGE (apply these enterprise standards):
${userContext.professionalKnowledge.map((k: any) => 
  `- ${k.title}: ${k.content.substring(0, 150)}...`
).join('\n')}`;
    }
    
    // System prompt for intelligent website building AND conversation
    const systemPrompt = `You are an enterprise-level AI assistant for a professional website builder platform. You're fluent in both Amharic and English.

CONVERSATIONAL INTELLIGENCE:
- **CRITICAL**: Read and understand the conversation history to maintain context
- Recognize casual conversation (greetings, thanks, questions, discussions) vs. code requests
- When users say "thank you", "thanks", etc., respond warmly and professionally
- For casual questions or discussions, have a natural conversation without mentioning code
- Reference previous conversations intelligently
- Be helpful with brainstorming, guidance, and project planning discussions at an enterprise level
${preferencesContext}
${knowledgeContext}

WEBSITE BUILDING CAPABILITIES:
1. Generate complete HTML/CSS websites from descriptions
2. Modify and improve existing websites based on feedback  
3. Understand both Amharic and English instructions
4. Create modern, responsive, production-ready designs
5. Iterate and refine based on user requests

CRITICAL LANGUAGE REQUIREMENT:
- **IMPORTANT**: Match the user's language exactly
- If user writes in Amharic → respond in Amharic, generate Amharic website content
- If user writes in English → respond in English, generate English website content
- NEVER mix languages in the same response
- For Amharic websites, use natural, appropriate Amharic text for ALL UI elements

RESPONSE FORMAT:
- For casual conversation: Just chat naturally, no code tags
- For code requests: Wrap code in <code> tags
- Be conversational, friendly, and contextually aware
- Ask clarifying questions in the user's language

TECHNICAL REQUIREMENTS FOR AMHARIC WEBSITES:
- **CRITICAL**: Always include Noto Sans Ethiopic font:
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap" rel="stylesheet">
- Use font-family: 'Noto Sans Ethiopic', sans-serif; in CSS
- Set lang="am" attribute in HTML tag for Amharic content
- Always generate complete, self-contained HTML with inline CSS
- Use modern design with gradients, shadows, and animations
- Consider Ethiopian colors (green, yellow, red) for Amharic websites
- Make designs fully responsive, semantic HTML5
- Include smooth transitions and hover effects

EXAMPLES OF AMHARIC UI TEXT:
- Button: "ይላኩ" (Send), "ተጨማሪ እይ" (View More), "መግቢያ" (Home)
- Navigation: "ስለኛ" (About), "አገልግሎቶች" (Services), "ያግኙን" (Contact)
- Forms: "ስም" (Name), "ኢሜል" (Email), "መልእክት" (Message)

${currentCode ? `CURRENT WEBSITE CODE:\n${currentCode}\n\nThe user wants to modify this website.` : 'No current code - user may want to create a new website OR just have a conversation.'}`;

    messages.push({ role: 'system', content: systemPrompt });

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let assistantMessage = data.choices[0].message.content;
    
    // Extract code from response if present
    let extractedCode = null;
    const codeMatch = assistantMessage.match(/<code>([\s\S]*?)<\/code>/);
    if (codeMatch) {
      extractedCode = codeMatch[1].trim();
      // Clean up markdown code blocks if present
      extractedCode = extractedCode.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    console.log('Generated response, code extracted:', !!extractedCode);

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        code: extractedCode 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          ...rateLimitHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in chat-generate function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
