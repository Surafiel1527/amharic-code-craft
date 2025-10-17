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
   * Sanitize JSON response to prevent parsing errors from unescaped strings
   */
  private sanitizeJSONResponse(response: string): string {
    // Extract and tokenize code blocks to prevent quote conflicts
    const codeBlocks: string[] = [];
    let sanitized = response.replace(/```[\s\S]*?```/g, (match) => {
      const token = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(match);
      return token;
    });
    
    // Try to parse and re-stringify to normalize
    try {
      const parsed = JSON.parse(sanitized);
      sanitized = JSON.stringify(parsed);
    } catch (e) {
      // If it fails, attempt to fix common issues
      sanitized = sanitized
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    }
    
    // Restore code blocks with proper escaping
    codeBlocks.forEach((block, i) => {
      const token = `__CODE_BLOCK_${i}__`;
      const escaped = block
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      sanitized = sanitized.replace(token, escaped);
    });
    
    return sanitized;
  }

  /**
   * Validate JSON structure before parsing
   */
  private validateJSONStructure(obj: any): boolean {
    // Schema validation for expected response structure
    if (!obj || typeof obj !== 'object') return false;
    
    // Check for required fields
    const hasThought = 'thought' in obj && typeof obj.thought === 'string';
    const hasMessage = 'messageToUser' in obj && typeof obj.messageToUser === 'string';
    
    if (!hasThought || !hasMessage) return false;
    
    // Validate tool calls if present
    if ('tool' in obj) {
      if (obj.tool !== 'code_generator') {
        throw new Error('Invalid tool specified. Must use code_generator for file generation.');
      }
      if (!obj.arguments || typeof obj.arguments !== 'object') {
        throw new Error('Tool arguments must be an object');
      }
    }
    
    return true;
  }

  /**
   * Parse AI response with progressive recovery
   */
  parse(aiResponse: string, mode: 'full' | 'surgical' = 'full'): ParsedAIResponse | SurgicalResponse {
    if (mode === 'surgical') {
      return this.parseSurgicalResponse(aiResponse);
    }
    return this.parseFullFileResponse(aiResponse);
  }

  /**
   * Parse full file response with enhanced error recovery
   */
  private parseFullFileResponse(aiResponse: string): ParsedAIResponse {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                     aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                     [null, aiResponse];
    
    let jsonContent = jsonMatch[1] || aiResponse;
    
    let parsed: any;
    try {
      // First attempt: direct parse
      parsed = JSON.parse(jsonContent.trim());
    } catch (primaryError) {
      try {
        // Second attempt: sanitize then parse
        const sanitized = this.sanitizeJSONResponse(jsonContent);
        parsed = JSON.parse(sanitized);
        console.log('✅ JSON recovered via sanitization');
      } catch (sanitizationError) {
        // Third attempt: incremental parse (extract what we can)
        const partial = this.extractPartialResponse(jsonContent);
        if (partial) {
          console.warn('⚠️ Using partial recovery. Some data may be missing.');
          parsed = partial;
        } else {
          throw new Error(
            `Failed to parse AI response after multiple attempts.\n` +
            `Primary error: ${primaryError.message}\n` +
            `Sanitization error: ${sanitizationError.message}\n` +
            `Response length: ${jsonContent.length} chars`
          );
        }
      }
    }

    // Validate JSON structure
    if (!this.validateJSONStructure(parsed)) {
      throw new Error('Response structure validation failed');
    }

    // Validate required fields
    this.validateResponse(parsed);

    // Check for placeholders in code
    if (parsed.files) {
      this.checkForPlaceholders(parsed.files);
    }

    return {
      thought: parsed.thought,
      plan: parsed.plan || [],
      files: parsed.files || {},
      messageToUser: parsed.messageToUser,
      requiresConfirmation: parsed.requiresConfirmation || false
    };
  }

  /**
   * Extract partial response from malformed JSON
   */
  private extractPartialResponse(jsonStr: string): any | null {
    try {
      // Try to find complete thought and messageToUser fields
      const thoughtMatch = jsonStr.match(/"thought"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      const messageMatch = jsonStr.match(/"messageToUser"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      
      if (!thoughtMatch || !messageMatch) return null;
      
      // Extract files using regex (risky but better than nothing)
      const filesMatch = jsonStr.match(/"files"\s*:\s*\{([\s\S]*?)\}/);
      let files = {};
      
      if (filesMatch) {
        // Try to extract individual file entries
        const filePattern = /"([^"]+)"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g;
        let match;
        while ((match = filePattern.exec(filesMatch[1])) !== null) {
          files[match[1]] = match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
      
      return {
        thought: thoughtMatch[1],
        messageToUser: messageMatch[1],
        files,
        plan: [],
        requiresConfirmation: false
      };
    } catch (e) {
      console.error('Partial extraction failed:', e);
      return null;
    }
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
