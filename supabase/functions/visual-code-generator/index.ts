import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisualCodeRequest {
  imageUrl?: string;
  imageBase64?: string;
  description?: string;
  framework: 'react' | 'vue' | 'angular' | 'svelte';
  styling: 'tailwind' | 'css' | 'styled-components';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64, description, framework = 'react', styling = 'tailwind' }: VisualCodeRequest = await req.json();

    if (!imageUrl && !imageBase64) {
      throw new Error('Either imageUrl or imageBase64 must be provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const imageData = imageBase64 || imageUrl;
    const imageContent = imageBase64 
      ? { type: "image_url" as const, image_url: { url: `data:image/png;base64,${imageBase64}` } }
      : { type: "image_url" as const, image_url: { url: imageUrl! } };

    // Use Lovable AI with vision capabilities to analyze the design
    const analysisPrompt = `You are an expert frontend developer. Analyze this design/screenshot and generate production-ready code.

Framework: ${framework}
Styling: ${styling}
Additional Context: ${description || 'None'}

Provide a detailed analysis and then generate complete, working code. Include:
1. Component structure
2. Styling (using ${styling})
3. Responsive design
4. Accessibility features
5. Best practices

Return your response in this JSON format:
{
  "analysis": {
    "layout": "Description of layout structure",
    "components": ["List of components identified"],
    "colors": ["Color palette detected"],
    "typography": "Font and text styling details",
    "interactions": ["Interactive elements identified"]
  },
  "code": {
    "mainComponent": "Complete main component code",
    "subComponents": [{"name": "ComponentName", "code": "Component code"}],
    "styles": "CSS/Tailwind styles",
    "dependencies": ["List of required npm packages"]
  },
  "recommendations": ["Suggestions for improvement"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              imageContent
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let result;
    
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: create structured response
      result = {
        analysis: {
          layout: "AI analyzed the design",
          components: ["Main component"],
          colors: ["Detected from image"],
          typography: "Standard web fonts",
          interactions: ["Basic interactions"]
        },
        code: {
          mainComponent: aiResponse,
          subComponents: [],
          styles: "",
          dependencies: []
        },
        recommendations: ["Review and test the generated code"]
      };
    }

    // Log to database
    if (user) {
      await supabaseClient.from('visual_code_generations').insert({
        user_id: user.id,
        has_image: !!imageUrl || !!imageBase64,
        framework,
        styling,
        analysis: result.analysis,
        generated_code: result.code,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Visual code generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
