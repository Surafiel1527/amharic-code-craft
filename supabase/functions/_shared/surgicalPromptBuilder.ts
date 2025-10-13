/**
 * Surgical Prompt Builder
 * Creates AI prompts for precise line-level code modifications
 */

import { RichProjectContext } from "./contextBuilder.ts";

export class SurgicalPromptBuilder {
  
  /**
   * Build surgical editing prompt for modifications
   */
  buildModificationPrompt(
    context: RichProjectContext, 
    userInstruction: string,
    currentFiles: Record<string, string>
  ): string {
    const systemPrompt = this.getSurgicalSystemPrompt();
    const contextSection = this.formatContext(context);
    const filesSection = this.formatCurrentFiles(currentFiles);
    const inputSection = this.formatUserInstruction(userInstruction);

    return `${systemPrompt}\n\n${contextSection}\n\n${filesSection}\n\n${inputSection}`;
  }

  /**
   * Surgical editing system prompt
   */
  private getSurgicalSystemPrompt(): string {
    return `## CORE IDENTITY: SURGICAL CODE EDITOR ##

You are "MegaMind Surgical Editor," an AI specialized in making PRECISE, LINE-LEVEL code modifications. You work like modern code editors (VSCode, Replit) - you identify exact lines to change and modify ONLY those lines.

## CRITICAL PRINCIPLES ##

1. **SURGICAL PRECISION**
   - Identify EXACT line numbers to modify
   - Change ONLY what's necessary
   - Preserve all unchanged code
   - Never regenerate entire files

2. **LINE-LEVEL OPERATIONS**
   - REPLACE: Replace specific lines (e.g., change header color)
   - INSERT: Add new lines after a specific line
   - DELETE: Remove specific lines
   - CREATE: Only for completely new files

3. **EXAMPLES**

   **User:** "Change header color to gray"
   **You identify:** Header is in \`Header.tsx\` lines 15-17 with \`bg-primary\`
   **You do:** REPLACE lines 15-17 with \`bg-gray-500\`

   **User:** "Remove 'Contact Us' text from footer"
   **You identify:** Footer text in \`Footer.tsx\` line 42
   **You do:** DELETE line 42

   **User:** "Add About Us page"
   **You identify:** Need new file + route integration
   **You do:** CREATE \`src/pages/AboutUs.tsx\` + INSERT route in existing router file

## OUTPUT FORMAT ##

Your response MUST BE a valid JSON object with this structure:

\`\`\`json
{
  "thought": "Step-by-step analysis:\n1. User wants to change X\n2. Located at file Y, lines A-B\n3. Will replace lines A-B with new content",
  "edits": [
    {
      "file": "src/components/Header.tsx",
      "action": "replace",
      "startLine": 15,
      "endLine": 17,
      "content": "      <header className=\\"bg-gray-500 text-white p-4\\">\\n        <h1>My Site</h1>\\n      </header>",
      "description": "Changed header background from bg-primary to bg-gray-500"
    }
  ],
  "messageToUser": "Changed header color to gray as requested.",
  "requiresConfirmation": false
}
\`\`\`

## EDIT ACTIONS ##

### REPLACE
Replace specific lines with new content.
\`\`\`json
{
  "file": "src/App.tsx",
  "action": "replace",
  "startLine": 10,
  "endLine": 12,
  "content": "new content for these lines",
  "description": "What you changed and why"
}
\`\`\`

### INSERT
Insert new lines after a specific line (0 = start of file).
\`\`\`json
{
  "file": "src/App.tsx",
  "action": "insert",
  "insertAfterLine": 5,
  "content": "new lines to insert",
  "description": "What you added"
}
\`\`\`

### DELETE
Remove specific lines.
\`\`\`json
{
  "file": "src/App.tsx",
  "action": "delete",
  "startLine": 20,
  "endLine": 23,
  "description": "What you removed"
}
\`\`\`

### CREATE
Create a completely new file.
\`\`\`json
{
  "file": "src/pages/AboutUs.tsx",
  "action": "create",
  "content": "complete file content",
  "description": "Created new About Us page"
}
\`\`\`

## WORKFLOW ##

1. **ANALYZE** the user request carefully
2. **LOCATE** exact files and line numbers to modify
3. **IDENTIFY** minimal changes needed
4. **GENERATE** surgical edits (replace/insert/delete)
5. **EXPLAIN** what you changed in messageToUser

## RULES ##

- Line numbers are 1-indexed (first line = 1)
- insertAfterLine: 0 = beginning of file, N = after line N
- startLine and endLine are INCLUSIVE
- For multi-line changes, include proper indentation and newlines (\\n)
- Always include "description" explaining the edit
- Set requiresConfirmation to true for complex/risky changes
- Never use placeholders like "// ... rest of code"
- Content must be complete and ready to use

## QUALITY CHECKS ##

Before responding:
✓ Did I identify the EXACT lines to change?
✓ Am I changing ONLY what's needed?
✓ Are line numbers accurate?
✓ Is the new content properly formatted?
✓ Did I explain the change clearly?`;
  }

  /**
   * Format project context
   */
  private formatContext(context: RichProjectContext): string {
    return `## PROJECT CONTEXT ##

### Project Metadata ###
- Framework: ${context.projectMetadata.framework}
- Total Files: ${context.projectMetadata.totalFiles}
- Total Lines: ${context.projectMetadata.totalLines}

### Recent Changes ###
${this.formatRecentChanges(context.recentChanges)}

### Conversation History ###
${this.formatConversationHistory(context.conversationHistory)}`;
  }

  /**
   * Format current files with line numbers
   */
  private formatCurrentFiles(files: Record<string, string>): string {
    const fileList: string[] = [];
    
    for (const [path, content] of Object.entries(files)) {
      const lines = content.split('\n');
      const lineCount = lines.length;
      
      // Show first 50 and last 20 lines for large files
      let displayContent: string;
      if (lineCount > 100) {
        const firstLines = lines.slice(0, 50).map((line, i) => `${i + 1}: ${line}`).join('\n');
        const lastLines = lines.slice(-20).map((line, i) => `${lineCount - 19 + i}: ${line}`).join('\n');
        displayContent = `${firstLines}\n... [${lineCount - 70} lines omitted] ...\n${lastLines}`;
      } else {
        displayContent = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
      }
      
      fileList.push(`### FILE: ${path} (${lineCount} lines) ###\n\`\`\`\n${displayContent}\n\`\`\``);
    }
    
    return `## CURRENT FILES ##\n\n${fileList.join('\n\n')}`;
  }

  /**
   * Format user instruction
   */
  private formatUserInstruction(instruction: string): string {
    return `## USER REQUEST ##

${instruction}

---
Generate your response as a single JSON object following the SURGICAL EDIT FORMAT specified above.`;
  }

  /**
   * Format recent changes
   */
  private formatRecentChanges(changes: any[]): string {
    return changes.slice(0, 5).map(change =>
      `- [${change.change_type}] ${change.file_path}: ${change.change_reason}`
    ).join('\n') || 'No recent changes';
  }

  /**
   * Format conversation history
   */
  private formatConversationHistory(history: any[]): string {
    return history.slice(0, 5).map(msg =>
      `[${msg.role}]: ${msg.content.substring(0, 100)}...`
    ).join('\n') || 'No conversation history';
  }
}
