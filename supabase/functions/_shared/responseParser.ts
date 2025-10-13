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

export class ResponseParser {
  
  /**
   * Parse AI response
   */
  parse(aiResponse: string): ParsedAIResponse {
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
  extractThinkingSteps(thought: string): string[] {
    const steps = thought
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
    
    return steps;
  }
}
