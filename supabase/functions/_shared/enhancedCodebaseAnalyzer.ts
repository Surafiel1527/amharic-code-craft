/**
 * Enhanced Codebase Analyzer
 * Discovers functions, components, and project structure
 */

export interface DiscoveredFunction {
  name: string;
  params: string[];
  returnType?: string;
  filePath: string;
  lineNumber: number;
  isExported: boolean;
  documentation?: string;
}

export interface DiscoveredComponent {
  name: string;
  props: string[];
  filePath: string;
  isExported: boolean;
  documentation?: string;
}

export interface CodebaseStructure {
  functions: DiscoveredFunction[];
  components: DiscoveredComponent[];
  imports: Map<string, string[]>;
  exports: Map<string, string[]>;
}

export class EnhancedCodebaseAnalyzer {
  
  /**
   * Analyze entire codebase structure
   */
  analyzeCodebase(files: Record<string, string>): CodebaseStructure {
    const functions: DiscoveredFunction[] = [];
    const components: DiscoveredComponent[] = [];
    const imports = new Map<string, string[]>();
    const exports = new Map<string, string[]>();

    for (const [filePath, content] of Object.entries(files)) {
      // Skip non-code files
      if (!this.isCodeFile(filePath)) continue;

      // Discover functions
      functions.push(...this.discoverFunctions(filePath, content));

      // Discover components (React/Vue/etc)
      components.push(...this.discoverComponents(filePath, content));

      // Extract imports
      const fileImports = this.extractImports(content);
      if (fileImports.length > 0) {
        imports.set(filePath, fileImports);
      }

      // Extract exports
      const fileExports = this.extractExports(content);
      if (fileExports.length > 0) {
        exports.set(filePath, fileExports);
      }
    }

    return { functions, components, imports, exports };
  }

  /**
   * Discover functions in code
   */
  discoverFunctions(filePath: string, content: string): DiscoveredFunction[] {
    const functions: DiscoveredFunction[] = [];
    const lines = content.split('\n');

    // Regular function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
    
    // Arrow functions
    const arrowRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g;

    let match;

    // Match regular functions
    while ((match = functionRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        params: this.parseParams(match[2]),
        returnType: match[3]?.trim(),
        filePath,
        lineNumber,
        isExported: match[0].includes('export'),
        documentation: this.extractJSDoc(lines, lineNumber - 1)
      });
    }

    // Match arrow functions
    while ((match = arrowRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        params: this.parseParams(match[2]),
        returnType: match[3]?.trim(),
        filePath,
        lineNumber,
        isExported: match[0].includes('export'),
        documentation: this.extractJSDoc(lines, lineNumber - 1)
      });
    }

    return functions;
  }

  /**
   * Discover React components
   */
  discoverComponents(filePath: string, content: string): DiscoveredComponent[] {
    const components: DiscoveredComponent[] = [];
    const lines = content.split('\n');

    // Function components
    const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*(?:=\s*)?(?:\(([^)]*)\)|\{[^}]*\})\s*(?::|=>)?\s*(?:\{|=>)/g;
    
    let match;
    while ((match = componentRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const name = match[1];
      
      // Verify it returns JSX
      const componentBody = content.substring(match.index, match.index + 500);
      if (this.returnsJSX(componentBody)) {
        components.push({
          name,
          props: this.extractProps(match[2] || ''),
          filePath,
          isExported: match[0].includes('export'),
          documentation: this.extractJSDoc(lines, lineNumber - 1)
        });
      }
    }

    return components;
  }

  /**
   * Extract import statements
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Extract export statements
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class)\s+(\w+)/g;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  /**
   * Parse function parameters
   */
  private parseParams(paramsString: string): string[] {
    if (!paramsString.trim()) return [];
    
    return paramsString
      .split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(p => p.length > 0);
  }

  /**
   * Extract props from component signature
   */
  private extractProps(propsString: string): string[] {
    if (!propsString.includes('{')) return [];
    
    const match = propsString.match(/\{([^}]+)\}/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(p => p.length > 0);
  }

  /**
   * Extract JSDoc comment
   */
  private extractJSDoc(lines: string[], lineNumber: number): string | undefined {
    let doc = '';
    let i = lineNumber - 1;
    
    while (i >= 0 && (lines[i].trim().startsWith('*') || lines[i].trim().startsWith('//'))) {
      doc = lines[i].trim() + '\n' + doc;
      i--;
    }
    
    return doc.trim() || undefined;
  }

  /**
   * Check if content returns JSX
   */
  private returnsJSX(content: string): boolean {
    return /return\s*\(?\s*</.test(content) || /=>\s*</.test(content);
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];
    return codeExtensions.some(ext => filePath.endsWith(ext));
  }
}
