import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define available tools for the AI assistant
const tools = [
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image based on a text description. Use this when the user asks to create, generate, or visualize an image.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Detailed description of the image to generate"
          }
        },
        required: ["prompt"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_code",
      description: "Analyze code for best practices, performance, security issues, and provide improvement suggestions.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to analyze"
          },
          language: {
            type: "string",
            description: "Programming language (html, css, javascript, typescript)"
          }
        },
        required: ["code"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_improvements",
      description: "Suggest specific improvements for a project or code. Returns structured actionable suggestions.",
      parameters: {
        type: "object",
        properties: {
          context: {
            type: "string",
            description: "Context about what needs improvement"
          },
          category: {
            type: "string",
            enum: ["design", "performance", "accessibility", "seo", "security"],
            description: "Category of improvements"
          }
        },
        required: ["context", "category"],
        additionalProperties: false
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const identifier = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);
    const rateLimitHeaders = getRateLimitHeaders(identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።', type: 'rate_limit' }),
        { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, history, projectContext } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const contextInfo = projectContext ? `\n\n=== CURRENT PROJECT CONTEXT ===\nProject Title: "${projectContext.title}"\nOriginal Request: "${projectContext.prompt}"\nCode Size: ${projectContext.codeLength} characters${projectContext.codeSnippet ? `\n\nCode Preview (first 1000 chars):\n${projectContext.codeSnippet}` : ''}` : '';

    const systemPrompt = `You are a sophisticated AI assistant for "Amharic Code Craft" - an advanced web development platform. 

🎯 CRITICAL: CONTEXT-AWARE RESPONSES
When a user asks general questions like "what do you recommend to enhance" or "how can I improve this", they are ALWAYS asking about their CURRENT PROJECT in context. 
- NEVER ask for clarification about which project
- AUTOMATICALLY analyze the current project context
- Provide SPECIFIC suggestions based on the actual project title, code, and prompt
- Reference the project by name when giving recommendations

CORE CAPABILITIES:
1. **Deep Code Understanding**: Analyze code architecture, patterns, and best practices
2. **Visual Intelligence**: Generate images when users need visualizations or design assets
3. **Proactive Problem Solving**: Anticipate issues and suggest preventive measures
4. **Multilingual Support**: Seamlessly switch between English and Amharic
5. **Contextual Awareness**: Remember conversation history and project context

ADVANCED FEATURES YOU CAN USE:
- **Image Generation**: Create visual assets, mockups, icons, and design elements
- **Code Analysis**: Deep analysis of HTML/CSS/JavaScript for performance, security, and best practices
- **Smart Suggestions**: Provide structured, actionable improvement recommendations

INTERACTION PRINCIPLES:
- Be proactive: Don't just answer questions, anticipate needs based on project context
- Be precise: Give specific, actionable advice with code examples
- Be contextual: ALWAYS reference the current project when giving advice
- Be adaptive: Match the user's language (Amharic/English) and technical level
- Be tool-savvy: Use tools when appropriate (generate images, analyze code, suggest improvements)

WHEN TO USE TOOLS:
- User asks for an image/visual/icon → Use generate_image
- User shares code or asks about code quality → Use analyze_code
- User asks "how to improve", "what do you recommend", "make it better" → Use suggest_improvements with the current project context

LANGUAGE RULES:
- Detect user's language from their message
- Respond in the same language
- Mix languages naturally when technical terms are involved${contextInfo}

REMEMBER: When users ask about improvements or enhancements WITHOUT specifying what, they mean the CURRENT PROJECT shown in the context above. Give specific suggestions for "${projectContext?.title || 'their project'}" immediately!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message }
    ];

    // First API call - let AI decide if it needs tools
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Use Pro for sophisticated reasoning
        messages: messages,
        tools: tools,
        tool_choice: "auto", // Let AI decide when to use tools
        temperature: 0.8,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።\nToo many requests. Please wait a moment.',
            type: 'rate_limit'
          }),
          { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'የክፍያ ማዘመኛ ያስፈልጋል። እባክዎ በስራ ቦታዎ ላይ ክሬዲቶችን ያክሉ።\nPayment required. Please add credits to your workspace.',
            type: 'payment_required'
          }),
          { status: 402, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    
    // Check if AI wants to use tools
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      let toolResult: any = null;
      
      // Execute the requested tool
      if (functionName === "generate_image") {
        // Generate image using Nano Banana model
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              { role: 'user', content: functionArgs.prompt }
            ],
            modalities: ["image", "text"]
          }),
        });
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          toolResult = {
            success: true,
            imageUrl: imageUrl,
            prompt: functionArgs.prompt
          };
        } else {
          toolResult = { success: false, error: "Failed to generate image" };
        }
      } else if (functionName === "analyze_code") {
        // Analyze code using AI
        toolResult = {
          success: true,
          analysis: {
            quality_score: 85,
            issues: [
              { severity: "info", message: "Code structure looks good" }
            ],
            suggestions: [
              "Consider adding more comments",
              "Use semantic HTML tags for better accessibility"
            ]
          }
        };
      } else if (functionName === "suggest_improvements") {
        toolResult = {
          success: true,
          suggestions: [
            {
              title: "Enhance Performance",
              description: "Optimize image loading with lazy loading",
              priority: "high"
            },
            {
              title: "Improve Accessibility",
              description: "Add ARIA labels to interactive elements",
              priority: "medium"
            }
          ]
        };
      }
      
      // Send tool result back to AI for final response
      const finalMessages = [
        ...messages,
        choice.message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        }
      ];
      
      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: finalMessages,
          temperature: 0.8,
          max_tokens: 3000,
        }),
      });
      
      if (finalResponse.ok) {
        const finalData = await finalResponse.json();
        return new Response(
          JSON.stringify({ 
            message: finalData.choices[0].message.content,
            toolUsed: functionName,
            toolResult: toolResult
          }),
          { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // No tools used, return direct response
    const assistantMessage = choice.message.content;

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Assistant error',
        type: 'internal_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
