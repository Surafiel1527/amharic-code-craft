import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { GeneratedFile } from '@/hooks/useReactGeneration';

interface ReactGenerationPreviewProps {
  entryPoint: string;
  files: GeneratedFile[];
  className?: string;
}

export function ReactGenerationPreview({ entryPoint, files, className }: ReactGenerationPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!files.length || !iframeRef.current) return;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    const buildPreviewHTML = () => {
      const entryFile = files.find(f => f.path === entryPoint);
      if (!entryFile) {
        console.warn('Entry point not found:', entryPoint);
        return '';
      }

      const moduleMap = files.reduce((acc, file) => {
        acc[file.path] = file.code;
        return acc;
      }, {} as Record<string, string>);

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; background: #fff; }
              .error-boundary {
                padding: 2rem;
                background: linear-gradient(135deg, #fee 0%, #fdd 100%);
                border: 2px solid #c33;
                border-radius: 12px;
                margin: 2rem;
                font-family: 'Courier New', monospace;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .error-boundary h3 { color: #c33; margin-bottom: 1rem; }
              .error-boundary pre { 
                background: #fff; 
                padding: 1rem; 
                border-radius: 8px; 
                overflow: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
              }
              .loading-state {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: sans-serif;
                color: #666;
              }
              .loading-spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-right: 1rem;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div id="root">
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>⚡ Loading preview...</span>
              </div>
            </div>
            
            <script type="text/babel" data-type="module">
              const { useState, useEffect, useRef, useCallback, useMemo, useReducer, createContext, useContext } = React;
              
              // Enhanced Error Boundary
              class ErrorBoundary extends React.Component {
                constructor(props) {
                  super(props);
                  this.state = { hasError: false, error: null, errorInfo: null };
                }
                
                static getDerivedStateFromError(error) {
                  return { hasError: true, error };
                }
                
                componentDidCatch(error, errorInfo) {
                  console.error('🔴 React Error Caught:', error, errorInfo);
                  this.setState({ errorInfo });
                }
                
                render() {
                  if (this.state.hasError) {
                    return React.createElement('div', { className: 'error-boundary' }, [
                      React.createElement('h3', { key: 'title' }, '⚠️ Component Error'),
                      React.createElement('pre', { key: 'error' }, 
                        this.state.error?.toString() || 'Unknown error'
                      ),
                      this.state.errorInfo && React.createElement('details', { key: 'stack' }, [
                        React.createElement('summary', { key: 'sum' }, 'Component Stack'),
                        React.createElement('pre', { key: 'trace' }, this.state.errorInfo.componentStack)
                      ])
                    ]);
                  }
                  return this.props.children;
                }
              }
              
              // Module registry
              const modules = ${JSON.stringify(moduleMap)};
              console.log('📦 Loaded modules:', Object.keys(modules));
              
              // Transform and execute all modules
              try {
                ${files.map(file => `
                  // Module: ${file.path}
                  ${file.code.replace(/^import\s+.*from\s+['"].*['"]\s*;?\s*$/gm, '').replace(/^export\s+(default\s+)?/gm, '')}
                `).join('\n')}
                
                console.log('✅ All modules loaded successfully');
              } catch (moduleError) {
                console.error('❌ Module loading error:', moduleError);
              }
              
              // Render with enhanced error handling
              const root = ReactDOM.createRoot(document.getElementById('root'));
              
              try {
                const componentNames = [
                  '${entryPoint.replace(/\.[jt]sx?$/, '').split('/').pop()}',
                  'App',
                  'default'
                ];
                
                let ComponentToRender = null;
                for (const name of componentNames) {
                  if (typeof window[name] !== 'undefined') {
                    ComponentToRender = window[name];
                    console.log('🎯 Found component:', name);
                    break;
                  }
                }
                
                if (ComponentToRender) {
                  root.render(
                    React.createElement(ErrorBoundary, null,
                      React.createElement(ComponentToRender)
                    )
                  );
                  console.log('✨ Component rendered successfully');
                } else {
                  const availableComponents = Object.keys(window)
                    .filter(k => typeof window[k] === 'function' && k !== 'ErrorBoundary')
                    .slice(0, 10);
                  
                  root.render(
                    React.createElement('div', { className: 'error-boundary' }, [
                      React.createElement('h3', { key: 'title' }, '⚠️ Component Not Found'),
                      React.createElement('p', { key: 'msg' }, 
                        'Could not find component: ' + componentNames.join(' or ')
                      ),
                      React.createElement('details', { key: 'available' }, [
                        React.createElement('summary', { key: 'sum' }, 'Available components'),
                        React.createElement('pre', { key: 'list' }, availableComponents.join('\\n'))
                      ])
                    ])
                  );
                }
              } catch (renderError) {
                console.error('❌ Render error:', renderError);
                root.render(
                  React.createElement('div', { className: 'error-boundary' }, [
                    React.createElement('h3', { key: 'title' }, '⚠️ Render Error'),
                    React.createElement('pre', { key: 'error' }, renderError.toString())
                  ])
                );
              }
              
              // Hot reload listener
              window.addEventListener('message', (event) => {
                if (event.data.type === 'HOT_RELOAD') {
                  console.log('🔥 Hot reloading...');
                  setTimeout(() => location.reload(), 100);
                }
              });
              
              console.log('🚀 Preview ready!');
            </script>
          </body>
        </html>
      `;
    };

    const html = buildPreviewHTML();
    if (html) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
    }
  }, [files, entryPoint]);

  if (!files.length) {
    return (
      <Card className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Waiting for generation...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden h-full ${className}`}>
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="React Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </Card>
  );
}
