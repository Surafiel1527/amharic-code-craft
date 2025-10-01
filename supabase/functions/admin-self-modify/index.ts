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

    // Get component registry documentation
    const componentDocs = `
# COMPONENT REGISTRY

The following pre-built components are available for use. You can reference these by name in your modifications:

## Layout Components
- Card: Container for grouping content
- CardHeader, CardTitle, CardDescription, CardContent: Card sections
- Table, TableHeader, TableBody, TableRow, TableHead, TableCell: Data tables

## UI Components
- Button: Interactive buttons (variants: default, destructive, outline, secondary, ghost, link)
- Badge: Status indicators (variants: default, secondary, destructive, outline)

## Feedback Components
- Alert, AlertTitle, AlertDescription: Alert messages

## Icons
- BarChart3, Users, FileText, MessageSquare, TrendingUp, Activity
- Bell, Settings, Info, AlertCircle, CheckCircle

## Dynamic Slots
The admin page has designated "slots" where you can inject content:
- "header-actions": Top right header area
- "stats-extra": Below the main stats cards
- "tab-content": Custom tab content
- "sidebar-items": Sidebar menu items

USAGE EXAMPLES:
- Style change: { "type": "modify", "component": "AdminPage", "styles": "bg-blue-500" }
- Add content: { "type": "add", "component": "header-actions", "content": "<Badge>New</Badge>" }
- Hide element: { "type": "hide", "component": "notifications" }
- Show element: { "type": "show", "component": "notifications" }
- Reorder: { "type": "modify", "component": "stats-card", "order": 2 }
`;

    // Prepare AI prompt with comprehensive context
    const systemPrompt = `You are an expert full-stack developer helping modify an admin dashboard application. 

CURRENT ADMIN PAGE STATE:
${JSON.stringify(currentState, null, 2)}

PROJECT ARCHITECTURE:
- Frontend: React with TypeScript
- Styling: Tailwind CSS with HSL color system
- UI Components: Shadcn/ui components (see registry below)
- Backend: Supabase (PostgreSQL database, Edge Functions, Authentication)
- State Management: React hooks and Supabase realtime
- Routing: React Router v6
- Dynamic System: Components can be modified at runtime through slots and props

${componentDocs}

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
- Dynamic customization system (you're using it now!)

YOUR CAPABILITIES:
1. **Style Changes**: Modify any component's CSS classes
2. **Content Injection**: Add HTML/components to designated slots
3. **Visibility Control**: Show/hide existing components
4. **Reordering**: Change the display order of elements
5. **Props Modification**: Update component properties dynamically

YOUR TASK:
Analyze the user's request and generate the necessary changes to implement it in the admin page.

RESPONSE FORMAT (JSON):
{
  "customization_type": "style" | "feature" | "content" | "layout" | "visibility",
  "analysis": "Brief explanation of what changes are needed and why",
  "changes": {
    "description": "Human-readable description of changes",
    "component": "Component/slot name to modify (e.g., AdminPage, header-actions, stats-card)",
    "modifications": [
      {
        "type": "add" | "modify" | "remove" | "hide" | "show",
        "target": "specific element or section",
        "styles": "Tailwind CSS classes (for style changes)",
        "content": "HTML/JSX content (for content injection)",
        "props": { "key": "value" } (for prop changes),
        "order": 1 (for reordering),
        "visibility": true/false (for visibility)
      }
    ]
  },
  "implementation_steps": [
    "Detailed step explaining what will happen",
    "Another step",
    "Final step"
  ],
  "requires_database": false | true,
  "database_changes": "SQL if database changes needed (usually false for UI changes)",
  "confidence": 0.0 to 1.0
}

IMPORTANT RULES:
1. **Color Styles**: 
   - For BACKGROUND COLORS: Always use Tailwind color utility classes (e.g., from-pink-50, via-red-100, to-purple-200)
   - When user requests specific colors, use those exact Tailwind color names
   - For UI components (buttons, text, borders): Use semantic tokens (bg-primary, text-foreground, etc.)
   - ALWAYS include dark mode variants using dark: prefix (e.g., dark:from-pink-950)
   - For gradients, use format: bg-gradient-to-[direction] from-[color] via-[color] to-[color]
2. **Components**: Only reference components from the registry above
3. **Slots**: Use designated slot names for content injection
4. **Safety**: Never suggest changes that could break authentication or security
5. **Simplicity**: Keep modifications minimal and focused
6. **Responsiveness**: Ensure mobile-friendly classes (sm:, md:, lg: prefixes)
7. **Dark Mode**: ALWAYS include dark mode variants for any color changes
8. **Accessibility**: Include proper aria labels and semantic HTML
9. **Performance**: Avoid heavy computations or large content injections
10. **Validation**: Ensure all prop changes match component interfaces

COLOR EXAMPLES:
- Pink: from-pink-50 to-pink-200 dark:from-pink-950 dark:to-pink-800
- Blue: from-blue-50 to-blue-200 dark:from-blue-950 dark:to-blue-800
- Red: from-red-50 to-red-200 dark:from-red-950 dark:to-red-800
- Purple: from-purple-50 to-purple-200 dark:from-purple-950 dark:to-purple-800
- White: from-white to-gray-50 dark:from-gray-950 dark:to-gray-900
- Pink + Red: from-pink-50 via-pink-100 to-red-200 dark:from-pink-950 dark:via-red-900 dark:to-red-800

EXAMPLES:

Example 1 - Background color change (Pink and Red):
{
  "customization_type": "style",
  "analysis": "User wants pink and red gradient background",
  "changes": {
    "description": "Change AdminPage background to pink and red gradient",
    "component": "AdminPage",
    "modifications": [{
      "type": "modify",
      "target": "main container",
      "styles": "bg-gradient-to-br from-pink-50 via-pink-100 to-red-200 dark:from-pink-950 dark:via-red-900 dark:to-red-800"
    }]
  },
  "confidence": 1.0
}

Example 2 - Add new stat card:
{
  "customization_type": "content",
  "analysis": "User wants to display total revenue",
  "changes": {
    "description": "Add revenue stat card in stats-extra slot",
    "component": "stats-extra",
    "modifications": [{
      "type": "add",
      "target": "stats grid",
      "content": "<Card className='glass-effect'><CardHeader><CardTitle className='text-sm'>Total Revenue</CardTitle></CardHeader><CardContent><div className='text-2xl font-bold'>$12,450</div></CardContent></Card>"
    }]
  },
  "confidence": 0.9
}

Example 3 - Hide notifications:
{
  "customization_type": "visibility",
  "analysis": "User wants to hide notification center",
  "changes": {
    "description": "Hide NotificationCenter component",
    "component": "NotificationCenter",
    "modifications": [{
      "type": "hide",
      "target": "notification button"
    }]
  },
  "confidence": 1.0
}

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

    // Store the customization as applied (auto-apply)
    const { data: customization, error: insertError } = await supabase
      .from('admin_customizations')
      .insert({
        user_id: userId,
        customization_type: parsedResponse.customization_type,
        prompt: prompt,
        applied_changes: parsedResponse.changes,
        code_changes: JSON.stringify(parsedResponse),
        status: 'applied', // Auto-apply
        applied_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing customization:', insertError);
      throw insertError;
    }

    console.log('Customization auto-applied:', customization.id);

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