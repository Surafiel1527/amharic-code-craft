/**
 * Response Parser
 * Parses and validates AI responses
 */

export interface ParsedAIResponse {
  thought: string;
  plan: string[];
  files: Record<string, string>;
  messageToUser: string;
  requiresConfirmation: boolean;
}

// Surgical editing response
export interface LineEdit {
  file: string;
  action: 'replace' | 'insert' | 'delete' | 'create';
  startLine?: number;
  endLine?: number;
  insertAfterLine?: number;
  content: string;
  description: string;
}

export interface SurgicalResponse {
  thought: string;
  edits: LineEdit[];
  messageToUser: string;
  requiresConfirmation: boolean;
}

export class ResponseParser {
  
  /**
   * Parse AI response (supports both full file and surgical editing formats)
   */
  parse(aiResponse: string, mode: 'full' | 'surgical' = 'full'): ParsedAIResponse | SurgicalResponse {
    if (mode === 'surgical') {
      return this.parseSurgicalResponse(aiResponse);
    }
    return this.parseFullFileResponse(aiResponse);
  }

  /**
   * Parse full file response (legacy mode)
   */
  private parseFullFileResponse(aiResponse: string): ParsedAIResponse {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                     aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                     [null, aiResponse];
    
    const jsonContent = jsonMatch[1] || aiResponse;
    
    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent.trim());
    } catch (error) {
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }

    // Validate required fields
    this.validateResponse(parsed);

    // Check for placeholders in code
    this.checkForPlaceholders(parsed.files);

    return {
      thought: parsed.thought,
      plan: parsed.plan || [],
      files: parsed.files || {},
      messageToUser: parsed.messageToUser,
      requiresConfirmation: parsed.requiresConfirmation || false
    };
  }

  /**
   * Validate response structure
   */
  private validateResponse(response: any): void {
    const required = ['thought', 'messageToUser'];
    
    for (const field of required) {
      if (!response[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (response.files && typeof response.files !== 'object') {
      throw new Error('files must be an object');
    }

    if (response.plan && !Array.isArray(response.plan)) {
      throw new Error('plan must be an array');
    }
  }

  /**
   * Check for incomplete code placeholders
   */
  private checkForPlaceholders(files: Record<string, string>): void {
    const placeholderPatterns = [
      /\/\/ \.\.\./,
      /\/\/ rest of/i,
      /\/\/ existing code/i,
      /\/\/ unchanged/i,
      /\.\.\./
    ];

    for (const [path, content] of Object.entries(files)) {
      for (const pattern of placeholderPatterns) {
        if (pattern.test(content)) {
          throw new Error(
            `File ${path} contains incomplete code with placeholders. AI must provide complete file content.`
          );
        }
      }
    }
  }

  /**
   * Extract thinking steps from response
   */
  /**
   * Parse surgical editing response
   */
  private parseSurgicalResponse(aiResponse: string): SurgicalResponse {
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                     aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                     [null, aiResponse];
    
    const jsonContent = jsonMatch[1] || aiResponse;
    
    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent.trim());
    } catch (error) {
      throw new Error(`Failed to parse surgical AI response as JSON: ${error.message}`);
    }

    // Validate surgical response structure
    this.validateSurgicalResponse(parsed);

    return {
      thought: parsed.thought,
      edits: parsed.edits || [],
      messageToUser: parsed.messageToUser,
      requiresConfirmation: parsed.requiresConfirmation || false
    };
  }

  /**
   * Validate surgical response structure
   */
  private validateSurgicalResponse(response: any): void {
    const required = ['thought', 'messageToUser', 'edits'];
    
    for (const field of required) {
      if (!response[field]) {
        throw new Error(`Missing required field in surgical response: ${field}`);
      }
    }

    if (!Array.isArray(response.edits)) {
      throw new Error('edits must be an array');
    }

    // Validate each edit
    for (let i = 0; i < response.edits.length; i++) {
      const edit = response.edits[i];
      
      if (!edit.file || !edit.action || !edit.description) {
        throw new Error(`Edit ${i} missing required fields: file, action, or description`);
      }

      const validActions = ['replace', 'insert', 'delete', 'create'];
      if (!validActions.includes(edit.action)) {
        throw new Error(`Edit ${i} has invalid action: ${edit.action}`);
      }

      // Validate action-specific requirements
      if (edit.action === 'replace' || edit.action === 'delete') {
        if (edit.startLine === undefined || edit.endLine === undefined) {
          throw new Error(`Edit ${i} with action ${edit.action} requires startLine and endLine`);
        }
      }

      if (edit.action === 'insert') {
        if (edit.insertAfterLine === undefined) {
          throw new Error(`Edit ${i} with action insert requires insertAfterLine`);
        }
      }

      if ((edit.action === 'replace' || edit.action === 'insert' || edit.action === 'create') && !edit.content) {
        throw new Error(`Edit ${i} with action ${edit.action} requires content`);
      }
    }
  }

  /**
   * Extract thinking steps from response
   */
  extractThinkingSteps(thought: string): string[] {
    const steps = thought
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
    
    return steps;
  }
}
