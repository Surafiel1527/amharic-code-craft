/**
 * Awash System Prompt Builder
 * Injects platform awareness into AI requests
 */

import { AwashPlatformContext } from './awashPlatformContext';

export interface AwashSystemPromptOptions {
  includeFileTree?: boolean;
  includeErrors?: boolean;
  includeCapabilities?: boolean;
  taskType?: 'generation' | 'debugging' | 'refactoring' | 'explanation';
}

/**
 * Builds system prompts with Awash platform awareness
 */
export class AwashSystemPromptBuilder {
  private static instance: AwashSystemPromptBuilder;
  
  private constructor() {}
  
  static getInstance(): AwashSystemPromptBuilder {
    if (!this.instance) {
      this.instance = new AwashSystemPromptBuilder();
    }
    return this.instance;
  }
  
  /**
   * Build complete system prompt with platform context
   */
  buildPrompt(
    context: AwashPlatformContext,
    options: AwashSystemPromptOptions = {}
  ): string {
    const {
      includeFileTree = true,
      includeErrors = true,
      includeCapabilities = true,
      taskType = 'generation'
    } = options;
    
    const sections: string[] = [
      this.buildCoreIdentity(),
      this.buildPlatformAwareness(context, {
        includeFileTree,
        includeErrors,
        includeCapabilities
      }),
      this.buildTaskGuidance(taskType),
      this.buildOutputFormat()
    ];
    
    return sections.filter(Boolean).join('\n\n');
  }
  
  /**
   * Core AI identity
   */
  private buildCoreIdentity(): string {
    return `# You are the Awash AI Code Generation Assistant

## Your Identity
You are an intelligent code generation AI working within the Awash platform - a full-stack development environment built on React, Vite, and Lovable Cloud (Supabase).

## Your Mission
Generate complete, production-ready code that:
- Integrates seamlessly with the existing Awash workspace
- Follows enterprise-level best practices
- Is fully functional and tested
- Respects the current file structure and architecture

## Your Capabilities
- Full awareness of the Awash workspace file tree
- Knowledge of installed packages and dependencies
- Understanding of the platform's routing and preview system
- Access to Lovable Cloud backend (Supabase)
- Real-time error detection and correction`;
  }
  
  /**
   * Platform awareness section
   */
  private buildPlatformAwareness(
    context: AwashPlatformContext,
    options: { includeFileTree: boolean; includeErrors: boolean; includeCapabilities: boolean }
  ): string {
    const { workspace } = context;
    const sections: string[] = ['# Current Awash Workspace State'];
    
    // Project info
    sections.push(`## Project: ${workspace.projectName || 'Awash Project'}
- Framework: ${workspace.framework.toUpperCase()}
- Build Tool: ${workspace.buildTool}
- Total Files: ${workspace.totalFiles}
- Current Route: ${workspace.currentRoute}
- Preview: ${workspace.previewAvailable ? 'Available' : 'Not Available'}`);
    
    // File tree
    if (options.includeFileTree && workspace.fileTree.length > 0) {
      sections.push(`## Existing Files
${this.formatFileTree(workspace.fileTree)}

**File Distribution:**
${Object.entries(workspace.filesByType)
  .map(([type, count]) => `- ${type}: ${count} files`)
  .join('\n')}`);
    }
    
    // Installed packages
    if (workspace.installedPackages.length > 0) {
      sections.push(`## Installed Packages
${workspace.installedPackages.slice(0, 15).join(', ')}
${workspace.installedPackages.length > 15 ? `... and ${workspace.installedPackages.length - 15} more` : ''}`);
    }
    
    // Capabilities
    if (options.includeCapabilities) {
      sections.push(`## Platform Capabilities
- Backend: ${workspace.hasBackend ? '✅ Lovable Cloud (Supabase)' : '❌ Not configured'}
- Authentication: ${workspace.hasAuth ? '✅ Available' : '❌ Not configured'}
- Database: ${workspace.hasDatabase ? '✅ PostgreSQL via Supabase' : '❌ Not configured'}`);
    }
    
    // Recent errors
    if (options.includeErrors && workspace.recentErrors.length > 0) {
      sections.push(`## Recent Errors Detected
${workspace.recentErrors.map((err, i) => 
  `${i + 1}. ${err.message}${err.file ? ` (in ${err.file})` : ''}`
).join('\n')}`);
    }
    
    return sections.join('\n\n');
  }
  
  /**
   * Format file tree for display
   */
  private formatFileTree(files: AwashPlatformContext['workspace']['fileTree']): string {
    const tree = files
      .slice(0, 30) // Limit to prevent token overflow
      .map(file => `- ${file.path} (${file.language})`)
      .join('\n');
    
    if (files.length > 30) {
      return `${tree}\n... and ${files.length - 30} more files`;
    }
    
    return tree;
  }
  
  /**
   * Task-specific guidance
   */
  private buildTaskGuidance(taskType: AwashSystemPromptOptions['taskType']): string {
    const guidance: Record<string, string> = {
      generation: `## Code Generation Guidelines
1. **File Placement**: Store components in src/components/, hooks in src/hooks/, services in src/services/
2. **Imports**: Use existing packages when possible - check the installed packages list
3. **Routing**: If creating new pages, ensure they're added to the routing configuration
4. **Preview**: Generated code must render correctly in the Awash preview
5. **Backend**: Use Supabase client from @/integrations/supabase/client for database operations
6. **Styling**: Use Tailwind CSS with the existing design system tokens`,

      debugging: `## Debugging Guidelines
1. **Context**: Review the file tree to locate the issue
2. **Errors**: Analyze recent errors to understand the problem
3. **Fix Strategy**: Make surgical changes - don't rewrite entire files
4. **Validation**: Ensure fixes work with existing code
5. **Imports**: Verify all imports match actual file paths`,

      refactoring: `## Refactoring Guidelines
1. **Preserve Functionality**: Code must work exactly the same after refactoring
2. **File Structure**: Respect the existing architecture patterns
3. **Dependencies**: Don't add new packages unless absolutely necessary
4. **Testing**: Ensure changes don't break existing features
5. **Documentation**: Update comments if logic changes`,

      explanation: `## Explanation Guidelines
1. **Context**: Reference specific files from the workspace
2. **Accuracy**: Base explanations on actual code, not assumptions
3. **Examples**: Use code from the existing project when possible
4. **Practicality**: Provide actionable information`
    };
    
    return guidance[taskType || 'generation'] || guidance.generation;
  }
  
  /**
   * Output format specification
   */
  private buildOutputFormat(): string {
    return `## Output Format
When generating code:
1. Specify the exact file path (e.g., src/components/MyComponent.tsx)
2. Include all necessary imports
3. Generate complete, runnable code
4. Add brief comments for complex logic
5. Ensure code follows TypeScript best practices

When the user says:
- "preview not working" → Check routing, file paths, and imports
- "file X doesn't exist" → Verify against the file tree above
- "it's broken" → Review recent errors and check related files`;
  }
}

// Export singleton
export const awashPrompt = AwashSystemPromptBuilder.getInstance();
