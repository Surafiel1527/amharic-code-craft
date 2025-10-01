import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userId } = await req.json();

    if (!prompt || !userId) {
      throw new Error('Missing required fields');
    }

    console.log('Processing admin modification request:', { prompt, userId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current admin page customizations
    const { data: existingCustomizations } = await supabase
      .from('admin_customizations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'applied')
      .order('created_at', { ascending: false });

    // Build context about current admin page state
    const currentState = existingCustomizations?.map(c => ({
      type: c.customization_type,
      changes: c.applied_changes,
      prompt: c.prompt
    })) || [];

    // Prepare AI prompt with comprehensive context
    const systemPrompt = `You are an expert full-stack developer helping modify an admin dashboard application. 

CURRENT ADMIN PAGE STATE:
${JSON.stringify(currentState, null, 2)}

PROJECT ARCHITECTURE:
- Frontend: React with TypeScript
- Styling: Tailwind CSS with HSL color system
- UI Components: Shadcn/ui components
- Backend: Supabase (PostgreSQL database, Edge Functions, Authentication)
- State Management: React hooks and Supabase realtime
- Routing: React Router v6

AVAILABLE FEATURES IN THE APP:
- User authentication and role management
- Project management (create, edit, delete websites)
- AI-powered website generation
- Self-healing system for automatic bug fixes
- Error monitoring and analytics
- Template management
- User profile management
- Team workspaces
- Conversation history

YOUR TASK:
Analyze the user's request and generate the necessary changes to implement it in the admin page.

RESPONSE FORMAT (JSON):
{
  "customization_type": "style" | "feature" | "content" | "layout",
  "analysis": "Brief explanation of what changes are needed",
  "changes": {
    "description": "Human-readable description of changes",
    "component": "Which component to modify (e.g., AdminPage, AdminHeader, AdminSidebar)",
    "modifications": [
      {
        "type": "add" | "modify" | "remove",
        "target": "specific element or section",
        "code": "actual code changes if applicable",
        "styles": "CSS/Tailwind classes if style change",
        "config": "configuration changes if needed"
      }
    ]
  },
  "implementation_steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "requires_database": false | true,
  "database_changes": "SQL if database changes needed",
  "confidence": 0.0 to 1.0
}

IMPORTANT RULES:
1. For style changes: Use Tailwind CSS with HSL colors from the design system
2. For new features: Consider existing patterns and components
3. For language additions: Create proper translation structure
4. For functionality: Ensure proper error handling and user feedback
5. Always maintain admin-only access control
6. Keep changes focused and minimal
7. Ensure responsive design for all changes
8. Follow React best practices and TypeScript types
9. Use existing Supabase tables and create new ones only if absolutely necessary
10. Provide clear, implementable code snippets

USER REQUEST: ${prompt}`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI service requires payment. Please add credits to your workspace.');
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiMessage);

    // Parse AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiMessage);
    } catch (e) {
      console.error('Failed to parse AI response:', aiMessage);
      throw new Error('Invalid AI response format');
    }

    // Store the customization
    const { data: customization, error: insertError } = await supabase
      .from('admin_customizations')
      .insert({
        user_id: userId,
        customization_type: parsedResponse.customization_type,
        prompt: prompt,
        applied_changes: parsedResponse.changes,
        code_changes: JSON.stringify(parsedResponse),
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing customization:', insertError);
      throw insertError;
    }

    // Save assistant message to chat
    await supabase
      .from('admin_chat_messages')
      .insert({
        user_id: userId,
        role: 'assistant',
        content: parsedResponse.analysis,
        customization_id: customization.id
      });

    return new Response(
      JSON.stringify({
        success: true,
        customization_id: customization.id,
        response: parsedResponse,
        message: parsedResponse.analysis
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in admin-self-modify:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});