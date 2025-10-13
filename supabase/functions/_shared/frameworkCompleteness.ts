/**
 * Framework Completeness Checker & Auto-Generator
 * 
 * Ensures all framework-specific infrastructure files are present
 * Can automatically generate missing infrastructure files
 */

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  imports?: string[];
}

/**
 * Generate missing infrastructure files for a framework
 */
export async function generateMissingInfrastructure(
  existingFiles: GeneratedFile[],
  framework: string,
  missingFiles: string[],
  logger?: any
): Promise<GeneratedFile[]> {
  const log = logger || console;
  log.info?.(`Generating missing infrastructure: ${missingFiles.length} files for ${framework}`) ||
    console.log(`🔧 GENERATING MISSING INFRASTRUCTURE: ${missingFiles.length} files for ${framework}`);

  const newFiles: GeneratedFile[] = [];

  for (const missingPath of missingFiles) {
    const fileContent = await generateInfrastructureFile(missingPath, framework, existingFiles);
    if (fileContent) {
      newFiles.push(fileContent);
      log.info?.(`Generated: ${missingPath}`) || console.log(`✅ Generated: ${missingPath}`);
    } else {
      log.warn?.(`Could not generate: ${missingPath}`) || console.warn(`⚠️ Could not generate: ${missingPath}`);
    }
  }

  return newFiles;
}

/**
 * Generate a specific infrastructure file
 */
async function generateInfrastructureFile(
  filePath: string,
  framework: string,
  existingFiles: GeneratedFile[]
): Promise<GeneratedFile | null> {
  
  const fileName = filePath.toLowerCase();

  // React infrastructure files
  if (framework === 'react') {
    if (fileName === 'index.html') {
      return {
        path: 'index.html',
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
        language: 'html',
        imports: []
      };
    }

    if (fileName === 'package.json') {
      return {
        path: 'package.json',
        content: JSON.stringify({
          name: 'react-app',
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1'
          },
          devDependencies: {
            '@types/react': '^18.3.1',
            '@types/react-dom': '^18.3.1',
            '@vitejs/plugin-react': '^4.3.1',
            typescript: '^5.2.2',
            vite: '^5.0.0',
            tailwindcss: '^3.4.0',
            autoprefixer: '^10.4.16',
            postcss: '^8.4.32'
          }
        }, null, 2),
        language: 'json',
        imports: []
      };
    }

    if (fileName === 'vite.config.ts') {
      return {
        path: 'vite.config.ts',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
        language: 'typescript',
        imports: []
      };
    }

    if (fileName === 'tsconfig.json') {
      return {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true
          },
          include: ['src'],
          references: [{ path: './tsconfig.node.json' }]
        }, null, 2),
        language: 'json',
        imports: []
      };
    }

    if (fileName === 'tsconfig.node.json') {
      return {
        path: 'tsconfig.node.json',
        content: JSON.stringify({
          compilerOptions: {
            composite: true,
            skipLibCheck: true,
            module: 'ESNext',
            moduleResolution: 'bundler',
            allowSyntheticDefaultImports: true
          },
          include: ['vite.config.ts']
        }, null, 2),
        language: 'json',
        imports: []
      };
    }

    if (fileName === 'src/main.tsx') {
      return {
        path: 'src/main.tsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
        language: 'typescript',
        imports: ['react', 'react-dom']
      };
    }

    if (fileName === 'src/index.css') {
      return {
        path: 'src/index.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
        language: 'css',
        imports: []
      };
    }

    if (fileName === 'tailwind.config.js') {
      return {
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
        language: 'javascript',
        imports: []
      };
    }

    if (fileName === 'postcss.config.js') {
      return {
        path: 'postcss.config.js',
        content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
        language: 'javascript',
        imports: []
      };
    }

    if (fileName === '.gitignore') {
      return {
        path: '.gitignore',
        content: `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`,
        language: 'text',
        imports: []
      };
    }

    if (fileName === 'readme.md') {
      return {
        path: 'README.md',
        content: `# React + TypeScript + Vite

This project was generated with React, TypeScript, and Vite.

## Getting Started

Install dependencies:
\`\`\`bash
npm install
\`\`\`

Run development server:
\`\`\`bash
npm run dev
\`\`\`

Build for production:
\`\`\`bash
npm run build
\`\`\``,
        language: 'markdown',
        imports: []
      };
    }
  }

  // HTML infrastructure files
  if (framework === 'html') {
    if (fileName === 'styles.css' || fileName === 'style.css') {
      return {
        path: fileName,
        content: `/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}`,
        language: 'css',
        imports: []
      };
    }

    if (fileName === 'script.js' || fileName === 'main.js') {
      return {
        path: fileName,
        content: `// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded successfully');
  
  // Initialize app
  init();
});

function init() {
  // Add your initialization code here
}`,
        language: 'javascript',
        imports: []
      };
    }
  }

  return null;
}
