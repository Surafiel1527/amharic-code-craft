/**
 * AI Prompt Templates
 * Centralized prompts for consistency and maintainability
 */

export interface AnalysisContext {
  recentTurns?: any[];
  projectContext?: any;
  suggestionsPrompt?: string;
  mode?: string;
}

/**
 * Generate request analysis prompt
 */
export function buildAnalysisPrompt(request: string, requestType: string, context: AnalysisContext): string {
  const hasExistingProject = context.projectContext?._existingProject?.hasExistingCode;
  const existingFiles = context.projectContext?._existingProject?.files?.length || 0;
  
  return `You are an expert web development analyst. Analyze this user request.

${hasExistingProject ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 🔴 🔴 RED ALERT: EXISTING PROJECT DETECTED 🔴 🔴 🔴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS PROJECT HAS ${existingFiles} FILES ALREADY!

🚨 YOU MUST RESPOND WITH: outputType: "modification" 🚨

DO NOT GENERATE A NEW PROJECT! DO NOT USE "html-website" OR "react-app"!

The user is chatting about their EXISTING project. They want to:
• Modify existing code
• Add features to existing code  
• Fix bugs in existing code
• Discuss what was built

ONLY use "modification" unless user explicitly says:
✅ "start over completely"
✅ "create a brand new project"
✅ "delete everything and start fresh"

ANY other request = outputType: "modification"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

**User Request:** "${request}"
**Request Type:** ${requestType}

${context.recentTurns?.length ? `
**Recent Conversation Context:**
${context.recentTurns.slice(0, 3).map((turn: any) => `- ${turn.request}`).join('\n')}
` : ''}

${context.projectContext ? `
**Existing Project Features:**
${JSON.stringify(context.projectContext, null, 2)}
` : ''}

${context.suggestionsPrompt || ''}

**CRITICAL: Determine Request Category:**

🚨 **DEFAULT ASSUMPTION: ALL REQUESTS ARE CODE GENERATION** 🚨

Meta-requests are RARE exceptions. Use "meta-conversation" ONLY if the request is:

1. **META-REQUEST** (outputType: "meta-conversation") - USE SPARINGLY:
   ❌ NEVER use for: creating pages, components, features, or modifying any code/files
   ✅ ONLY use for: asking about system capabilities, explaining past actions, or pure Q&A
   
   Examples of TRUE meta-requests:
   - "What can you do?" / "What are your capabilities?"
   - "Explain what you just did" / "Why did that happen?"
   - "What technologies do you support?"
   
   Examples that are NOT meta-requests (these need code):
   - "Create privacy policy page" → CODE GENERATION
   - "Add terms of service" → CODE GENERATION  
   - "Create about page" → CODE GENERATION
   - "Add contact form" → CODE GENERATION
   - "Show me the logs" → CODE GENERATION (needs UI to display logs)

2. **CODE MODIFICATION** (outputType: "modification"):
   - ${hasExistingProject ? '🚨 **DEFAULT CHOICE when project exists** 🚨' : ''}
   - Clear requests to change/update/fix existing code or files
   - "Remove X", "Add Y", "Change Z", "Fix the button"
   - **Updating documentation files** (README.md, docs, any file with content changes)
   - Direct code changes to existing project
   - **UI/UX Changes**: button clicks, navigation, redirects, routing, page flows
   - **Navigation patterns**: "when I click X it should Y", "redirect to", "navigate to", "go to page"
   - Keywords: "update", "add to", "change", "fix", "write to", "modify file", "should redirect", "should go to", "when clicked"
   
3. **NEW HTML WEBSITE** (outputType: "html-website"):
   - Creating new website from scratch
   - Keywords: "create website", "portfolio", "landing page", "html site"

4. **NEW REACT APP** (outputType: "react-app"):
   - Creating new React application
   - Keywords: "react app", "dashboard", "component", "interactive app"

**SMART BACKEND DETECTION:**

🚨 **CRITICAL AUTHENTICATION DETECTION** 🚨
If the request contains ANY of these patterns, set needsAuth=TRUE:
- Words: login, signup, sign up, register, authentication, auth, user account, my account, profile, password, credentials
- Features: "user can login", "signup form", "authentication", "user system", "protected routes", "login page"
- User actions: "I can't signup", "can't create account", "login doesn't work", "need to register"
- **IMPORTANT**: Even mentions of "user" or "account" in context of access → needsAuth=TRUE

🚨 **CRITICAL DATABASE DETECTION** 🚨  
If the request contains ANY of these patterns, set needsDatabase=TRUE:
- Words: save, store, persist, database, collection, list, crud, manage, track, record, data
- Features: user profiles, posts, comments, likes, bookmarks, shopping cart, inventory, tasks, notes
- Data persistence: "save my work", "remember", "keep track of", "store information"
- User-specific data: "my tasks", "my notes", "user posts", "personal dashboard"

**Authentication Detection Rules:**
✅ "create user accounts" → needsAuth=TRUE
✅ "signup page" → needsAuth=TRUE  
✅ "user login" → needsAuth=TRUE
✅ "I can't create account" → needsAuth=TRUE (user trying to fix broken auth)
✅ "user authentication" → needsAuth=TRUE
✅ "profile page" → needsAuth=TRUE + needsDatabase=TRUE
✅ "my dashboard" → needsAuth=TRUE + needsDatabase=TRUE

**Database Detection Rules:**
✅ "task manager" → needsDatabase=TRUE (tasks need persistence)
✅ "save tasks" → needsDatabase=TRUE
✅ "user profiles" → needsDatabase=TRUE + needsAuth=TRUE
✅ "shopping cart" → needsDatabase=TRUE
✅ "blog posts" → needsDatabase=TRUE

**Edge Functions Indicators:**
- External integrations: payment, email, SMS, webhooks, third-party APIs
- Server-side logic: data processing, scheduled tasks, background jobs, AI calls
- Security: API key usage, server-side validation, rate limiting
- Patterns: "send email", "process payment", "call API", "webhook", "integrate AI"

**Storage Indicators:**
- File handling: upload, download, images, documents, media, files, attachments
- Patterns: "upload image", "profile picture", "file storage", "document upload"

**Data Model Intelligence:**
Automatically infer database schema:
- Authentication → users table (auto-managed by Supabase Auth) + profiles table (id, username, full_name, avatar_url, bio, created_at)
- Tasks/Notes → tasks table (id, user_id, title, description, completed, due_date, created_at)
- Social features → posts, comments, likes, followers tables
- E-commerce → products, orders, cart_items, reviews tables
- Content → articles, pages, categories, tags tables

**Universal Instruction Intelligence:**

Understand variations and contexts:
- "make it work" → Fix broken functionality
- "add feature X" → Implement new feature X  
- "users should be able to Y" → Enable capability Y for users (may need auth + DB)
- "I can't do Z" → Fix issue preventing Z (analyze what's broken)
- "create a X app" → Build app X with standard features (analyze domain for needs)
- "like Airbnb/Twitter/etc" → Clone popular app (implies auth + DB + complex features)
- "when I click X it should Y" → Modify button/link behavior (routing, navigation, actions)
- "redirect to page Z" → Add navigation/routing to page Z
- "should go to signup" → Implement navigation to signup page

**Context-Aware Analysis:**
- If previous request had auth but new one says "can't signup" → Fix auth, don't rebuild
- If app exists but user says "add auth" → Add authentication to existing app
- If user says "make it real" or "fully functional" → Add full backend (auth + DB)
- If user references popular apps → Infer standard features (auth, profiles, CRUD)

**Output JSON:**
{
  "outputType": "meta-conversation" | "modification" | "html-website" | "react-app",
  "mainGoal": "what the user wants to achieve",
  "subTasks": ["task 1", "task 2"],
  "requiredSections": ["Hero", "About"] (for new websites),
  "requiredTechnologies": ["html", "css", "react", "supabase"],
  "complexity": "simple" | "moderate" | "complex",
  "estimatedFiles": 1,
  "needsRouting": false,
  "needsInteractivity": true|false,
  "needsAPI": false,
  "isMetaRequest": false,
  "backendRequirements": {
    "needsDatabase": true|false,
    "needsAuth": true|false,
    "needsEdgeFunctions": true|false,
    "needsStorage": true|false,
    "confidence": 0.0-1.0,
    "databaseTables": [
      {
        "name": "posts",
        "purpose": "store blog posts",
        "fields": [
          { "name": "id", "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
          { "name": "user_id", "type": "uuid", "nullable": false, "references": "auth.users(id)", "isUserReference": true },
          { "name": "title", "type": "text", "nullable": false },
          { "name": "content", "type": "text", "nullable": true },
          { "name": "status", "type": "text", "default": "'draft'" },
          { "name": "created_at", "type": "timestamp with time zone", "default": "now()" }
        ],
        "relationships": ["belongs to user", "has many comments"]
      }
    ],
    "edgeFunctions": [
      {
        "name": "send-welcome-email",
        "purpose": "send email to new users",
        "triggers": ["user signup"]
      }
    ],
    "explanation": "detailed explanation of why backend is needed and what it will do"
  }
}`;
}

/**
 * Build website generation prompt
 */
export function buildWebsitePrompt(request: string, analysis: any): string {
  return `Generate a COMPLETE, BEAUTIFUL, PRODUCTION-READY website based on this EXACT request:

**Request:** "${request}"

**Requirements:**
${analysis.requiredSections?.map((s: string) => `- ${s} section`).join('\n')}

**Design Guidelines:**
- Modern, clean, professional design
- Responsive layout (mobile-first)
- Semantic HTML5
- CSS3 with flexbox/grid
- Accessibility (ARIA labels, alt text)
- SEO optimized (meta tags, headings)

Generate ONLY valid HTML with inline CSS. No external files.

Return ONLY the code, no explanations.`;
}

/**
 * HTML Website System Prompt
 */
export const HTML_WEBSITE_SYSTEM_PROMPT = `You are an expert web designer. Generate COMPLETE, MODULAR websites with SEPARATE HTML, CSS, and JS files. 

Output ONLY valid, compact JSON. ALWAYS split into 3 files: 
- index.html (structure only)
- styles.css (all styles)
- script.js (all JavaScript)

Use CDN links for libraries. Keep code efficient and well-organized.

SECURITY: Never display credentials with alert(). Use proper UI.

AUTH: Use Supabase Auth (supabase.auth.signUp/signInWithPassword) with profiles table 
(id, username, full_name, avatar_url, bio). Handle errors gracefully.`;

/**
 * React App System Prompt
 */
export const REACT_APP_SYSTEM_PROMPT = `You are a Lovable React expert. Generate clean, production-ready React/TypeScript components 
using shadcn/ui and semantic Tailwind classes. 

NEVER use direct colors. Respond with JSON only.

SECURITY: Never display sensitive user data (passwords, tokens) in alerts or console logs. 
Use proper toast notifications for user feedback.

AUTHENTICATION: 
- Import supabase client from "@/integrations/supabase/client"
- For signup: supabase.auth.signUp({ email, password, options: { data: { username, full_name } } })
- For login: supabase.auth.signInWithPassword({ email, password })
- Listen to auth: supabase.auth.onAuthStateChange((event, session) => {...})
- Check session: supabase.auth.getSession()
- Logout: supabase.auth.signOut()
- Access profiles from "profiles" table
- Redirect authenticated users
- Use toast for feedback, never alerts`;

/**
 * Fallback Error HTML Template
 */
export function buildFallbackErrorHTML(message: string = 'Generation Failed'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Generation Error</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      text-align: center;
      background: #f5f5f5;
    }
    h1 {
      color: #e74c3c;
    }
    button {
      margin-top: 20px;
      padding: 10px 20px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: #2980b9;
    }
  </style>
</head>
<body>
  <h1>${message}</h1>
  <p>The AI response had formatting issues. Please try again with a simpler request or rephrase your request.</p>
  <button onclick="location.reload()">Try Again</button>
</body>
</html>`;
}
