import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, includeImages = true, includeCode = true, optimize = true } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const results: any = {
      text: null,
      images: [],
      code: null,
      generationTime: 0,
    };

    const startTime = Date.now();

    // Step 1: Analyze request and plan generation
    const planningResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: `Analyze this request and create a generation plan: "${prompt}"

Return JSON with:
{
  "needsImages": boolean,
  "imagePrompts": ["array of image descriptions to generate"],
  "needsCode": boolean,
  "codeRequirements": "what kind of code to generate",
  "textResponse": "comprehensive text response to the user"
}`
        }],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    const planningData = await planningResponse.json();
    const planText = planningData.choices[0].message.content;
    const jsonMatch = planText.match(/\{[\s\S]*\}/);
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      needsImages: false,
      imagePrompts: [],
      needsCode: false,
      codeRequirements: "",
      textResponse: planText
    };

    results.text = plan.textResponse;

    // Step 2: Generate images if needed
    if (includeImages && plan.needsImages && plan.imagePrompts.length > 0) {
      for (const imagePrompt of plan.imagePrompts.slice(0, 3)) { // Max 3 images
        try {
          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [{
                role: "user",
                content: imagePrompt
              }],
              modalities: ["image", "text"]
            }),
          });

          const imageData = await imageResponse.json();
          const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (generatedImage) {
            results.images.push({
              prompt: imagePrompt,
              url: generatedImage
            });
          }
        } catch (error) {
          console.error('Image generation error:', error);
        }
      }
    }

    // Step 3: Generate code if needed
    if (includeCode && plan.needsCode) {
      const codeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Generate production-ready code for: ${plan.codeRequirements}

Context: ${prompt}

Provide complete, working code with comments and best practices.`
          }],
          temperature: 0.3,
          max_tokens: 6000,
        }),
      });

      const codeData = await codeResponse.json();
      results.code = codeData.choices[0].message.content;
    }

    // Step 4: Optimize if requested
    if (optimize && results.code) {
      const optimizeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Optimize this code for performance, readability, and best practices:\n\n${results.code}`
          }],
          temperature: 0.2,
          max_tokens: 6000,
        }),
      });

      const optimizeData = await optimizeResponse.json();
      results.code = optimizeData.choices[0].message.content;
    }

    results.generationTime = Date.now() - startTime;

    // Log to database
    if (user) {
      await supabaseClient.from('multi_modal_generations').insert({
        user_id: user.id,
        prompt,
        included_images: includeImages,
        included_code: includeCode,
        images_generated: results.images.length,
        has_code: !!results.code,
        generation_time_ms: results.generationTime,
      });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Multi-modal generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
