/**
 * Framework Builder Interface - Enterprise-level abstraction
 * 
 * Defines the contract all framework builders must implement.
 * Ensures consistent generation pipeline across all frameworks.
 */

export interface GeneratedCode {
  files: Array<{
    path: string;
    content: string;
    language: string;
    imports: string[];
  }>;
  description: string;
  framework: string;
}

export interface BuildContext {
  request: string;
  analysis: any;
  projectId?: string | null;
  userId: string;
  conversationId: string;
  platformSupabase: any;
  userSupabase?: any;
  broadcast: (event: string, data: any) => Promise<void>;
}

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Base interface for all framework builders
 */
export interface IFrameworkBuilder {
  /**
   * Returns the framework name this builder handles
   */
  getFrameworkName(): string;

  /**
   * Analyze the request and determine build strategy
   */
  analyzeRequest(context: BuildContext): Promise<any>;

  /**
   * Plan the generation - what files, structure, approach
   */
  planGeneration(context: BuildContext, analysis: any): Promise<any>;

  /**
   * Generate all files for the project
   */
  generateFiles(context: BuildContext, plan: any): Promise<GeneratedCode>;

  /**
   * Validate generated files (framework-specific validation)
   */
  validateFiles(files: GeneratedCode['files']): Promise<ValidationResult>;

  /**
   * Package output for storage
   */
  packageOutput(generatedCode: GeneratedCode): Promise<string>;
}
