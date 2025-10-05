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
    const imports = ['import { useState', includeEffects && ', useEffect', ' } from "react";'].filter(Boolean).join('');
    
    if (stylingMethod === 'tailwind') {
      code += imports + '\n';
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

      // Return JSX
      if (stylingMethod === 'tailwind') {
        code += `  return (\n`;
        code += `    <div className="p-4 rounded-lg border bg-card">\n`;
        code += `      <h2 className="text-2xl font-bold mb-4">${componentName}</h2>\n`;
        if (props.length > 0) {
          code += `      <div className="space-y-2">\n`;
          props.forEach((prop: any) => {
            code += `        <p className="text-sm"><span className="font-medium">${prop.name}:</span> {${prop.name}}</p>\n`;
          });
          code += `      </div>\n`;
        } else {
          code += `      <p className="text-muted-foreground">Your component content here</p>\n`;
        }
        code += `    </div>\n`;
        code += `  );\n`;
      } else {
        code += `  return (\n`;
        code += `    <div>\n`;
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
