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
- Style change: { "type": "modify", "target": "AdminPage", "styles": "bg-blue-500" }
- Add content: { "type": "add", "target": "header-actions", "content": "<Badge variant='destructive'>Urgent</Badge>" }
- Props change: { "type": "modify", "target": "Button-SignOut", "props": { "variant": "destructive" } }
- Reorder: { "type": "modify", "target": "StatsCard-Projects", "order": 1 }
- Hide element: { "type": "hide", "target": "notifications" }
- Show element: { "type": "show", "target": "notifications" }
`;

    // Prepare AI prompt with comprehensive context
    const systemPrompt = `You are an expert full-stack developer helping modify an admin dashboard application. 

CRITICAL COLOR HANDLING RULES:
1. **ALWAYS preserve exact hex colors**: If user provides #E6EDBF, use from-[#E6EDBF] NOT "white" or any other interpretation
2. **NEVER substitute colors**: #E6EDBF is NOT white, #B62D26 is NOT red - use the EXACT hex provided
3. **Format hex colors correctly**: Wrap hex codes in brackets like from-[#HEXCODE] to-[#HEXCODE]
4. **Keep descriptions accurate**: If user says #E6EDBF, describe it as "the exact color #E6EDBF" not as a named color

CURRENT ADMIN PAGE STATE:
${JSON.stringify(currentState, null, 2)}

COMPONENT STRUCTURE FOR PROPS & REORDERING:
- Header Elements: "Header-Title" (dashboard title), "Header-Subtitle" (system overview text)
- Stats Cards: "StatsCard-Users", "StatsCard-Projects", "StatsCard-Conversations" (wrapped in DynamicComponent)
- Action Buttons: "Button-SignOut", "Button-BackToHome" (can modify variant, size, etc.)
- Tabs: "Tab-Users", "Tab-AI", "Tab-Healing", "Tab-Customize" (can reorder)
- Any component wrapped in <DynamicComponent name="ComponentName"> can be modified

CRITICAL TARGETING RULES:
1. **Text Color Changes**: ALWAYS target specific text elements like "Header-Title", "Header-Subtitle", NOT vague targets like "header text"
2. **Background Changes**: Target containers like "AdminPage", "main container", specific card names
3. **Text classes**: text-[color], font-[weight], text-[size]
4. **Background classes**: bg-[color], bg-gradient-to-[direction]

PROJECT ARCHITECTURE:
- Frontend: React with TypeScript
- Styling: Tailwind CSS with HSL color system AND arbitrary hex values [#HEXCODE]
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
   Example: { "type": "modify", "target": "AdminPage", "styles": "bg-gradient-to-br from-blue-50 to-blue-200" }

2. **Content Injection**: Add HTML/components to designated slots
   Example: { "type": "add", "target": "header-actions", "content": "<Badge variant='destructive'>Urgent</Badge>" }

3. **Props Modification**: Modify component properties
   - Change button variants: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
   - Change button sizes: "default" | "sm" | "lg" | "icon"
   - Change badge variants: "default" | "secondary" | "destructive" | "outline"
   - Modify any component prop (className, disabled, etc.)
   Example: { "type": "modify", "target": "Button-SignOut", "props": { "variant": "destructive", "size": "sm" } }

4. **Component Reordering**: Change visual display order of grouped elements
   - Reorder stats cards: "StatsCard-Users", "StatsCard-Projects", "StatsCard-Conversations"
   - Set order values (1, 2, 3, etc.) - lower numbers appear first
   - Order 1 comes before order 2, order 2 comes before order 3, etc.
   Example: { "type": "modify", "target": "StatsCard-Conversations", "order": 1 }

5. **Visibility Control**: Show/hide existing components
   Example: { "type": "hide", "target": "NotificationCenter" }

YOUR TASK:
Analyze the user's request and generate the necessary changes to implement it in the admin page.

RESPONSE FORMAT (JSON):
{
  "customization_type": "style" | "props" | "reorder" | "content" | "visibility",
  "analysis": "Brief explanation of what changes are needed and why",
  "changes": {
    "description": "Human-readable description of changes",
    "component": "Component/slot name being modified",
    "modifications": [
      {
        "type": "modify",
        "target": "exact component name (e.g., Button-SignOut, StatsCard-Users)",
        "styles": "Tailwind CSS classes (optional)",
        "content": "HTML content (optional)",
        "props": { "variant": "destructive" } (optional - for props changes),
        "order": 1 (optional - for reordering)
      }
    ]
  },
  "implementation_steps": [
    "Step 1: What will be changed",
    "Step 2: How it will look",
    "Step 3: Result"
  ],
  "requires_database": false,
  "database_changes": null,
  "confidence": 0.9
}

CRITICAL: For Props and Reordering modifications:
- "target" MUST be the exact DynamicComponent name (e.g., "Button-SignOut", "StatsCard-Users")
- For props: Include "props": { "key": "value" } in the modification
- For reordering: Include "order": <number> in the modification
- "type" should always be "modify" for both props and reordering changes

IMPORTANT RULES:
1. **Color Styles**: 
   - **HEX COLOR CODES**: When user provides hex colors like #B62D26, use Tailwind arbitrary values: bg-[#B62D26], from-[#B62D26], to-[#B62D26]
   - **NAMED COLORS**: For color names (pink, blue, red), use Tailwind classes: from-pink-50, to-pink-200
   - **EXACT MATCH PRIORITY**: Always use the EXACT color provided by the user
   - For UI components (buttons, text, borders): Use semantic tokens (bg-primary, text-foreground, etc.)
   - ALWAYS include dark mode variants using dark: prefix (e.g., dark:from-[#B62D26] or dark:from-pink-950)
   - For gradients with hex codes: bg-gradient-to-[direction] from-[#HEX1] to-[#HEX2]
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
- Hex code (#B62D26): bg-gradient-to-br from-[#B62D26] to-[#8B1F1F] dark:from-[#B62D26] dark:to-[#5A0F0F]
- Hex code (#4A90E2): bg-gradient-to-br from-[#4A90E2] to-[#2E5C8A] dark:from-[#4A90E2] dark:to-[#1A3552]
- Pink: from-pink-50 to-pink-200 dark:from-pink-950 dark:to-pink-800
- Blue: from-blue-50 to-blue-200 dark:from-blue-950 dark:to-blue-800
- Red: from-red-50 to-red-200 dark:from-red-950 dark:to-red-800
- Purple: from-purple-50 to-purple-200 dark:from-purple-950 dark:to-purple-800
- White: from-white to-gray-50 dark:from-gray-950 dark:to-gray-900
- Pink + Red: from-pink-50 via-pink-100 to-red-200 dark:from-pink-950 dark:via-red-900 dark:to-red-800
- Mixed (hex + named): from-[#FF6B9D] via-pink-100 to-red-200 dark:from-[#8B0040] dark:via-red-900 dark:to-red-800

EXAMPLES:

Example 1a - Background color with EXACT HEX code (user provided #E6EDBF):
{
  "customization_type": "style",
  "analysis": "User requested the exact color #E6EDBF as background",
  "changes": {
    "description": "Change AdminPage background to the exact color #E6EDBF with gradient",
    "component": "AdminPage",
    "modifications": [{
      "type": "modify",
      "target": "main container",
      "styles": "bg-gradient-to-br from-[#E6EDBF] to-[#D4DCAA] dark:from-[#E6EDBF] dark:to-[#C5CD99]"
    }]
  },
  "confidence": 1.0
}

Example 1b - Background color with EXACT HEX code (user provided #B62D26):
{
  "customization_type": "style",
  "analysis": "User requested the exact color #B62D26 as background",
  "changes": {
    "description": "Change AdminPage background to the exact color #B62D26",
    "component": "AdminPage",
    "modifications": [{
      "type": "modify",
      "target": "main container",
      "styles": "bg-gradient-to-br from-[#B62D26] to-[#8B1F1F] dark:from-[#B62D26] dark:to-[#5A0F0F]"
    }]
  },
  "confidence": 1.0
}

Example 1c - Props modification (change button variant):
{
  "customization_type": "props",
  "analysis": "User wants sign out button to be more prominent with destructive style",
  "changes": {
    "description": "Change sign-out button to destructive variant and larger size",
    "component": "Button-SignOut",
    "modifications": [{
      "type": "props",
      "target": "Button-SignOut",
      "props": {
        "variant": "destructive",
        "size": "lg"
      }
    }]
  },
  "confidence": 1.0
}

Example 1d - Reordering (move stats cards):
{
  "customization_type": "layout",
  "analysis": "User wants to see conversations count first, then projects, then users",
  "changes": {
    "description": "Reorder stats cards: Conversations first, Projects second, Users third",
    "component": "StatsCards",
    "modifications": [
      {
        "type": "reorder",
        "target": "StatsCard-Conversations",
        "order": 1
      },
      {
        "type": "reorder",
        "target": "StatsCard-Projects",
        "order": 2
      },
      {
        "type": "reorder",
        "target": "StatsCard-Users",
        "order": 3
      }
    ]
  },
  "confidence": 1.0
}

Example 1e - Background color change (Named colors):
      }
    }]
  },
  "confidence": 1.0
}

Example 1d - Reordering (move stats cards):
{
  "customization_type": "layout",
  "analysis": "User wants to see conversations count first, then projects, then users",
  "changes": {
    "description": "Reorder stats cards: Conversations first, Projects second, Users third",
    "component": "StatsCards",
    "modifications": [
      {
        "type": "reorder",
        "target": "StatsCard-Conversations",
        "order": 1
      },
      {
        "type": "reorder",
        "target": "StatsCard-Projects",
        "order": 2
      },
      {
        "type": "reorder",
        "target": "StatsCard-Users",
        "order": 3
      }
    ]
  },
  "confidence": 1.0
}

Example 1e - Background color change (Named colors):
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

Example 1f - TEXT COLOR change (THIS IS DIFFERENT FROM BACKGROUND):
{
  "customization_type": "style",
  "analysis": "User wants to change the dashboard header title text to blue color",
  "changes": {
    "description": "Change the 'Admin Dashboard' title text color to blue",
    "component": "Header-Title",
    "modifications": [{
      "type": "modify",
      "target": "Header-Title",
      "styles": "text-blue-500 dark:text-blue-400"
    }]
  },
  "implementation_steps": [
    "Target the Header-Title component specifically",
    "Apply text-blue-500 for light mode and text-blue-400 for dark mode",
    "The dashboard title 'Admin Dashboard' will now be blue"
  ],
  "confidence": 1.0
}

Example 1g - SUBTITLE TEXT COLOR change:
{
  "customization_type": "style",
  "analysis": "User wants to change the subtitle text to gray",
  "changes": {
    "description": "Change the subtitle 'System overview and user management' to gray",
    "component": "Header-Subtitle",
    "modifications": [{
      "type": "modify",
      "target": "Header-Subtitle",
      "styles": "text-gray-600 dark:text-gray-400"
    }]
  },
  "confidence": 1.0
}

Example 2 - Combined props and style:
{
  "customization_type": "props",
  "analysis": "User wants back button to be larger and have accent color",
  "changes": {
    "description": "Make back button larger with accent background",
    "component": "Button-BackToHome",
    "modifications": [{
      "type": "props",
      "target": "Button-BackToHome",
      "props": {
        "size": "lg",
        "variant": "default"
      },
      "styles": "bg-accent hover:bg-accent/90"
    }]
  },
  "confidence": 1.0
}

Example 3 - Add new stat card:
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

    // Store the customization as PENDING (require manual approval)
    const { data: customization, error: insertError } = await supabase
      .from('admin_customizations')
      .insert({
        user_id: userId,
        customization_type: parsedResponse.customization_type,
        prompt: prompt,
        applied_changes: parsedResponse.changes,
        code_changes: JSON.stringify(parsedResponse),
        status: 'pending', // Store as pending for preview
        applied_at: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing customization:', insertError);
      throw insertError;
    }

    console.log('Customization created (pending review):', customization.id);

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