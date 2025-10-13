# Phase 5: Practical Implementation Guide

**How to Actually Access Files, Functions, and Make It Work**

---

## 🎯 The Core Challenge

The Master System Prompt needs:
1. **Real file contents** - Not mock data, actual project files
2. **Function discovery** - What functions/components exist
3. **Context awareness** - Current state, recent changes
4. **Change application** - Actually modify the real files

---

## 🏗️ Architecture Overview

```
User Request
    ↓
[1] Project State Capture (VFS reads actual files)
    ↓
[2] Context Builder (enriches with metadata)
    ↓
[3] Master Prompt Constructor (formats for AI)
    ↓
[4] AI Processing (Lovable AI with structured prompt)
    ↓
[5] Response Parser (extracts structured output)
    ↓
[6] Change Applicator (writes to actual files)
    ↓
[7] Verification (checks syntax, runs tests)
    ↓
Response to User
```

---

## 📁 Step 1: Virtual File System - Accessing Real Files

### **Problem:** How do we read actual project files?

### **Solution:** Browser FileSystem API + Supabase Storage

```typescript
// supabase/functions/_shared/virtualFileSystem.ts

export interface ProjectFile {
  path: string;
  content: string;
  size: number;
  lastModified: Date;
  language: string;
}

export class VirtualFileSystem {
  /**
   * Reads actual project files from the user's workspace
   * In browser: Uses FileSystem API
   * In backend: Uses Supabase Storage
   */
  async captureProjectState(projectId: string, userId: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    // Get project metadata
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (!project) throw new Error('Project not found');
    
    // Strategy 1: If project files are stored in our database
    const { data: storedFiles } = await supabase
      .from('project_files')
      .select('file_path, content')
      .eq('project_id', projectId);
    
    if (storedFiles) {
      for (const file of storedFiles) {
        files[file.file_path] = file.content;
      }
    }
    
    // Strategy 2: If project files are in Supabase Storage
    const { data: storageFiles } = await supabase
      .storage
      .from('project-files')
      .list(`${userId}/${projectId}`);
    
    if (storageFiles) {
      for (const file of storageFiles) {
        const { data } = await supabase
          .storage
          .from('project-files')
          .download(`${userId}/${projectId}/${file.name}`);
        
        if (data) {
          const content = await data.text();
          files[file.name] = content;
        }
      }
    }
    
    // Strategy 3: Parse from project.html_code (current approach)
    if (project.html_code) {
      const parsedFiles = this.parseGeneratedCode(project.html_code);
      Object.assign(files, parsedFiles);
    }
    
    return files;
  }
  
  /**
   * Parse multi-file code structure from generated HTML
   */
  private parseGeneratedCode(htmlCode: string): Record<string, string> {
    const files: Record<string, string> = {};
    
    // Extract React components from index.html
    // Look for script tags with src attributes or inline code
    const componentRegex = /\/\/ File: (.+?)\n([\s\S]+?)(?=\/\/ File:|$)/g;
    let match;
    
    while ((match = componentRegex.exec(htmlCode)) !== null) {
      const [, filePath, content] = match;
      files[filePath.trim()] = content.trim();
    }
    
    // If no file markers, treat as single index.html
    if (Object.keys(files).length === 0) {
      files['index.html'] = htmlCode;
    }
    
    return files;
  }
  
  /**
   * Apply changes to actual project files
   */
  async applyChanges(
    projectId: string,
    userId: string,
    changes: Record<string, string>
  ): Promise<void> {
    // Update database
    for (const [filePath, content] of Object.entries(changes)) {
      await supabase
        .from('project_files')
        .upsert({
          project_id: projectId,
          user_id: userId,
          file_path: filePath,
          content,
          updated_at: new Date().toISOString()
        });
    }
    
    // Update main project record
    const { data: existingFiles } = await supabase
      .from('project_files')
      .select('file_path, content')
      .eq('project_id', projectId);
    
    const allFiles = existingFiles || [];
    const reconstructedCode = this.reconstructCode(allFiles);
    
    await supabase
      .from('projects')
      .update({ 
        html_code: reconstructedCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);
  }
  
  /**
   * Reconstruct single HTML from multiple files (for backwards compatibility)
   */
  private reconstructCode(files: { file_path: string; content: string }[]): string {
    let reconstructed = '';
    
    for (const file of files) {
      reconstructed += `// File: ${file.file_path}\n`;
      reconstructed += file.content;
      reconstructed += '\n\n';
    }
    
    return reconstructed;
  }
}
```

---

## 🔍 Step 2: Function & Component Discovery

### **Problem:** How do we know what functions exist?

### **Solution:** Enhanced Codebase Analyzer

```typescript
// supabase/functions/_shared/enhancedCodebaseAnalyzer.ts

export interface DiscoveredFunction {
  name: string;
  filePath: string;
  params: string[];
  returnType: string;
  isExported: boolean;
  documentation?: string;
}

export interface DiscoveredComponent {
  name: string;
  filePath: string;
  props: Record<string, string>;
  isDefault: boolean;
}

export class EnhancedCodebaseAnalyzer {
  /**
   * Discover all functions in the codebase
   */
  async discoverFunctions(files: Record<string, string>): Promise<DiscoveredFunction[]> {
    const functions: DiscoveredFunction[] = [];
    
    for (const [filePath, content] of Object.entries(files)) {
      // Skip non-code files
      if (!this.isCodeFile(filePath)) continue;
      
      // Regex to find function declarations
      const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g;
      let match;
      
      while ((match = functionRegex.exec(content)) !== null) {
        const [, name, paramsStr, returnType] = match;
        const params = paramsStr.split(',').map(p => p.trim()).filter(Boolean);
        
        functions.push({
          name,
          filePath,
          params,
          returnType: returnType || 'void',
          isExported: content.includes(`export function ${name}`) || 
                      content.includes(`export { ${name}`),
          documentation: this.extractJSDoc(content, name)
        });
      }
      
      // Also find arrow functions
      const arrowRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
      while ((match = arrowRegex.exec(content)) !== null) {
        const [, name] = match;
        functions.push({
          name,
          filePath,
          params: [],
          returnType: 'unknown',
          isExported: content.includes(`export const ${name}`)
        });
      }
    }
    
    return functions;
  }
  
  /**
   * Discover all React components
   */
  async discoverComponents(files: Record<string, string>): Promise<DiscoveredComponent[]> {
    const components: DiscoveredComponent[] = [];
    
    for (const [filePath, content] of Object.entries(files)) {
      // Look for React component patterns
      const componentRegex = /(?:export\s+(?:default\s+)?)?function\s+(\w+)\s*\(\s*(?:{([^}]+)}|(\w+))?\s*\)/g;
      let match;
      
      while ((match = componentRegex.exec(content)) !== null) {
        const [, name, destructuredProps, singleProp] = match;
        
        // Check if it returns JSX (has return with < or direct <)
        const functionBody = content.substring(match.index);
        const hasJSX = functionBody.includes('return (') && functionBody.includes('<');
        
        if (hasJSX) {
          const props: Record<string, string> = {};
          
          if (destructuredProps) {
            // Parse destructured props: { prop1, prop2: Type, prop3 = default }
            const propList = destructuredProps.split(',').map(p => p.trim());
            for (const prop of propList) {
              const [propName] = prop.split(':')[0].split('=')[0].trim().split(' ');
              props[propName] = 'any'; // Would need TypeScript AST for exact types
            }
          } else if (singleProp) {
            props[singleProp] = 'any';
          }
          
          components.push({
            name,
            filePath,
            props,
            isDefault: content.includes(`export default ${name}`)
          });
        }
      }
    }
    
    return components;
  }
  
  /**
   * Extract JSDoc comments
   */
  private extractJSDoc(content: string, functionName: string): string | undefined {
    const regex = new RegExp(`/\\*\\*([^*]|\\*(?!/))*\\*/\\s*(?:export\\s+)?function\\s+${functionName}`, 'g');
    const match = regex.exec(content);
    
    if (match) {
      return match[0].replace(/\/\*\*|\*\/|\*/g, '').trim();
    }
    
    return undefined;
  }
  
  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    return codeExtensions.some(ext => filePath.endsWith(ext));
  }
}
```

---

## 🧩 Step 3: Context Builder - Enriching the State

### **Problem:** AI needs more than just files

### **Solution:** Rich Context Object

```typescript
// supabase/functions/_shared/contextBuilder.ts

export interface RichProjectContext {
  // Core files
  files: Record<string, string>;
  
  // Discovered elements
  functions: DiscoveredFunction[];
  components: DiscoveredComponent[];
  dependencies: string[];
  
  // Project metadata
  framework: string;
  language: string;
  buildTool: string;
  
  // Recent history
  recentChanges: FileChange[];
  lastConversation: Message[];
  
  // Learned patterns
  relevantPatterns: Pattern[];
  
  // Current state
  errors: string[];
  warnings: string[];
}

export class ContextBuilder {
  async buildRichContext(
    projectId: string,
    userId: string,
    userInstruction: string
  ): Promise<RichProjectContext> {
    const vfs = new VirtualFileSystem();
    const analyzer = new EnhancedCodebaseAnalyzer();
    
    // 1. Capture current files
    const files = await vfs.captureProjectState(projectId, userId);
    
    // 2. Discover functions and components
    const functions = await analyzer.discoverFunctions(files);
    const components = await analyzer.discoverComponents(files);
    
    // 3. Detect framework and dependencies
    const packageJson = files['package.json'] 
      ? JSON.parse(files['package.json']) 
      : { dependencies: {} };
    
    const framework = this.detectFramework(files, packageJson);
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    // 4. Get recent changes from our file_changes table
    const { data: recentChanges } = await supabase
      .from('file_changes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // 5. Get last conversation for context
    const { data: lastConversation } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // 6. Get relevant learned patterns
    const relevantPatterns = await this.getRelevantPatterns(userInstruction);
    
    // 7. Check for errors/warnings
    const { errors, warnings } = await this.validateCode(files);
    
    return {
      files,
      functions,
      components,
      dependencies,
      framework,
      language: 'typescript', // Detect from files
      buildTool: packageJson.scripts ? 'vite' : 'none',
      recentChanges: recentChanges || [],
      lastConversation: lastConversation || [],
      relevantPatterns,
      errors,
      warnings
    };
  }
  
  private detectFramework(files: Record<string, string>, packageJson: any): string {
    if (packageJson.dependencies?.react) return 'React';
    if (packageJson.dependencies?.vue) return 'Vue';
    if (packageJson.dependencies?.angular) return 'Angular';
    
    // Check file content
    const hasReactImport = Object.values(files).some(
      content => content.includes('import React') || content.includes('from "react"')
    );
    
    return hasReactImport ? 'React' : 'Vanilla';
  }
  
  private async getRelevantPatterns(instruction: string): Promise<Pattern[]> {
    const { data } = await supabase
      .from('learned_patterns')
      .select('*')
      .gt('confidence', 0.7)
      .limit(5);
    
    return data || [];
  }
  
  private async validateCode(files: Record<string, string>): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic syntax validation
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        // Check for unclosed tags
        const openTags = (content.match(/<\w+[^>]*>/g) || []).length;
        const closeTags = (content.match(/<\/\w+>/g) || []).length;
        
        if (openTags !== closeTags) {
          errors.push(`${filePath}: Possibly unclosed JSX tags`);
        }
      }
    }
    
    return { errors, warnings };
  }
}
```

---

## 🤖 Step 4: Master Prompt Construction

### **Problem:** Format everything for AI

### **Solution:** Structured Prompt Builder

```typescript
// supabase/functions/_shared/masterPromptBuilder.ts

export class MasterPromptBuilder {
  buildPrompt(context: RichProjectContext, userInstruction: string): string {
    return `${this.getMasterSystemPrompt()}

## CURRENT PROJECT STATE ##

### Framework & Language ###
Framework: ${context.framework}
Language: ${context.language}
Build Tool: ${context.buildTool}

### Dependencies ###
${context.dependencies.join(', ')}

### Available Components ###
${context.components.map(c => 
  `- ${c.name} (${c.filePath})\n  Props: ${Object.keys(c.props).join(', ')}`
).join('\n')}

### Available Functions ###
${context.functions.map(f => 
  `- ${f.name}(${f.params.join(', ')}): ${f.returnType} (${f.filePath})`
).join('\n')}

### Recent Changes ###
${context.recentChanges.slice(0, 3).map(change => 
  `- ${change.file_path}: ${change.change_type}`
).join('\n')}

### Current Files ###
${JSON.stringify(context.files, null, 2)}

### Learned Patterns (Use These!) ###
${context.relevantPatterns.map(p => 
  `Pattern: ${p.pattern_name} (confidence: ${(p.confidence * 100).toFixed(0)}%)\n${p.pattern_data}`
).join('\n\n')}

### Known Issues ###
Errors: ${context.errors.length > 0 ? context.errors.join(', ') : 'None'}
Warnings: ${context.warnings.length > 0 ? context.warnings.join(', ') : 'None'}

### Recent Conversation ###
${context.lastConversation.map(msg => 
  `${msg.role}: ${msg.content}`
).join('\n')}

## USER INSTRUCTION ##
${userInstruction}

## YOUR RESPONSE (Must be valid JSON) ##
Please respond with a JSON object containing:
- thought: Your reasoning process
- plan: Array of steps
- files: Object with file paths as keys and complete new content as values (only changed files)
- messageToUser: Friendly explanation
- clarificationNeeded: Array of questions (if any)
- complexityLevel: 'simple' | 'moderate' | 'complex'
`;
  }
  
  private getMasterSystemPrompt(): string {
    return `## MASTER SYSTEM PROMPT ##

You are an elite AI Software Engineer integrated into the Lovable platform.

CORE DIRECTIVES:
1. MODIFY, DON'T REGENERATE - Edit existing code, don't rewrite everything
2. USE DISCOVERED FUNCTIONS - Leverage existing functions/components shown above
3. MATCH EXISTING STYLE - Follow the patterns in current files
4. LEARN FROM PATTERNS - Use the high-confidence patterns provided
5. BE EXPLICIT - Provide complete file content, no placeholders
6. ASK IF UNCLEAR - Request clarification for vague instructions
7. PLAN COMPLEX CHANGES - For big tasks, propose a plan first

RESPONSE FORMAT:
You MUST respond with valid JSON only. No markdown, no explanations outside the JSON.`;
  }
}
```

---

## 📤 Step 5: Response Parser & Validator

### **Problem:** Extract structured output from AI

### **Solution:** Robust JSON Parser

```typescript
// supabase/functions/_shared/responseParser.ts

export interface ParsedAIResponse {
  thought: string;
  plan: string[];
  files: Record<string, string>;
  messageToUser: string;
  clarificationNeeded?: string[];
  complexityLevel: 'simple' | 'moderate' | 'complex';
  valid: boolean;
  errors: string[];
}

export class ResponseParser {
  parse(aiResponse: string): ParsedAIResponse {
    const errors: string[] = [];
    
    try {
      // Extract JSON from response (AI might wrap it in markdown)
      const jsonMatch = aiResponse.match(/```json\n([\s\S]+?)\n```/) || 
                       aiResponse.match(/{[\s\S]+}/);
      
      if (!jsonMatch) {
        return this.createErrorResponse('No JSON found in response');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!parsed.thought) errors.push('Missing thought field');
      if (!parsed.plan || !Array.isArray(parsed.plan)) errors.push('Missing or invalid plan');
      if (!parsed.files || typeof parsed.files !== 'object') errors.push('Missing or invalid files');
      if (!parsed.messageToUser) errors.push('Missing messageToUser');
      
      // Validate files are complete (no placeholders)
      for (const [path, content] of Object.entries(parsed.files)) {
        if (typeof content !== 'string') {
          errors.push(`File ${path} has invalid content type`);
        }
        if (content.includes('// ... rest of')) {
          errors.push(`File ${path} contains placeholder comments`);
        }
      }
      
      return {
        thought: parsed.thought || '',
        plan: parsed.plan || [],
        files: parsed.files || {},
        messageToUser: parsed.messageToUser || '',
        clarificationNeeded: parsed.clarificationNeeded,
        complexityLevel: parsed.complexityLevel || 'moderate',
        valid: errors.length === 0,
        errors
      };
      
    } catch (error) {
      return this.createErrorResponse(`JSON parse error: ${error.message}`);
    }
  }
  
  private createErrorResponse(message: string): ParsedAIResponse {
    return {
      thought: '',
      plan: [],
      files: {},
      messageToUser: `Error: ${message}`,
      complexityLevel: 'simple',
      valid: false,
      errors: [message]
    };
  }
}
```

---

## ✅ Step 6: Change Application & Verification

### **Problem:** Apply changes safely

### **Solution:** Validated Change Application

```typescript
// supabase/functions/_shared/changeApplicator.ts

export class ChangeApplicator {
  async applyChanges(
    projectId: string,
    userId: string,
    parsedResponse: ParsedAIResponse
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // 1. Validate syntax before applying
    for (const [filePath, content] of Object.entries(parsedResponse.files)) {
      const validation = await this.validateSyntax(filePath, content);
      if (!validation.valid) {
        errors.push(`Syntax error in ${filePath}: ${validation.error}`);
      }
    }
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    // 2. Create backup
    const vfs = new VirtualFileSystem();
    const currentState = await vfs.captureProjectState(projectId, userId);
    
    await this.createBackup(projectId, currentState);
    
    // 3. Apply changes
    try {
      await vfs.applyChanges(projectId, userId, parsedResponse.files);
      
      // 4. Log changes
      for (const [filePath, newContent] of Object.entries(parsedResponse.files)) {
        await supabase.from('file_changes').insert({
          project_id: projectId,
          user_id: userId,
          file_path: filePath,
          old_content: currentState[filePath] || null,
          new_content: newContent,
          change_type: currentState[filePath] ? 'modify' : 'create',
          reason: parsedResponse.messageToUser
        });
      }
      
      return { success: true, errors: [] };
      
    } catch (error) {
      // Rollback on error
      await vfs.applyChanges(projectId, userId, currentState);
      return { success: false, errors: [error.message] };
    }
  }
  
  private async validateSyntax(filePath: string, content: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Basic validation
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
        return { valid: true };
      } catch (e) {
        return { valid: false, error: e.message };
      }
    }
    
    // For JS/TS, check for obvious syntax errors
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const braceCount = (content.match(/{/g) || []).length - 
                        (content.match(/}/g) || []).length;
      if (braceCount !== 0) {
        return { valid: false, error: 'Unbalanced braces' };
      }
    }
    
    return { valid: true };
  }
  
  private async createBackup(projectId: string, state: Record<string, string>): Promise<void> {
    await supabase.from('project_backups').insert({
      project_id: projectId,
      backup_data: state,
      created_at: new Date().toISOString()
    });
  }
}
```

---

## 🔗 Step 7: Putting It All Together

### **The Complete Edge Function**

```typescript
// supabase/functions/intelligent-code-assistant/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ContextBuilder } from "../_shared/contextBuilder.ts";
import { MasterPromptBuilder } from "../_shared/masterPromptBuilder.ts";
import { ResponseParser } from "../_shared/responseParser.ts";
import { ChangeApplicator } from "../_shared/changeApplicator.ts";
import { ProposalSystem } from "../_shared/proposalSystem.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userInstruction, projectId, userId, sessionId } = await req.json();
    
    console.log('🚀 Starting intelligent code assistant...');
    
    // Step 1: Build rich context
    const contextBuilder = new ContextBuilder();
    const context = await contextBuilder.buildRichContext(projectId, userId, userInstruction);
    
    console.log(`📁 Loaded ${Object.keys(context.files).length} files`);
    console.log(`🔧 Found ${context.functions.length} functions, ${context.components.length} components`);
    
    // Step 2: Construct master prompt
    const promptBuilder = new MasterPromptBuilder();
    const prompt = promptBuilder.buildPrompt(context, userInstruction);
    
    console.log('🧠 Calling AI with enhanced prompt...');
    
    // Step 3: Call AI
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
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });
    
    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0].message.content;
    
    console.log('📤 AI response received');
    
    // Step 4: Parse response
    const parser = new ResponseParser();
    const parsed = parser.parse(aiMessage);
    
    if (!parsed.valid) {
      console.error('❌ Invalid AI response:', parsed.errors);
      return new Response(JSON.stringify({
        error: 'AI response validation failed',
        details: parsed.errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`✅ Parsed: ${parsed.plan.length} steps, ${Object.keys(parsed.files).length} files`);
    
    // Step 5: Handle based on complexity
    if (parsed.complexityLevel === 'complex' || parsed.clarificationNeeded) {
      console.log('📋 Complex task - creating proposal');
      
      const proposalSystem = new ProposalSystem();
      const proposal = await proposalSystem.createProposal(sessionId, {
        plan: parsed.plan,
        files: parsed.files,
        estimatedFiles: Object.keys(parsed.files).length,
        clarifications: parsed.clarificationNeeded
      });
      
      return new Response(JSON.stringify({
        type: 'proposal',
        proposal,
        message: parsed.messageToUser,
        thought: parsed.thought
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Step 6: Apply changes
    console.log('💾 Applying changes...');
    const applicator = new ChangeApplicator();
    const result = await applicator.applyChanges(projectId, userId, parsed);
    
    if (!result.success) {
      console.error('❌ Failed to apply changes:', result.errors);
      return new Response(JSON.stringify({
        error: 'Failed to apply changes',
        details: result.errors
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Changes applied successfully');
    
    // Step 7: Learn from success
    await supabase.from('ai_learning_events').insert({
      user_id: userId,
      project_id: projectId,
      instruction: userInstruction,
      files_changed: Object.keys(parsed.files),
      success: true,
      created_at: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({
      type: 'success',
      files: Object.keys(parsed.files),
      message: parsed.messageToUser,
      thought: parsed.thought,
      plan: parsed.plan
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 🎯 Key Implementation Points

### **1. File Access Strategy**
- **Current:** Projects stored in `projects.html_code` (single field)
- **Phase 5:** Introduce `project_files` table for multi-file tracking
- **Migration:** Parse existing `html_code` into multiple files

### **2. Real-Time Updates**
- AI generates changes
- Backend applies to database
- Frontend polls or subscribes for updates
- Preview iframe refreshes with new code

### **3. Rollback Capability**
- Every change creates a backup in `project_backups`
- User can revert via UI
- Backup includes complete file state

### **4. Performance Optimization**
- Cache discovered functions/components
- Only send changed files to AI
- Compress large contexts
- Use streaming for large responses

---

## 📊 Database Schema Changes

```sql
-- New tables needed

CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  size INTEGER,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, file_path)
);

CREATE TABLE file_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  old_content TEXT,
  new_content TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'create' | 'modify' | 'delete'
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE code_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  plan JSONB NOT NULL,
  files JSONB NOT NULL,
  estimated_files INTEGER,
  clarifications JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  user_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE TABLE project_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  backup_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  instruction TEXT NOT NULL,
  files_changed TEXT[],
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_file_changes_project ON file_changes(project_id);
CREATE INDEX idx_code_proposals_session ON code_proposals(session_id);
```

---

## ✅ Testing the System

```typescript
// Example test call
const response = await fetch('https://your-project.supabase.co/functions/v1/intelligent-code-assistant', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    userInstruction: "Add a loading spinner to the Button component",
    projectId: "project-uuid",
    userId: "user-uuid",
    sessionId: "session-uuid"
  })
});

const result = await response.json();
console.log(result);
// {
//   type: 'success',
//   files: ['src/components/Button.tsx'],
//   message: 'Added loading spinner with animation',
//   thought: 'User wants spinner, will add isLoading prop and conditional rendering',
//   plan: ['Add isLoading prop', 'Add spinner SVG', 'Conditional render']
// }
```

---

## 🎉 Result

You now have:
1. ✅ **Real file access** via VFS
2. ✅ **Function discovery** via analyzer
3. ✅ **Rich context** with metadata
4. ✅ **Structured AI responses** with validation
5. ✅ **Safe change application** with backups
6. ✅ **Proposal system** for complex changes
7. ✅ **Learning events** tracking

The system can now **actually read your files, understand your code, and make intelligent changes** with full context awareness!
