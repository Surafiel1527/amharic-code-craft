import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      componentName,
      componentType,
      includeTypeScript,
      includeProps,
      includeState,
      includeEffects,
      includeStyles,
      stateManagement,
      stylingMethod,
      props
    } = await req.json();

    if (!componentName) {
      throw new Error('Component name is required');
    }

    let code = '';

    // Imports
    const reactImports = ['useState'];
    if (includeEffects) reactImports.push('useEffect');
    if (stateManagement === 'useReducer') reactImports.push('useReducer');
    
    code += `import { ${reactImports.join(', ')} } from "react";\n`;
    
    if (stylingMethod === 'tailwind') {
      code += `import { cn } from "@/lib/utils";\n`;
    }

    if (includeTypeScript && includeProps && props.length > 0) {
      code += '\ninterface ' + componentName + 'Props {\n';
      props.forEach((prop: any) => {
        const optional = prop.required ? '' : '?';
        const description = prop.description ? `  /** ${prop.description} */\n` : '';
        code += description;
        code += `  ${prop.name}${optional}: ${prop.type};\n`;
      });
      code += '}\n';
    }

    // Component
    if (componentType === 'functional') {
      const propsParam = includeProps && props.length > 0 
        ? `{ ${props.map((p: any) => p.name).join(', ')} }${includeTypeScript ? ': ' + componentName + 'Props' : ''}`
        : '';
      
      code += `\nexport function ${componentName}(${propsParam}) {\n`;

      // State
      if (includeState) {
        if (stateManagement === 'useState') {
          code += `  const [state, setState] = useState({\n`;
          code += `    data: null,\n`;
          code += `    loading: false,\n`;
          code += `    error: null\n`;
          code += `  });\n\n`;
        } else if (stateManagement === 'useReducer') {
          code += `  const reducer = (state: any, action: any) => {\n`;
          code += `    switch (action.type) {\n`;
          code += `      case 'SET_DATA': return { ...state, data: action.payload };\n`;
          code += `      default: return state;\n`;
          code += `    }\n`;
          code += `  };\n\n`;
          code += `  const [state, dispatch] = useReducer(reducer, { data: null });\n\n`;
        }
      }

      // Effects
      if (includeEffects) {
        code += `  useEffect(() => {\n`;
        code += `    // Component mounted\n`;
        code += `    console.log('${componentName} mounted');\n\n`;
        code += `    return () => {\n`;
        code += `      // Cleanup\n`;
        code += `      console.log('${componentName} unmounted');\n`;
        code += `    };\n`;
        code += `  }, []);\n\n`;
      }

      // Return JSX with accessibility
      if (stylingMethod === 'tailwind') {
        code += `  return (\n`;
        code += `    <div \n`;
        code += `      className={cn(\n`;
        code += `        "p-6 rounded-lg border bg-card shadow-sm transition-all hover:shadow-md",\n`;
        code += `        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"\n`;
        code += `      )}\n`;
        code += `      role="region"\n`;
        code += `      aria-label="${componentName} component"\n`;
        code += `    >\n`;
        code += `      <header className="mb-4">\n`;
        code += `        <h2 className="text-2xl font-bold text-foreground">\n`;
        code += `          ${componentName}\n`;
        code += `        </h2>\n`;
        code += `      </header>\n`;
        
        if (props.length > 0) {
          code += `      <main className="space-y-3">\n`;
          props.forEach((prop: any) => {
            const isRequired = prop.required ? 'required' : 'optional';
            code += `        <div className="flex items-center gap-2 p-3 rounded bg-muted/50">\n`;
            code += `          <span className="text-sm font-medium text-foreground">${prop.name}:</span>\n`;
            code += `          <span className="text-sm text-muted-foreground" aria-label="${prop.name} value">\n`;
            code += `            {${prop.name} ?? '${prop.defaultValue || 'Not provided'}'}\n`;
            code += `          </span>\n`;
            code += `          <span className="ml-auto text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">\n`;
            code += `            ${isRequired}\n`;
            code += `          </span>\n`;
            code += `        </div>\n`;
          });
          code += `      </main>\n`;
        } else {
          code += `      <main>\n`;
          code += `        <p className="text-muted-foreground">\n`;
          code += `          Add your component content here. This is a placeholder.\n`;
          code += `        </p>\n`;
          code += `      </main>\n`;
        }
        
        if (includeState) {
          code += `      <footer className="mt-6 pt-4 border-t">\n`;
          code += `        <div className="text-xs text-muted-foreground">\n`;
          code += `          State: {JSON.stringify(state)}\n`;
          code += `        </div>\n`;
          code += `      </footer>\n`;
        }
        
        code += `    </div>\n`;
        code += `  );\n`;
      } else {
        code += `  return (\n`;
        code += `    <div role="region" aria-label="${componentName} component">\n`;
        code += `      <h2>${componentName}</h2>\n`;
        code += `      <p>Your component content here</p>\n`;
        code += `    </div>\n`;
        code += `  );\n`;
      }

      code += '}\n';
    }

    console.log(`Generated React component: ${componentName}`);

    return new Response(
      JSON.stringify({ code }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Component generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Generation failed' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
