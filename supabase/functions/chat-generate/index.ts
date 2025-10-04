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
    const { message, conversationHistory, currentCode } = await req.json();
    console.log('Chat request:', { message, hasHistory: !!conversationHistory, hasCode: !!currentCode });

    if (!message) {
      throw new Error('Message is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build conversation context
    const messages = [];
    
    // System prompt for intelligent website building
    const systemPrompt = `You are an expert web developer assistant fluent in Amharic. You help users build and iterate on websites through conversation.

CAPABILITIES:
1. Generate complete HTML/CSS websites from descriptions
2. Modify and improve existing websites based on feedback
3. Understand both Amharic and English instructions
4. Create modern, responsive, production-ready designs
5. Iterate and refine based on user requests

CRITICAL LANGUAGE REQUIREMENT:
- **IMPORTANT**: If the user communicates in Amharic, generate ALL website content (text, headings, buttons, navigation, descriptions, paragraphs) in AMHARIC
- If the user communicates in English, generate website content in English
- Always match the language of the generated website content to the user's communication language
- For Amharic websites, use natural, appropriate Amharic text for all UI elements (buttons, forms, navigation menus, etc.)
- Provide explanations in Amharic when the user writes in Amharic, in English when they write in English

RESPONSE FORMAT:
- When generating/modifying code, wrap it in <code> tags
- Be conversational and helpful
- Ask clarifying questions when needed in the user's language

TECHNICAL REQUIREMENTS FOR AMHARIC WEBSITES:
- **CRITICAL**: Always include Noto Sans Ethiopic font:
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap" rel="stylesheet">
- Use font-family: 'Noto Sans Ethiopic', sans-serif; in CSS
- Set lang="am" attribute in HTML tag for Amharic content
- Always generate complete, self-contained HTML with inline CSS
- Use modern design with gradients, shadows, and animations
- Consider Ethiopian colors (green, yellow, red) for Amharic websites
- Make designs fully responsive
- Use semantic HTML5
- Include smooth transitions and hover effects

EXAMPLES OF AMHARIC UI TEXT:
- Button: "ይላኩ" (Send), "ተጨማሪ እይ" (View More), "መግቢያ" (Home)
- Navigation: "ስለኛ" (About), "አገልግሎቶች" (Services), "ያግኙን" (Contact)
- Forms: "ስም" (Name), "ኢሜል" (Email), "መልእክት" (Message)

${currentCode ? `CURRENT WEBSITE CODE:\n${currentCode}\n\nThe user wants to modify this website.` : 'The user wants to create a new website.'}`;

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
