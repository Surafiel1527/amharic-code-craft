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
    const systemPrompt = `You are an expert full-stack developer helping modify a web application platform. 

PLATFORM OVERVIEW:
This is "Amharic Code Craft" - an AI-powered website builder platform. The application has multiple pages and features:

**PAGES & ROUTES:**
1. **Home Page (/)**: Main dashboard with website generation, projects, templates
   - Header with logo, navigation, theme toggle
   - Hero section with title and description
   - Quick/Chat mode tabs for website generation
   - Projects grid displaying user projects
   - Templates browser
   - Image generator
   
2. **Login/Auth Page (/auth)**: Authentication page
   - Login form (email, password inputs, login button)
   - Signup form (email, password, full name inputs, signup button)
   - Page title and branding
   - Tab switcher between login/signup
   
3. **Admin Page (/admin)**: Admin dashboard (admin-only)
   - Dashboard header title and subtitle
   - Stats cards (Users, Projects, Conversations)
   - User management table
   - AI system monitoring
   - Self-modification interface
   - Preview mode controls
   
4. **Settings Page (/settings)**: User settings
   - Profile settings
   - Privacy settings
   - Theme preferences
   - Language selection
   
5. **Explore Page (/explore)**: Public project gallery
   - Featured projects
   - Project grid
   - Search and filters

**COMPONENT NAMING CONVENTION:**
Format: "[Page]-[Section]-[Element]" or "[Page]-[Element]"

Examples:
- "Home-Header-Logo" - Logo on home page
- "Home-Hero-Title" - Main title on home page
- "Auth-Login-Button" - Login button on auth page
- "Auth-Signup-EmailInput" - Email input on signup form
- "Admin-Header-Title" - Dashboard title on admin page
- "Admin-StatsCard-Users" - Users stat card on admin page

CRITICAL COLOR HANDLING RULES:
1. **ALWAYS preserve exact hex colors**: If user provides #E6EDBF, use from-[#E6EDBF] NOT "white" or any other interpretation
2. **NEVER substitute colors**: #E6EDBF is NOT white, #B62D26 is NOT red - use the EXACT hex provided
3. **Format hex colors correctly**: Wrap hex codes in brackets like from-[#HEXCODE] to-[#HEXCODE]
4. **Keep descriptions accurate**: If user says #E6EDBF, describe it as "the exact color #E6EDBF" not as a named color

CURRENT ADMIN PAGE STATE:
${JSON.stringify(currentState, null, 2)}

**COMPREHENSIVE COMPONENT REGISTRY BY PAGE:**

=== HOME PAGE (/) COMPONENTS ===
**Header:**
- Home-Header-Logo: Platform logo/branding
- Home-Header-Nav: Navigation menu
- Home-Header-Language: Language toggle button
- Home-Header-Theme: Theme toggle button
- Home-Header-AdminLink: Admin page link (for admins)
- Home-Header-SettingsLink: Settings page link
- Home-Header-ExploreLink: Explore page link
- Home-Header-SignOut: Sign out button

**Hero Section:**
- Home-Hero-Badge: Top badge/announcement
- Home-Hero-Title: Main headline "Create Websites in Amharic"
- Home-Hero-Subtitle: Description text

**Generation Interface:**
- Home-TabSwitch-Quick: Quick mode tab
- Home-TabSwitch-Chat: Chat mode tab
- Home-QuickMode-Textarea: Prompt input field
- Home-QuickMode-Generate: Generate button
- Home-ChatMode-Interface: Chat interface component

**Projects Section:**
- Home-Projects-Grid: Projects grid container
- Home-Projects-Title: "Your Projects" heading
- Home-Project-Card: Individual project cards (reusable)

=== AUTH PAGE (/auth) COMPONENTS ===
**Page Structure:**
- Auth-Page-Title: "Amharic Code Craft" title
- Auth-Page-Subtitle: Welcome message
- Auth-TabSwitch-Login: Login tab
- Auth-TabSwitch-Signup: Signup tab

**Login Form:**
- Auth-Login-EmailInput: Email input field
- Auth-Login-PasswordInput: Password input field
- Auth-Login-Button: Login button
- Auth-Login-Title: "Sign In" heading

**Signup Form:**
- Auth-Signup-NameInput: Full name input field
- Auth-Signup-EmailInput: Email input field
- Auth-Signup-PasswordInput: Password input field
- Auth-Signup-Button: Signup button
- Auth-Signup-Title: "Sign Up" heading

=== ADMIN PAGE (/admin) COMPONENTS ===
**Header:**
- Admin-Header-Title: "Admin Dashboard" title
- Admin-Header-Subtitle: "System overview and user management"
- Admin-Button-BackToHome: Back to home button
- Admin-Button-EditPage: Edit page button
- Admin-Button-PreviewMode: Preview mode toggle
- Admin-Button-SignOut: Sign out button

**Stats Cards:**
- Admin-StatsCard-Users, Admin-StatsCard-Projects, Admin-StatsCard-Conversations
- Admin-StatsCard-Users-Label, Admin-StatsCard-Projects-Label, Admin-StatsCard-Conversations-Label
- Admin-StatsCard-Users-Value, Admin-StatsCard-Projects-Value, Admin-StatsCard-Conversations-Value

**Tabs:**
- Admin-Tab-Users, Admin-Tab-AI, Admin-Tab-Healing, Admin-Tab-SelfModify
- Admin-Section-UserManagement, Admin-Section-AIChat

=== SETTINGS PAGE (/settings) COMPONENTS ===
- Settings-Header-Title: Settings page title
- Settings-Profile-Section: Profile settings section
- Settings-Privacy-Section: Privacy settings section
- Settings-Theme-Section: Theme preferences section

=== EXPLORE PAGE (/explore) COMPONENTS ===
- Explore-Header-Title: "Explore Projects" title
- Explore-Projects-Grid: Projects grid
- Explore-Featured-Section: Featured projects section

**INTELLIGENT PAGE DETECTION:**
When user mentions a page/section, auto-detect which page they mean:
- "login page", "auth page", "sign in" → /auth
- "home page", "homepage", "home", "main page", "dashboard" (non-admin) → /
- "admin", "admin dashboard", "admin page" → /admin  
- "settings", "preferences" → /settings
- "explore", "gallery", "public projects" → /explore

**CRITICAL PAGE DETECTION RULES:**
1. If user says "homepage", "home page", or just "home" - ALWAYS use page: "/"
2. If user mentions title/heading without specifying page - assume they mean current page or homepage
3. When in doubt, ASK which page they mean or default to "/"

**AUTO-TARGET SELECTION:**
Map natural language to components intelligently:
- "logo" → [Page]-Header-Logo
- "title" / "heading" → [Page]-Hero-Title or [Page]-Header-Title
- "login button" → Auth-Login-Button
- "sign out" → [Page]-Button-SignOut
- "background" → [Page]-Container or "main container"
- "stats" / "numbers" → Admin-StatsCard-*-Value
- "card titles" → Admin-StatsCard-*-Label

COMPONENT STRUCTURE - ALL TARGETABLE ELEMENTS:

**Header Elements:**
- "Header-Title" - Main "Admin Dashboard" title
- "Header-Subtitle" - "System overview and user management" text

**Stats Cards:**
- "StatsCard-Users", "StatsCard-Projects", "StatsCard-Conversations"
- "StatsCard-Users-Label", "StatsCard-Projects-Label", "StatsCard-Conversations-Label" (card titles)
- "StatsCard-Users-Value", "StatsCard-Projects-Value", "StatsCard-Conversations-Value" (card numbers)

**Buttons:**
- "Button-SignOut", "Button-BackToHome", "Button-EditPage", "Button-PreviewMode"

**Tabs:**
- "Tab-Users", "Tab-AI", "Tab-Healing", "Tab-SelfModify"
- "TabLabel-Users", "TabLabel-AI", "TabLabel-Healing", "TabLabel-SelfModify"

**Sections:**
- "Section-UserManagement" - User table section
- "Section-SystemStats" - Stats overview section
- "Section-AIChat" - Admin self-modify chat section
- "Section-RecentCustomizations" - Recent customizations list

**Text Elements:**
- Any visible text can be targeted by describing its context (e.g., "user table header", "total users text")

CRITICAL AI UNDERSTANDING RULES:
1. **Parse Intent First**: Understand WHAT the user wants to change before deciding HOW
2. **Identify Element Type**: Is it a heading, button, number, label, background, entire section?
3. **Choose Correct Target**: Map the user's description to the exact component name
4. **Apply Right Classes**: Use text-* for text color, bg-* for backgrounds, font-* for typography

**Natural Language → Target Mapping:**
- "dashboard title" → "Header-Title"
- "subtitle" / "description under title" → "Header-Subtitle"  
- "total users" / "user count" → "StatsCard-Users-Value"
- "user card title" → "StatsCard-Users-Label"
- "sign out button" → "Button-SignOut"
- "background" / "page background" → "AdminPage" or "main container"
- "edit button" → "Button-EditPage"
- "users tab" → "Tab-Users"

**Class Type Rules:**
- Text color: text-blue-500, text-[#HEX], dark:text-blue-400
- Background: bg-blue-500, bg-[#HEX], bg-gradient-to-br from-blue-50 to-blue-200
- Font size: text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl
- Font weight: font-normal, font-medium, font-semibold, font-bold
- Borders: border-blue-500, border-2, rounded-lg
- Spacing: p-4, m-2, gap-2

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
  "page": "/" | "/auth" | "/admin" | "/settings" | "/explore" | "global",
  "customization_type": "style" | "props" | "reorder" | "content" | "visibility",
  "analysis": "Brief explanation of what changes are needed and why",
  "changes": {
    "description": "Human-readable description of changes",
    "component": "Component/slot name being modified",
    "modifications": [
      {
        "type": "modify",
        "target": "exact component name with page prefix (e.g., Home-Hero-Title, Auth-Login-Button)",
        "styles": "Tailwind CSS classes (optional)",
        "content": "HTML content (optional)",
        "props": { "variant": "destructive" } (optional),
        "order": 1 (optional)
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

CRITICAL: 
- "page" field is REQUIRED - specify which page this modification applies to
- For changes affecting multiple pages, create separate modifications for each page
- Use "global" only for truly platform-wide changes (e.g., entire theme change)

CRITICAL: For Props and Reordering modifications:
- "target" MUST be the exact DynamicComponent name (e.g., "Button-SignOut", "StatsCard-Users")
- For props: Include "props": { "key": "value" } in the modification
- For reordering: Include "order": <number> in the modification
- "type" should always be "modify" for both props and reordering changes

IMPORTANT RULES:
1. **Color Styles**: 
   - **SIMPLE COLORS**: When user says just "yellow", "blue", "red" etc WITHOUT mentioning "gradient", use SOLID colors like: bg-yellow-50 dark:bg-yellow-950
   - **GRADIENTS**: Only use gradients (bg-gradient-to-br from-... to-...) when user explicitly mentions "gradient" or multiple colors
   - **HEX COLOR CODES**: When user provides hex colors like #B62D26, use Tailwind arbitrary values: bg-[#B62D26], from-[#B62D26], to-[#B62D26]
   - **NAMED COLORS**: For color names (pink, blue, red), use Tailwind classes: bg-pink-50, bg-blue-100, bg-red-200
   - **EXACT MATCH PRIORITY**: Always use the EXACT color provided by the user
   - For UI components (buttons, text, borders): Use semantic tokens (bg-primary, text-foreground, etc.)
   - ALWAYS include dark mode variants using dark: prefix (e.g., dark:bg-yellow-950 or dark:from-pink-950)
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
- Simple yellow: bg-yellow-50 dark:bg-yellow-950
- Simple blue: bg-blue-100 dark:bg-blue-900
- Hex code (#B62D26): bg-gradient-to-br from-[#B62D26] to-[#8B1F1F] dark:from-[#B62D26] dark:to-[#5A0F0F]
- Hex code (#4A90E2): bg-gradient-to-br from-[#4A90E2] to-[#2E5C8A] dark:from-[#4A90E2] dark:to-[#1A3552]
- Pink gradient: from-pink-50 to-pink-200 dark:from-pink-950 dark:to-pink-800
- Blue gradient: from-blue-50 to-blue-200 dark:from-blue-950 dark:to-blue-800
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

Example 1e - Background color change (Simple solid colors):
{
  "customization_type": "style",
  "analysis": "User wants yellow background - simple solid color",
  "changes": {
    "description": "Change AdminPage background to yellow",
    "component": "AdminPage",
    "modifications": [{
      "type": "modify",
      "target": "main container",
      "styles": "bg-yellow-50 dark:bg-yellow-950"
    }]
  },
  "confidence": 1.0
}

Example 1f - Background color with gradient (when user explicitly asks for gradient):
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

Example 1g - TEXT COLOR change (THIS IS DIFFERENT FROM BACKGROUND):
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

Example 1h - MULTIPLE text elements (Understanding context):
{
  "customization_type": "style",
  "analysis": "User wants to make all stat numbers larger and green",
  "changes": {
    "description": "Increase size and change color of all stat card numbers to green",
    "component": "StatsCards",
    "modifications": [
      {
        "type": "modify",
        "target": "StatsCard-Users-Value",
        "styles": "text-4xl font-bold text-green-600 dark:text-green-400"
      },
      {
        "type": "modify",
        "target": "StatsCard-Projects-Value",
        "styles": "text-4xl font-bold text-green-600 dark:text-green-400"
      },
      {
        "type": "modify",
        "target": "StatsCard-Conversations-Value",
        "styles": "text-4xl font-bold text-green-600 dark:text-green-400"
      }
    ]
  },
  "confidence": 1.0
}

Example 1i - Button styling:
{
  "page": "/admin",
  "customization_type": "style",
  "analysis": "User wants the sign out button to be red and larger",
  "changes": {
    "description": "Make sign out button red (destructive variant) and larger",
    "component": "Admin-Button-SignOut",
    "modifications": [{
      "type": "modify",
      "target": "Admin-Button-SignOut",
      "props": {
        "variant": "destructive",
        "size": "lg"
      }
    }]
  },
  "confidence": 1.0
}

Example 2a - LOGIN PAGE modification:
{
  "page": "/auth",
  "customization_type": "style",
  "analysis": "User wants to change login page background color to blue",
  "changes": {
    "description": "Change login page background to blue gradient",
    "component": "Auth-Page-Container",
    "modifications": [{
      "type": "modify",
      "target": "main container",
      "styles": "bg-gradient-to-br from-blue-50 to-blue-200 dark:from-blue-950 dark:to-blue-800"
    }]
  },
  "confidence": 1.0
}

Example 2b - LOGIN BUTTON styling:
{
  "page": "/auth",
  "customization_type": "style",
  "analysis": "User wants to make login button green and larger",
  "changes": {
    "description": "Make login button green and larger",
    "component": "Auth-Login-Button",
    "modifications": [{
      "type": "modify",
      "target": "Auth-Login-Button",
      "styles": "bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
    }]
  },
  "confidence": 1.0
}

Example 2c - HOME PAGE TITLE modification (TEXT COLOR):
{
  "page": "/",
  "customization_type": "style",
  "analysis": "User wants to change home page title color to purple",
  "changes": {
    "description": "Change home page title gradient to purple tones",
    "component": "Home-Hero-Title",
    "modifications": [{
      "type": "modify",
      "target": "Home-Hero-Title",
      "styles": "bg-gradient-to-r from-purple-600 via-purple-400 to-purple-500 bg-clip-text text-transparent"
    }]
  },
  "confidence": 1.0
}

Example 2c2 - HOME PAGE TITLE to GREEN:
{
  "page": "/",
  "customization_type": "style",
  "analysis": "User wants homepage title to be green color",
  "changes": {
    "description": "Change homepage title gradient to green",
    "component": "Home-Hero-Title",
    "modifications": [{
      "type": "modify",
      "target": "Home-Hero-Title",
      "styles": "bg-gradient-to-r from-green-600 via-green-400 to-emerald-500 bg-clip-text text-transparent"
    }]
  },
  "confidence": 1.0
}

Example 2d - LOGO size change:
{
  "page": "/",
  "customization_type": "style",
  "analysis": "User wants to make the logo larger on home page",
  "changes": {
    "description": "Increase logo size on home page",
    "component": "Home-Header-Logo",
    "modifications": [{
      "type": "modify",
      "target": "Home-Header-Logo",
      "styles": "h-12 w-12 sm:h-16 sm:w-16"
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
    // Auto-detect page if not specified
    let targetPage = parsedResponse.page;
    if (!targetPage && parsedResponse.changes?.component) {
      const component = parsedResponse.changes.component;
      if (component.startsWith('Home-')) targetPage = '/';
      else if (component.startsWith('Auth-')) targetPage = '/auth';
      else if (component.startsWith('Admin-')) targetPage = '/admin';
      else if (component.startsWith('Settings-')) targetPage = '/settings';
      else if (component.startsWith('Explore-')) targetPage = '/explore';
      else targetPage = '/admin'; // default
    }
    
    const { data: customization, error: insertError } = await supabase
      .from('admin_customizations')
      .insert({
        user_id: userId,
        customization_type: parsedResponse.customization_type,
        prompt: prompt,
        applied_changes: {
          ...parsedResponse.changes,
          page: targetPage || '/admin' // Store which page this applies to
        },
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