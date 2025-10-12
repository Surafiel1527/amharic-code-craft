/**
 * HTML Builder - Vanilla HTML/CSS/JavaScript projects
 * 
 * Handles generation of static websites and vanilla JS applications
 * No TypeScript, no build tools, just clean HTML/CSS/JS
 */

import { IFrameworkBuilder, GeneratedCode, BuildContext, ValidationResult } from './IFrameworkBuilder.ts';
import { callAIWithFallback } from '../aiHelpers.ts';

export class HtmlBuilder implements IFrameworkBuilder {
  getFrameworkName(): string {
    return 'html';
  }

  async analyzeRequest(context: BuildContext): Promise<any> {
    // HTML projects - analyze complexity to determine file structure
    const { analysis, request } = context;
    
    // Determine if multi-page website
    const needsMultiplePages = /multiple pages|multi-page|about page|contact page|separate pages/i.test(request);
    
    return {
      ...analysis,
      // Use multi-file for better organization and to ensure files show in tree
      buildStrategy: 'multi-file',
      needsSeparateCSS: true,
      needsSeparateJS: analysis.needsInteractivity || analysis.needsAPI || true,
      needsMultiplePages
    };
  }

  async planGeneration(context: BuildContext, analysis: any): Promise<any> {
    const { request } = context;
    
    // DYNAMIC file structure based on AI analysis
    const files = [];
    
    if (analysis.buildStrategy === 'single-file') {
      files.push({
        path: 'index.html',
        type: 'html',
        purpose: 'Complete single-file application with inline CSS/JS'
      });
    } else {
      // Always include core files
      files.push({
        path: 'index.html',
        type: 'html',
        purpose: 'Main HTML structure and entry point'
      });
      
      if (analysis.needsSeparateCSS) {
        files.push({
          path: 'styles.css',
          type: 'css',
          purpose: 'Main stylesheet with responsive design'
        });
      }
      
      if (analysis.needsSeparateJS) {
        files.push({
          path: 'script.js',
          type: 'javascript',
          purpose: 'Main JavaScript functionality'
        });
      }
      
      // Add additional pages if multi-page website detected
      if (analysis.needsMultiplePages) {
        // Common additional pages
        if (/about/i.test(request)) {
          files.push({
            path: 'about.html',
            type: 'html',
            purpose: 'About page content and structure'
          });
        }
        if (/contact/i.test(request)) {
          files.push({
            path: 'contact.html',
            type: 'html',
            purpose: 'Contact form and information'
          });
        }
        if (/services|products/i.test(request)) {
          files.push({
            path: 'services.html',
            type: 'html',
            purpose: 'Services or products listing page'
          });
        }
      }
      
      // Add additional JS modules if complex interactivity
      if (analysis.complexity === 'complex' && analysis.needsInteractivity) {
        files.push({
          path: 'utils.js',
          type: 'javascript',
          purpose: 'Utility functions and helpers'
        });
      }
      
      // Add API handler if API integration needed
      if (analysis.needsAPI) {
        files.push({
          path: 'api.js',
          type: 'javascript',
          purpose: 'API integration and data fetching'
        });
      }
    }

    return {
      framework: 'html',
      strategy: analysis.buildStrategy,
      files,
      estimatedTime: files.length * 2 // 2 mins per file
    };
  }

  async generateFiles(context: BuildContext, plan: any): Promise<GeneratedCode> {
    const { request, analysis, broadcast } = context;
    const files: GeneratedCode['files'] = [];

    await broadcast('generation:html_building', {
      status: 'generating',
      message: '🌐 Building HTML/CSS/JavaScript project...',
      progress: 55
    });

    if (plan.strategy === 'single-file') {
      // Generate single HTML file with inline CSS/JS
      const prompt = this.buildSingleFilePrompt(request, analysis);
      
      await broadcast('generation:file_start', {
        status: 'generating',
        message: '🏗️ Generating index.html with inline styles and scripts',
        progress: 60,
        file: 'index.html'
      });

      const result = await callAIWithFallback(
        [{ role: 'user', content: prompt }],
        {
          systemPrompt: 'You are an expert web developer. Generate clean, modern, production-ready HTML/CSS/JavaScript code.',
          preferredModel: 'google/gemini-2.5-flash',
          maxTokens: 8000
        }
      );

      const content = this.cleanGeneratedCode(result.data.choices[0].message.content);

      files.push({
        path: 'index.html',
        content,
        language: 'html',
        imports: []
      });

      await broadcast('generation:file_complete', {
        status: 'generating',
        message: '✅ Completed index.html',
        progress: 80,
        file: 'index.html'
      });

    } else {
      // Generate separate files
      for (let i = 0; i < plan.files.length; i++) {
        const file = plan.files[i];
        const progress = 55 + (i / plan.files.length) * 30;

        await broadcast('generation:file_start', {
          status: 'generating',
          message: `🏗️ Generating ${file.path}`,
          progress: Math.round(progress),
          file: file.path,
          fileNumber: i + 1,
          totalFiles: plan.files.length
        });

        const prompt = this.buildFilePrompt(file, request, analysis, plan.files);
        
        const result = await callAIWithFallback(
          [{ role: 'user', content: prompt }],
          {
            systemPrompt: `You are an expert ${file.type} developer. Generate clean, production-ready code.`,
            preferredModel: 'google/gemini-2.5-flash',
            maxTokens: 4000
          }
        );

        let content = this.cleanGeneratedCode(result.data.choices[0].message.content);
        
        // CRITICAL FIX: Balance CSS braces immediately after generation
        if (file.type === 'css') {
          content = this.balanceCSSBraces(content);
        }

        files.push({
          path: file.path,
          content,
          language: file.type,
          imports: this.extractReferences(content, file.type)
        });

        await broadcast('generation:file_complete', {
          status: 'generating',
          message: `✅ Completed ${file.path}`,
          progress: Math.round(progress + (25 / plan.files.length)),
          file: file.path
        });
      }
    }

    return {
      files,
      description: `Generated ${files.length} HTML file(s) for ${analysis.mainGoal}`,
      framework: 'html'
    };
  }

  async validateFiles(files: GeneratedCode['files']): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const file of files) {
      // HTML-specific validation
      if (file.language === 'html') {
        // Check for required HTML structure
        if (!file.content.includes('<!DOCTYPE html>') && !file.content.includes('<!doctype html>')) {
          warnings.push(`${file.path}: Missing DOCTYPE declaration`);
        }
        if (!file.content.includes('<html')) {
          errors.push(`${file.path}: Missing <html> tag`);
        }
        if (!file.content.includes('<head>') && !file.content.includes('<body>')) {
          errors.push(`${file.path}: Missing <head> or <body> tags`);
        }

        // Check for balanced tags (basic validation)
        const tags = this.extractHtmlTags(file.content);
        const unbalanced = this.findUnbalancedTags(tags);
        if (unbalanced.length > 0) {
          errors.push(`${file.path}: Unbalanced HTML tags: ${unbalanced.join(', ')}`);
        }
      }

      // CSS validation
      if (file.language === 'css') {
        const braces = (file.content.match(/{/g) || []).length;
        const closingBraces = (file.content.match(/}/g) || []).length;
        if (braces !== closingBraces) {
          errors.push(`${file.path}: Unbalanced CSS braces`);
        }
      }

      // JavaScript basic validation
      if (file.language === 'javascript') {
        const openBraces = (file.content.match(/{/g) || []).length;
        const closeBraces = (file.content.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
          errors.push(`${file.path}: Unbalanced JavaScript braces`);
        }

        const openParens = (file.content.match(/\(/g) || []).length;
        const closeParens = (file.content.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          errors.push(`${file.path}: Unbalanced parentheses`);
        }
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Balance CSS braces deterministically (CRITICAL FIX)
   */
  private balanceCSSBraces(css: string): string {
    const openBraces = (css.match(/\{/g) || []).length;
    const closeBraces = (css.match(/\}/g) || []).length;
    
    if (openBraces === closeBraces) {
      return css; // Already balanced
    }
    
    let balanced = css;
    if (openBraces > closeBraces) {
      // Add missing closing braces
      const missing = openBraces - closeBraces;
      balanced += '\n' + '}'.repeat(missing);
      console.log(`🔧 HtmlBuilder: Added ${missing} missing closing braces`);
    } else if (closeBraces > openBraces) {
      // Remove extra closing braces from end
      const extra = closeBraces - openBraces;
      for (let i = 0; i < extra; i++) {
        balanced = balanced.replace(/\}\s*$/, '');
      }
      console.log(`🔧 HtmlBuilder: Removed ${extra} extra closing braces`);
    }
    
    return balanced;
  }

  async packageOutput(generatedCode: GeneratedCode): Promise<string> {
    // Package HTML files for storage
    return generatedCode.files
      .map(f => `<!-- File: ${f.path} -->\n${f.content}`)
      .join('\n\n');
  }

  // Private helper methods

  private buildSingleFilePrompt(request: string, analysis: any): string {
    return `Generate a COMPLETE, BEAUTIFUL, PRODUCTION-READY single-file HTML website.

**User Request:** "${request}"

**Requirements:**
${analysis.requiredSections?.map((s: string) => `- ${s} section`).join('\n') || '- Build according to request'}

**Technical Requirements:**
- Single HTML file with inline CSS in <style> tags
- Inline JavaScript in <script> tags if needed
- Modern, responsive design (mobile-first)
- Semantic HTML5 elements
- CSS Grid/Flexbox for layouts
- Smooth animations and transitions
- Professional color scheme and typography
- Accessibility (ARIA labels, semantic HTML)
- SEO optimized (proper meta tags, headings hierarchy)

${analysis.needsInteractivity ? '- Interactive elements with vanilla JavaScript' : ''}
${analysis.needsAPI ? '- API integration with fetch API' : ''}

Return ONLY the complete HTML code, no markdown, no explanations.`;
  }

  private buildFilePrompt(file: any, request: string, analysis: any, allFiles: any[]): string {
    const contextFiles = allFiles.map(f => f.path).join(', ');

    if (file.type === 'html') {
      const hasCSS = allFiles.some(f => f.type === 'css');
      const hasJS = allFiles.some(f => f.type === 'javascript');

      return `Generate the main HTML structure for this website.

**User Request:** "${request}"

**File Purpose:** ${file.purpose}

**Project Structure:**
${contextFiles}

**Requirements:**
- Complete HTML5 structure with DOCTYPE
- Semantic HTML elements
${hasCSS ? '- Link to styles.css in <head>' : '- Inline CSS in <style> tags'}
${hasJS ? '- Link to script.js before </body>' : ''}
- Proper meta tags for SEO and responsiveness
- Accessibility attributes (ARIA, alt text)
- Clear content structure matching the request

Return ONLY the HTML code, no explanations.`;
    }

    if (file.type === 'css') {
      return `Generate the complete CSS for this website.

**User Request:** "${request}"

**File Purpose:** ${file.purpose}

**CRITICAL REQUIREMENTS:**
- EVERY opening brace { MUST have a matching closing brace }
- Count your braces: opening { and closing } MUST be equal
- Modern, professional design
- Fully responsive (mobile-first approach)
- CSS Grid and Flexbox for layouts
- Smooth transitions and animations
- Professional color scheme
- Typography hierarchy
- Dark mode support if appropriate
- Cross-browser compatibility

**VALIDATION:**
Before finishing, verify:
1. Count all { braces
2. Count all } braces
3. Numbers MUST match exactly

Return ONLY the CSS code with BALANCED BRACES, no explanations.`;
    }

    if (file.type === 'javascript') {
      return `Generate the JavaScript functionality for this website.

**User Request:** "${request}"

**File Purpose:** ${file.purpose}

**Requirements:**
- Vanilla JavaScript (ES6+)
- Clean, modular code
- Event listeners and DOM manipulation
${analysis.needsAPI ? '- API integration with fetch and error handling' : ''}
${analysis.backendRequirements?.needsDatabase ? '- Data persistence logic' : ''}
- Input validation where needed
- Smooth user interactions
- Error handling and fallbacks

Return ONLY the JavaScript code, no explanations.`;
    }

    return 'Generate the code for this file.';
  }

  private cleanGeneratedCode(content: string): string {
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    
    // Remove markdown code fences
    cleaned = cleaned.replace(/^```[\w]*\n/gm, '');
    cleaned = cleaned.replace(/\n```$/gm, '');
    cleaned = cleaned.replace(/^```$/gm, '');
    
    return cleaned.trim();
  }

  private extractReferences(content: string, type: string): string[] {
    const references: string[] = [];

    if (type === 'html') {
      // Extract CSS links
      const cssMatches = content.matchAll(/<link[^>]*href=["']([^"']+\.css)["']/gi);
      for (const match of cssMatches) {
        references.push(match[1]);
      }

      // Extract JS scripts
      const jsMatches = content.matchAll(/<script[^>]*src=["']([^"']+\.js)["']/gi);
      for (const match of jsMatches) {
        references.push(match[1]);
      }
    }

    return references;
  }

  private extractHtmlTags(html: string): string[] {
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
    const matches = html.matchAll(tagRegex);
    const tags: string[] = [];

    for (const match of matches) {
      tags.push(match[0]);
    }

    return tags;
  }

  private findUnbalancedTags(tags: string[]): string[] {
    const stack: string[] = [];
    const unbalanced: string[] = [];
    const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

    for (const tag of tags) {
      const tagNameMatch = tag.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/);
      if (!tagNameMatch) continue;

      const tagName = tagNameMatch[1].toLowerCase();
      
      if (selfClosing.includes(tagName)) continue;

      if (tag.startsWith('</')) {
        // Closing tag
        if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
          unbalanced.push(tagName);
        } else {
          stack.pop();
        }
      } else if (!tag.endsWith('/>')) {
        // Opening tag
        stack.push(tagName);
      }
    }

    return [...new Set([...unbalanced, ...stack])];
  }
}
