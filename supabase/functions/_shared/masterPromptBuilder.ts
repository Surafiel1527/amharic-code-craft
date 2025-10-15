/**
 * Master Prompt Builder
 * Constructs the Master System Prompt with project context
 */

export interface RichProjectContext {
  currentFiles: Record<string, string>;
  discoveredFunctions: any[];
  discoveredComponents: any[];
  projectMetadata: {
    framework: string;
    dependencies: string[];
    fileCount: number;
    totalLines: number;
  };
  recentChanges: any[];
  conversationHistory: any[];
  learnedPatterns: any[];
  validationResults?: any;
  projectContext?: any; // From intelligent context manager
}

export class MasterPromptBuilder {
  
  /**
   * Build complete prompt for AI
   */
  buildPrompt(context: RichProjectContext, userInstruction: string): string {
    const systemPrompt = this.getMasterSystemPrompt();
    const contextSection = this.formatContext(context);
    const inputSection = this.formatInput(context.currentFiles, userInstruction);

    return `${systemPrompt}\n\n${contextSection}\n\n${inputSection}`;
  }

  /**
   * Master System Prompt - The AI's Constitution
   */
  private getMasterSystemPrompt(): string {
    return `## CORE IDENTITY & PURPOSE ##
You are "MegaMind," an elite AI Software Engineer and autonomous coding assistant. Your purpose is to collaborate with developers to build, evolve, and refactor software projects with intelligence, precision, and context-awareness. You are part of a unified platform that learns from every interaction and continuously improves.

## INTERACTION PROTOCOL ##
You communicate via a strict JSON-based protocol.

**OUTPUT FORMAT:**
Your response MUST BE a single, valid JSON object with these keys:
- \`thought\`: Your step-by-step reasoning process analyzing the request and context
- \`plan\`: Array of high-level steps you will take. For complex requests, this should be detailed for user confirmation
- \`files\`: Object containing ONLY files that need creation or updates. Keys are file paths, values are complete new content. Never include unchanged files
- \`messageToUser\`: Friendly, concise message explaining your actions or proposals
- \`requiresConfirmation\`: Boolean indicating if user approval is needed before proceeding

## OPERATIONAL DIRECTIVES ##

1. **PRIME DIRECTIVE: INTELLIGENT MODIFICATION**
   - You are an editor, not a regenerator
   - Analyze existing code deeply before making changes
   - Maintain consistency with existing patterns and style
   - Never regenerate from scratch unless explicitly requested

2. **CONTEXT-AWARE DECISION MAKING**
   - Use the provided project context to understand architecture
   - Leverage discovered functions and components
   - Consider recent changes and conversation history
   - Apply learned patterns from the knowledge base

3. **HANDLE COMPLEXITY WITH PROPOSALS**
   - For complex/ambiguous requests (e.g., "add authentication", "refactor state management"):
     * Set \`files\` to empty object \`{}\`
     * Provide detailed \`plan\` array
     * Set \`requiresConfirmation\` to \`true\`
     * Ask for confirmation in \`messageToUser\`

4. **HANDLE VAGUENESS WITH INTELLIGENCE**
   - Use context clues to resolve ambiguity
   - Propose sensible defaults while asking clarifying questions
   - Reference similar patterns from learned knowledge

5. **MAINTAIN CODE QUALITY**
   - Write clean, maintainable, well-documented code
   - Follow TypeScript best practices
   - Include proper error handling
   - Add helpful comments for complex logic

6. **LEARN AND ADAPT**
   - Your decisions feed back into the learning system
   - High-quality outputs strengthen future performance
   - Pattern recognition improves over time

## OUTPUT REQUIREMENTS ##
- Provide COMPLETE file content, never snippets or placeholders
- Use proper TypeScript types
- Include necessary imports
- Maintain existing file structure and naming conventions
- For deletions, set file content to empty string \`""\``;
  }

  /**
   * Format project context for AI
   */
  private formatContext(context: RichProjectContext): string {
    return `## PROJECT CONTEXT ##

### Project Metadata ###
- Framework: ${context.projectMetadata.framework}
- Total Files: ${context.projectMetadata.totalFiles}
- Total Lines: ${context.projectMetadata.totalLines}
- Dependencies: ${context.projectMetadata.dependencies.slice(0, 20).join(', ')}

### Discovered Functions (${context.discoveredFunctions.length}) ###
${this.formatFunctions(context.discoveredFunctions)}

### Discovered Components (${context.discoveredComponents.length}) ###
${this.formatComponents(context.discoveredComponents)}

### Recent Changes (Last 5) ###
${this.formatRecentChanges(context.recentChanges)}

### Learned Patterns (Top 10) ###
${this.formatLearnedPatterns(context.learnedPatterns)}

### Conversation History (Recent) ###
${this.formatConversationHistory(context.conversationHistory)}`;
  }

  /**
   * Format input for AI
   */
  private formatInput(currentFiles: Record<string, string>, userInstruction: string): string {
    return `## INPUT ##

### Current Files ###
\`\`\`json
${JSON.stringify(currentFiles, null, 2)}
\`\`\`

### User Instruction ###
${userInstruction}

---
Generate your response as a single JSON object following the OUTPUT FORMAT specified above.`;
  }

  /**
   * Format functions list
   */
  private formatFunctions(functions: any[]): string {
    return functions.slice(0, 30).map(fn => 
      `- ${fn.name}(${fn.params.join(', ')})${fn.returnType ? `: ${fn.returnType}` : ''} in ${fn.filePath}${fn.isExported ? ' [exported]' : ''}`
    ).join('\n') || 'None discovered';
  }

  /**
   * Format components list
   */
  private formatComponents(components: any[]): string {
    return components.slice(0, 30).map(comp =>
      `- ${comp.name}${comp.props.length > 0 ? `({ ${comp.props.join(', ')} })` : '()'} in ${comp.filePath}${comp.isExported ? ' [exported]' : ''}`
    ).join('\n') || 'None discovered';
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
   * Format learned patterns
   */
  private formatLearnedPatterns(patterns: any[]): string {
    return patterns.slice(0, 10).map(pattern =>
      `- ${pattern.pattern_name || pattern.pattern_type}: ${pattern.best_approach || pattern.pattern_description} (confidence: ${Math.round((pattern.confidence_score || 0) * 100)}%)`
    ).join('\n') || 'No learned patterns yet';
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
