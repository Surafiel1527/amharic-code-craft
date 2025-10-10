# Code Standards & Best Practices

This document defines coding standards to maintain code quality and readability across the project.

## 🚫 Critical Rules

### 1. **NO Single-Line Mega Strings**

**❌ NEVER DO THIS:**
```typescript
const prompt = 'You are an expert web designer. Generate COMPLETE, MODULAR websites with SEPARATE HTML, CSS, and JS files. Output ONLY valid, compact JSON. ALWAYS split into 3 files: index.html (structure only), styles.css (all styles), script.js (all JavaScript). Use CDN links for libraries. Keep code efficient and well-organized. SECURITY: Never display credentials with alert(). Use proper UI. AUTH: Use Supabase Auth (supabase.auth.signUp/signInWithPassword) with profiles table (id, username, full_name, avatar_url, bio). Handle errors gracefully.';

const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Generation Error</title><style>body{font-family:Arial,sans-serif;padding:40px;text-align:center;background:#f5f5f5;}h1{color:#e74c3c;}</style></head><body><h1>Generation Failed</h1><p>The AI response had formatting issues. Please try again with a simpler request or rephrase your request.</p><button onclick="location.reload()">Try Again</button></body></html>';
```

**✅ DO THIS INSTEAD:**
```typescript
// Extract to template files
import { HTML_WEBSITE_SYSTEM_PROMPT, buildFallbackErrorHTML } from '../_shared/promptTemplates.ts';

const prompt = HTML_WEBSITE_SYSTEM_PROMPT;
const html = buildFallbackErrorHTML('Generation Failed');
```

**Rule**: Any string longer than **150 characters** must be:
- Converted to multi-line template literal
- Extracted to a dedicated template file
- Split into logical sections with comments

---

### 2. **NO Mega className Strings**

**❌ NEVER DO THIS:**
```tsx
<Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
```

**✅ DO THIS INSTEAD:**
```tsx
import { cva } from "class-variance-authority";

const commandStyles = cva("", {
  defaultVariants: {},
  compoundVariants: [
    {
      class: `
        [&_[cmdk-group-heading]]:px-2
        [&_[cmdk-group-heading]]:font-medium
        [&_[cmdk-group-heading]]:text-muted-foreground
        [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0
        [&_[cmdk-group]]:px-2
        [&_[cmdk-input-wrapper]_svg]:h-5
        [&_[cmdk-input-wrapper]_svg]:w-5
        [&_[cmdk-input]]:h-12
        [&_[cmdk-item]]:px-2
        [&_[cmdk-item]]:py-3
        [&_[cmdk-item]_svg]:h-5
        [&_[cmdk-item]_svg]:w-5
      `
    }
  ]
});

<Command className={commandStyles()}>
```

**Rule**: Any `className` longer than **100 characters** must use `cva()` or be split into logical groups.

---

### 3. **HTML Templates Must Be Readable**

**❌ NEVER DO THIS:**
```typescript
const html = '<!DOCTYPE html><html><head><title>App</title></head><body><div class="container"><h1>Welcome</h1><p>Content here</p></div></body></html>';
```

**✅ DO THIS INSTEAD:**
```typescript
const html = `<!DOCTYPE html>
<html>
<head>
  <title>App</title>
</head>
<body>
  <div class="container">
    <h1>Welcome</h1>
    <p>Content here</p>
  </div>
</body>
</html>`;
```

---

## 📝 General Best Practices

### File Organization
- **Max 500 lines per file** - Split into smaller focused modules
- **Max 100 lines per function** - Extract helper functions
- **Max 5 parameters** - Use configuration objects instead

### Naming Conventions
- **Functions**: `camelCase` (e.g., `buildAnalysisPrompt`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `HTML_WEBSITE_SYSTEM_PROMPT`)
- **Interfaces**: `PascalCase` (e.g., `AnalysisContext`)
- **Files**: `camelCase.ts` or `PascalCase.tsx` for components

### Comments
```typescript
/**
 * Generate request analysis prompt
 * 
 * @param request - User's input request
 * @param requestType - Type of request (generation/modification/meta)
 * @param context - Additional context for analysis
 * @returns Formatted prompt string for AI
 */
export function buildAnalysisPrompt(
  request: string, 
  requestType: string, 
  context: AnalysisContext
): string {
  // Implementation
}
```

### Error Messages
- **User-facing**: Clear, actionable, non-technical
- **Logs**: Detailed, with stack traces and context
- **Never expose**: API keys, credentials, internal paths

---

## 🔍 Automated Checks

### ESLint Rules (To Be Implemented)
```json
{
  "rules": {
    "max-len": ["error", { 
      "code": 150, 
      "ignoreUrls": true,
      "ignoreStrings": false 
    }],
    "max-lines-per-function": ["warn", { "max": 100 }],
    "max-lines": ["warn", { "max": 500 }]
  }
}
```

### Pre-commit Hooks
- Check for single-line strings > 150 chars
- Validate className length in TSX files
- Ensure no hardcoded credentials

---

## 📦 Template Extraction Pattern

When you find yourself writing long strings:

1. **Identify the pattern** (prompt, HTML, config, etc.)
2. **Create a template function** in appropriate file
3. **Add to exports** for reusability
4. **Update imports** in consumer files
5. **Document the template** with JSDoc

**Location Guide:**
- AI Prompts → `supabase/functions/_shared/promptTemplates.ts`
- HTML Templates → `supabase/functions/_shared/htmlTemplates.ts` (create if needed)
- UI Variants → Component file using `cva()`
- Config Templates → `supabase/functions/_shared/configTemplates.ts` (create if needed)

---

## 🎯 Enforcement

**Before committing code, ask:**
1. ✅ Are all strings < 150 characters OR multi-line?
2. ✅ Are all className attributes < 100 characters OR using `cva()`?
3. ✅ Are all functions < 100 lines?
4. ✅ Are all files < 500 lines?
5. ✅ Are complex prompts/templates extracted to shared files?

**If ANY answer is NO, refactor before committing.**

---

## 📚 Related Documentation
- [MEGA_MIND_ARCHITECTURE.md](./MEGA_MIND_ARCHITECTURE.md) - System architecture
- [SELF_HEALING_SYSTEM.md](./SELF_HEALING_SYSTEM.md) - Auto-fix patterns
- [PHASE_REVIEW.md](./PHASE_REVIEW.md) - Implementation status
