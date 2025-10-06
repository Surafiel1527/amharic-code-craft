import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  action: 'chat' | 'visual' | 'component' | 'multi-file';
  prompt?: string;
  imageUrl?: string;
  componentType?: string;
  files?: Array<{ path: string; description: string }>;
  context?: string;
  streaming?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, imageUrl, componentType, files, context, streaming } = await req.json() as GenerateRequest;
    console.log('[unified-code-generator] Request:', { action, hasPrompt: !!prompt, hasImage: !!imageUrl });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'chat': {
        // Chat-based code generation
        const response = await fetch('https://api.lovable.app/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an expert React developer. Generate clean, modern React code with TypeScript and Tailwind CSS.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 4000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedCode = data.choices[0].message.content;

        return new Response(
          JSON.stringify({
            success: true,
            code: generatedCode,
            type: 'chat'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'visual': {
        // Visual design to code
        if (!imageUrl) {
          throw new Error('imageUrl required for visual generation');
        }

        const response = await fetch('https://api.lovable.app/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at converting designs to React code. Analyze the image and generate accurate, responsive React components with TypeScript and Tailwind CSS.'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt || 'Convert this design to React code' },
                  { type: 'image_url', image_url: { url: imageUrl } }
                ]
              }
            ],
            max_tokens: 6000,
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedCode = data.choices[0].message.content;

        return new Response(
          JSON.stringify({
            success: true,
            code: generatedCode,
            type: 'visual'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'component': {
        // React component generation
        const componentPrompt = `Create a React ${componentType || 'functional'} component with TypeScript and Tailwind CSS.
${prompt}

Requirements:
- Use TypeScript with proper types
- Use Tailwind CSS for styling
- Follow React best practices
- Include proper error handling
- Make it responsive`;

        const response = await fetch('https://api.lovable.app/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an expert React component developer. Generate production-ready, type-safe React components.'
              },
              {
                role: 'user',
                content: componentPrompt
              }
            ],
            max_tokens: 3000,
            temperature: 0.6,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedCode = data.choices[0].message.content;

        return new Response(
          JSON.stringify({
            success: true,
            code: generatedCode,
            type: 'component',
            componentType
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'multi-file': {
        // Multi-file generation
        if (!files || files.length === 0) {
          throw new Error('files array required for multi-file generation');
        }

        const filePromises = files.map(async (file) => {
          const filePrompt = `Generate code for file: ${file.path}
Description: ${file.description}
${context ? `\nContext: ${context}` : ''}

Generate clean, production-ready code with TypeScript and proper imports.`;

          const response = await fetch('https://api.lovable.app/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert full-stack developer. Generate clean, modular code files.'
                },
                {
                  role: 'user',
                  content: filePrompt
                }
              ],
              max_tokens: 2000,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            throw new Error(`AI API error for ${file.path}: ${response.statusText}`);
          }

          const data = await response.json();
          return {
            path: file.path,
            code: data.choices[0].message.content,
            description: file.description
          };
        });

        const generatedFiles = await Promise.all(filePromises);

        return new Response(
          JSON.stringify({
            success: true,
            files: generatedFiles,
            type: 'multi-file'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-code-generator] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
