/**
 * File Dependency Analysis
 * Tracks relationships between files for intelligent code modifications
 */

export interface FileInfo {
  path: string;
  imports: string[];
  importedBy: string[];
  componentType: 'page' | 'component' | 'hook' | 'util' | 'context' | 'unknown';
  exports: string[];
  apiCalls: string[];
}

/**
 * Analyze project code to extract file relationships
 */
export function analyzeFileDependencies(projectCode: string): FileInfo[] {
  const files: FileInfo[] = [];
  
  // Parse project structure (simplified version)
  const fileMatches = projectCode.matchAll(/\/\/ FILE: (.+?)\n([\s\S]*?)(?=\/\/ FILE:|$)/g);
  
  for (const match of fileMatches) {
    const filePath = match[1];
    const content = match[2];
    
    files.push({
      path: filePath,
      imports: extractImports(content),
      importedBy: [], // Will be computed below
      componentType: detectComponentType(filePath, content),
      exports: extractExports(content),
      apiCalls: extractApiCalls(content)
    });
  }
  
  // Compute importedBy relationships
  files.forEach(file => {
    file.imports.forEach(importPath => {
      const importedFile = files.find(f => 
        f.path.includes(importPath) || importPath.includes(f.path)
      );
      if (importedFile && !importedFile.importedBy.includes(file.path)) {
        importedFile.importedBy.push(file.path);
      }
    });
  });
  
  return files;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  
  // Named exports
  const namedExports = content.match(/export\s+(?:const|function|class)\s+(\w+)/g);
  if (namedExports) {
    exports.push(...namedExports.map(e => e.split(/\s+/).pop()!));
  }
  
  // Default export
  if (content.includes('export default')) {
    exports.push('default');
  }
  
  return exports;
}

function extractApiCalls(content: string): string[] {
  const apiCalls: string[] = [];
  
  // Supabase calls
  const supabaseMatches = content.matchAll(/supabase\.from\(['"](\w+)['"]\)/g);
  for (const match of supabaseMatches) {
    apiCalls.push(`supabase:${match[1]}`);
  }
  
  // Function invocations
  const functionMatches = content.matchAll(/supabase\.functions\.invoke\(['"](.+?)['"]/g);
  for (const match of functionMatches) {
    apiCalls.push(`function:${match[1]}`);
  }
  
  return apiCalls;
}

function detectComponentType(
  filePath: string, 
  content: string
): FileInfo['componentType'] {
  if (filePath.includes('/pages/')) return 'page';
  if (filePath.includes('/hooks/') || filePath.startsWith('use')) return 'hook';
  if (filePath.includes('/contexts/') || content.includes('createContext')) return 'context';
  if (filePath.includes('/utils/') || filePath.includes('/lib/')) return 'util';
  if (filePath.includes('/components/')) return 'component';
  return 'unknown';
}

/**
 * Build dependency summary for AI context
 */
export function buildDependencySummary(files: FileInfo[]): string {
  const summary = {
    totalFiles: files.length,
    pages: files.filter(f => f.componentType === 'page').length,
    components: files.filter(f => f.componentType === 'component').length,
    hooks: files.filter(f => f.componentType === 'hook').length,
    contexts: files.filter(f => f.componentType === 'context').length,
    mostImportedFiles: files
      .filter(f => f.importedBy.length > 0)
      .sort((a, b) => b.importedBy.length - a.importedBy.length)
      .slice(0, 5)
      .map(f => `${f.path} (used by ${f.importedBy.length} files)`)
  };

  return `
FILE STRUCTURE:
- Total Files: ${summary.totalFiles}
- Pages: ${summary.pages}
- Components: ${summary.components}
- Hooks: ${summary.hooks}
- Contexts: ${summary.contexts}

Most Imported Files (Core Dependencies):
${summary.mostImportedFiles.map(f => `- ${f}`).join('\n') || '- None yet'}

CRITICAL: When modifying code, check if the file is imported by other files to avoid breaking changes!
`.trim();
}
