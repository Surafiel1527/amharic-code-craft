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
  return `You are an expert web development analyst. Analyze this user request.

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

1. **META-REQUEST** (outputType: "meta-conversation"):
   - Questions about logs, errors, or system behavior
   - Requests to "improve understanding", "see logs", "check what happened"
   - Debugging or troubleshooting the system itself
   - Questions about how the system works
   - Keywords: "see log", "check", "understand", "didn't work", "what happened", "debug"
   - **IMPORTANT**: "update README", "add instructions", "modify documentation" are NOT meta-requests - they are CODE MODIFICATIONS

2. **CODE MODIFICATION** (outputType: "modification"):
   - Clear requests to change/update/fix existing code or files
   - "Remove X", "Add Y", "Change Z", "Fix the button"
   - **Updating documentation files** (README.md, docs, any file with content changes)
   - Direct code changes to existing project
   - Keywords: "update", "add to", "change", "fix", "write to", "modify file"
   
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
