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
    return `Generate a COMPLETE, FULLY FUNCTIONAL, PRODUCTION-READY single-file HTML application.

**CRITICAL REQUIREMENTS - READ CAREFULLY:**

🎯 **User Request:** "${request}"

**YOU MUST CREATE A FULLY WORKING APPLICATION:**
- NO placeholder text like "Add your content here" or "Feature coming soon"
- NO comments suggesting future implementation
- NO skeleton code or TODO comments
- EVERY feature mentioned in the request MUST be fully implemented and working
- ALL interactive elements must have complete JavaScript functionality
- ALL forms must have working validation and submission logic
- ALL data operations must use localStorage or in-memory storage
- If authentication is requested, implement COMPLETE login/signup with validation
- If CRUD is requested, implement ALL operations (Create, Read, Update, Delete)
- If comments/reviews are requested, implement the COMPLETE commenting system
- If rich text editing is requested, implement a WORKING rich text editor

**Technical Implementation:**
✅ Single self-contained HTML file
✅ ALL CSS embedded in <style> tags (NO external .css files)
✅ ALL JavaScript embedded in <script> tags (NO external .js files)
✅ Complete, working functionality for EVERY requested feature
✅ Use localStorage for data persistence (or in-memory arrays if simpler)
✅ Modern, responsive design (mobile-first with proper breakpoints)
✅ Professional UI with modals, forms, notifications, loading states
✅ Complete form validation with error messages
✅ Interactive animations and transitions
✅ Semantic HTML5 with ARIA labels
✅ SEO optimized (meta tags, Open Graph, structured data)

${analysis.needsInteractivity ? '✅ Implement ALL interactive features with event listeners and state management' : ''}
${analysis.needsAPI ? '✅ Complete API integration with fetch, error handling, loading states' : ''}
${analysis.backendRequirements?.needsDatabase ? '✅ Full data CRUD with localStorage (create, read, update, delete)' : ''}
${analysis.needsAuth ? '✅ Complete authentication system with signup, login, logout, session management' : ''}

**What Users Should See:**
- A COMPLETE, WORKING application they can use immediately
- ALL buttons, forms, and features working perfectly
- Professional design with real content and interactions
- Smooth user experience with feedback (toasts, loading states, validation)

**FORBIDDEN:**
❌ NO "TODO" or "Add functionality here" comments
❌ NO placeholder text or dummy content suggestions
❌ NO external file references (<link> or <script src>)
❌ NO incomplete features or partial implementations
❌ NO skeleton code waiting for future additions

Return ONLY the complete, self-contained, fully functional HTML code. No markdown backticks, no explanations.`;
  }

  private buildFilePrompt(file: any, request: string, analysis: any, allFiles: any[]): string {
    const contextFiles = allFiles.map(f => f.path).join(', ');

    if (file.type === 'html') {
      const hasCSS = allFiles.some(f => f.type === 'css');
      const hasJS = allFiles.some(f => f.type === 'javascript');

      return `Generate COMPLETE, PRODUCTION-READY HTML for a fully functional application.

🎯 **User Request:** "${request}"
📁 **File Purpose:** ${file.purpose}
📂 **Project Files:** ${contextFiles}

**CRITICAL - THIS MUST BE FULLY FUNCTIONAL:**
✅ Complete HTML5 structure with DOCTYPE
✅ ALL semantic HTML5 elements (header, main, nav, section, article)
✅ REAL content matching the request (no "Add content here" placeholders)
✅ ALL forms with proper labels, inputs, and validation attributes
✅ ALL interactive elements (buttons, links) with data attributes for JS
${hasCSS ? '✅ Link to styles.css in <head>' : '✅ Inline CSS in <style> tags'}
${hasJS ? '✅ Link to script.js before </body>' : '✅ Inline JavaScript in <script> tags'}
✅ Complete meta tags (viewport, SEO, Open Graph, favicon)
✅ Full accessibility (ARIA labels, roles, alt text, semantic HTML)
✅ Proper heading hierarchy (h1-h6)
✅ All UI components needed (modals, forms, cards, navigation)

**FORBIDDEN:**
❌ NO placeholder content or "Lorem ipsum"
❌ NO "Coming soon" or "Add your X here" text
❌ NO incomplete sections
❌ NO TODO comments

Return ONLY the complete, production-ready HTML code.`;
    }

    if (file.type === 'css') {
      return `Generate COMPLETE, PRODUCTION-READY CSS for a beautiful, fully responsive application.

🎯 **User Request:** "${request}"
📁 **File Purpose:** ${file.purpose}

**CRITICAL REQUIREMENTS - FULLY FUNCTIONAL STYLING:**
✅ EVERY opening brace { MUST have matching closing brace }
✅ Complete styling for ALL HTML elements in the project
✅ Modern, professional design system (colors, spacing, typography)
✅ Fully responsive with mobile-first breakpoints (320px, 768px, 1024px, 1440px)
✅ CSS Grid and Flexbox layouts
✅ Smooth transitions and animations (hover states, loading, modals)
✅ Professional color palette with CSS variables
✅ Typography hierarchy (font-family, sizes, weights, line-heights)
✅ Form styling (inputs, buttons, validation states)
✅ Component states (hover, focus, active, disabled, error, success)
✅ Loading states and animations
✅ Modal and overlay styling
✅ Dark mode support (using CSS variables or @media prefers-color-scheme)
✅ Print styles (@media print)
✅ Cross-browser compatibility (vendor prefixes where needed)

**VALIDATION BEFORE FINISHING:**
1. Count all { braces = ___
2. Count all } braces = ___
3. Numbers MUST be EXACTLY EQUAL

**FORBIDDEN:**
❌ NO incomplete selectors
❌ NO missing styles for any component
❌ NO unbalanced braces
❌ NO TODO comments

Return ONLY the complete CSS code with PERFECTLY BALANCED BRACES.`;
    }

    if (file.type === 'javascript') {
      return `Generate COMPLETE, PRODUCTION-READY JavaScript for a fully functional application.

🎯 **User Request:** "${request}"
📁 **File Purpose:** ${file.purpose}

**CRITICAL - IMPLEMENT ALL FUNCTIONALITY:**
✅ Vanilla JavaScript (ES6+) with modern best practices
✅ COMPLETE implementation of ALL requested features
✅ Full CRUD operations if data management is needed
✅ Complete form validation with error messages
✅ Event listeners for ALL interactive elements
✅ DOM manipulation for dynamic content
✅ Data persistence using localStorage with proper JSON serialization
${analysis.needsAPI ? '✅ Complete API integration (fetch, error handling, retry logic, loading states)' : ''}
${analysis.needsAuth ? '✅ Full authentication logic (signup, login, logout, session management, validation)' : ''}
${analysis.backendRequirements?.needsDatabase ? '✅ Complete data layer (create, read, update, delete, search, filter)' : ''}
✅ State management (track current user, data, UI states)
✅ Error handling with user-friendly messages
✅ Loading states and feedback (toasts, spinners)
✅ Input sanitization and validation
✅ Smooth UI interactions (animations, transitions)
✅ Modal/dialog management
✅ Responsive behavior (mobile touch events, keyboard navigation)

**FORBIDDEN:**
❌ NO "TODO: Implement X" comments
❌ NO placeholder functions that don't work
❌ NO console.log statements without functionality
❌ NO incomplete event handlers
❌ NO missing error handling

Return ONLY the complete, production-ready JavaScript code.`;
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
