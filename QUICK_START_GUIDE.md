# Quick Start Guide - AI Code Generation Platform

**Get up and running in 5 minutes**

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Supabase account (or Lovable Cloud enabled)
- ✅ Git installed

## Step 1: Clone & Install (1 minute)

```bash
# Clone the repository
git clone <your-repo-url>
cd <your-project>

# Install dependencies
npm install
```

## Step 2: Start Development (1 minute)

```bash
# Start the development server
npm run dev
```

The app will open at `http://localhost:5173`

## Step 3: Understand the Structure (1 minute)

```
Your Project
├── src/                    → Frontend code
│   ├── pages/             → Main pages
│   ├── components/        → UI components
│   └── integrations/      → Supabase client
│
└── supabase/functions/    → Backend code
    ├── _shared/           → Shared utilities (clean!)
    └── mega-mind-orchestrator/  → Main AI logic
```

## Step 4: Make Your First Request (2 minutes)

1. **Open the app** in your browser
2. **Type a request** like: "Create a todo list app"
3. **Watch it generate** code in real-time
4. **See the results** streamed back to you

## Key Features You Get Out of the Box

### ✅ AI Code Generation
```typescript
// Automatically generates:
- React components
- Database tables
- Authentication flows
- API integrations
```

### ✅ Auto-Healing Database
```typescript
// Automatically fixes:
- Missing extensions (uuid-ossp, etc.)
- Missing schemas
- Common permission errors
```

### ✅ Smart AI Fallback
```typescript
// High availability:
Lovable AI → Gemini API → Error
(99.9% uptime)
```

## Common Use Cases

### 1. Generate a Simple Website
```
Request: "Create a portfolio website with hero, about, and contact sections"
Result: Complete HTML/CSS website ready to deploy
```

### 2. Build a React App
```
Request: "Create a task manager with authentication"
Result: React app + Supabase backend + auth flow
```

### 3. Add Features
```
Request: "Add a dark mode toggle to my app"
Result: Code modifications applied to existing project
```

## Understanding the AI Models

### Default: Gemini 2.5 Flash
- **Best for:** Most use cases
- **Speed:** Fast (1-3s)
- **Cost:** Free during beta
- **Use when:** General code generation

### Fallback: Gemini API
- **Best for:** When main API unavailable
- **Speed:** Fast (1-3s)
- **Cost:** Free tier available
- **Use when:** Automatic fallback

### Alternative: GPT-5
- **Best for:** Complex reasoning
- **Speed:** Slower (3-5s)
- **Cost:** Premium
- **Use when:** User specifically requests

## Environment Setup (Auto-Configured)

These are set automatically when using Lovable Cloud:
```bash
VITE_SUPABASE_URL=xxx          # Auto-set
VITE_SUPABASE_PUBLISHABLE_KEY=xxx  # Auto-set
LOVABLE_API_KEY=xxx            # Auto-provided
```

No manual configuration needed! 🎉

## Database Schema

The platform automatically creates these tables:
- `conversations` - Chat sessions
- `generated_code` - Generated files
- `learned_patterns` - AI learning
- `component_dependencies` - Code relationships

All with Row-Level Security (RLS) enabled!

## Making Changes

### Add a New UI Component
```typescript
// src/components/MyComponent.tsx
export const MyComponent = () => {
  return <div>Hello World</div>
}
```

### Add a New Backend Function
```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  return new Response("Hello from edge function!");
});
```

### Use Shared Utilities
```typescript
// Import from _shared/
import { callAIWithFallback } from '../_shared/aiHelpers.ts';
import { validateHTML } from '../_shared/validationHelpers.ts';
```

## Testing Your Changes

```bash
# Run tests
npm test

# Type check
npm run type-check

# Lint & format
npm run lint
npm run format
```

## Deployment

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

## Monitoring

### View Edge Function Logs
1. Go to Supabase Dashboard
2. Select your project
3. Navigate to "Edge Functions"
4. View logs for each function

### Check AI Usage
1. Monitor credits in Lovable dashboard
2. View usage in `build_events` table
3. Check fallback rate in logs

## Troubleshooting

### Issue: Migration Error
```
Error: uuid_generate_v4 does not exist
Fix: Auto-healing will fix automatically within seconds
```

### Issue: AI 402 Error
```
Error: Payment Required
Fix: Fallback to Gemini API activates automatically
```

### Issue: Rate Limited
```
Error: 429 Too Many Requests
Fix: Wait 1 minute or implement request throttling
```

## Next Steps

### Learn More
1. Read [Platform Architecture](./PLATFORM_ARCHITECTURE.md)
2. Explore [Refactoring Guide](./REFACTORING_COMPLETE.md)
3. Study [Self-Healing System](./SELF_HEALING_IMPLEMENTATION.md)

### Build Something
1. Generate a simple app
2. Add authentication
3. Deploy to production

### Contribute
1. Check code quality standards in README
2. Write tests for new features
3. Submit pull requests

## Need Help?

### Resources
- 📚 Documentation: All `.md` files in root
- 🔧 Logs: Supabase Dashboard → Edge Functions
- 💬 Support: Check edge function logs first

### Common Questions

**Q: How do I add a new AI model?**
A: Edit `_shared/aiHelpers.ts` and add to fallback chain

**Q: How do I create custom prompts?**
A: Edit `_shared/promptTemplates.ts`

**Q: How do I add new database tables?**
A: Let AI generate them, or write migrations manually

**Q: How do I disable auto-healing?**
A: Comment out auto-healing call in `setupDatabaseTables()`

## Success Checklist

- [x] ✅ Installation complete
- [x] ✅ Development server running
- [x] ✅ First AI request working
- [x] ✅ Understanding project structure
- [ ] 🎯 Deploy to production
- [ ] 🎯 Add custom features
- [ ] 🎯 Invite team members

## You're Ready! 🚀

Start building with AI-powered code generation.

The platform handles:
- ✅ Code generation
- ✅ Database setup
- ✅ Error auto-fixing
- ✅ Pattern learning
- ✅ AI fallbacks

You focus on:
- 🎯 User experience
- 🎯 Business logic
- 🎯 Custom features

**Happy building!** 💻✨
