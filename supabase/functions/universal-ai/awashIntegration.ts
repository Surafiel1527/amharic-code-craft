/**
 * Awash Platform Integration for AI
 * Injects platform awareness into AI requests
 */

// Platform context interfaces (mirrored from frontend)
interface AwashFile {
  path: string;
  type: 'component' | 'hook' | 'service' | 'util' | 'config' | 'style' | 'other';
  language: 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'json' | 'other';
  size: number;
}

interface AwashWorkspaceState {
  fileTree: AwashFile[];
  totalFiles: number;
  filesByType: Record<string, number>;
  projectId?: string;
  projectName?: string;
  framework: string;
  buildTool: string;
  currentRoute: string;
  previewAvailable: boolean;
  recentErrors: Array<{ message: string; file?: string; timestamp: string }>;
  installedPackages: string[];
  hasBackend: boolean;
  hasAuth: boolean;
  hasDatabase: boolean;
}

interface AwashPlatformContext {
  workspace: AwashWorkspaceState;
  timestamp: string;
  conversationId?: string;
  userId?: string;
}

/**
 * Build Awash-aware system prompt
 */
export function buildAwashSystemPrompt(
  context: AwashPlatformContext | null,
  taskType: 'generation' | 'debugging' | 'refactoring' | 'explanation' = 'generation'
): string {
  const basePrompt = `# You are the Awash AI Code Generation Assistant

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

  if (!context || !context.workspace) {
    return basePrompt;
  }

  const { workspace } = context;

  const workspaceInfo = `

# Current Awash Workspace State

## Project: ${workspace.projectName || 'Awash Project'}
- Framework: ${workspace.framework.toUpperCase()}
- Build Tool: ${workspace.buildTool}
- Total Files: ${workspace.totalFiles}
- Current Route: ${workspace.currentRoute}
- Preview: ${workspace.previewAvailable ? 'Available' : 'Not Available'}

## Existing Files
${workspace.fileTree.slice(0, 30).map(f => `- ${f.path} (${f.language})`).join('\n')}
${workspace.totalFiles > 30 ? `... and ${workspace.totalFiles - 30} more files` : ''}

**File Distribution:**
${Object.entries(workspace.filesByType).map(([type, count]) => `- ${type}: ${count} files`).join('\n')}

## Installed Packages
${workspace.installedPackages.slice(0, 15).join(', ')}
${workspace.installedPackages.length > 15 ? `... and ${workspace.installedPackages.length - 15} more` : ''}

## Platform Capabilities
- Backend: ${workspace.hasBackend ? '✅ Lovable Cloud (Supabase)' : '❌ Not configured'}
- Authentication: ${workspace.hasAuth ? '✅ Available' : '❌ Not configured'}
- Database: ${workspace.hasDatabase ? '✅ PostgreSQL via Supabase' : '❌ Not configured'}`;

  const taskGuidance = {
    generation: `

## Code Generation Guidelines
1. **File Placement**: Store components in src/components/, hooks in src/hooks/, services in src/services/
2. **Imports**: Use existing packages when possible - check the installed packages list above
3. **Routing**: If creating new pages, ensure they're added to the routing configuration
4. **Preview**: Generated code must render correctly in the Awash preview
5. **Backend**: Use Supabase client from @/integrations/supabase/client for database operations
6. **Styling**: Use Tailwind CSS with the existing design system tokens`,

    debugging: `

## Debugging Guidelines
1. **Context**: Review the file tree to locate the issue
2. **Errors**: Analyze recent errors to understand the problem
3. **Fix Strategy**: Make surgical changes - don't rewrite entire files
4. **Validation**: Ensure fixes work with existing code
5. **Imports**: Verify all imports match actual file paths`,

    refactoring: `

## Refactoring Guidelines
1. **Preserve Functionality**: Code must work exactly the same after refactoring
2. **File Structure**: Respect the existing architecture patterns
3. **Dependencies**: Don't add new packages unless absolutely necessary
4. **Testing**: Ensure changes don't break existing features
5. **Documentation**: Update comments if logic changes`,

    explanation: `

## Explanation Guidelines
1. **Context**: Reference specific files from the workspace
2. **Accuracy**: Base explanations on actual code, not assumptions
3. **Examples**: Use code from the existing project when possible
4. **Practicality**: Provide actionable information`
  };

  const outputFormat = `

## Output Format
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

  return basePrompt + workspaceInfo + taskGuidance[taskType] + outputFormat;
}

/**
 * Extract Awash context from request
 */
export function extractAwashContext(requestBody: any): AwashPlatformContext | null {
  try {
    if (requestBody.awashContext) {
      return requestBody.awashContext as AwashPlatformContext;
    }
    return null;
  } catch (error) {
    console.error('Failed to extract Awash context:', error);
    return null;
  }
}
