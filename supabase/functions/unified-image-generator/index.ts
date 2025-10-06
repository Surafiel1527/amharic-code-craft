import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Image Generator
 * Consolidates:
 * - generate-image (basic image generation)
 * - generate-ai-image (AI-powered advanced image generation)
 */

interface ImageRequest {
  prompt: string;
  mode?: 'basic' | 'advanced' | 'edit';
  style?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  quality?: 'standard' | 'hd';
  baseImage?: string; // For edit mode
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    let userId: string | undefined;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    const {
      prompt,
      mode = 'advanced',
      style,
      aspectRatio = '1:1',
      quality = 'standard',
      baseImage,
    } = await req.json() as ImageRequest;

    console.log('[unified-image-generator] Generating image:', { mode, style, aspectRatio });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Enhanced prompt with style and quality modifiers
    let enhancedPrompt = prompt;
    
    if (style) {
      enhancedPrompt = `${style} style: ${enhancedPrompt}`;
    }
    
    if (quality === 'hd') {
      enhancedPrompt = `${enhancedPrompt}, ultra high quality, detailed, 4K`;
    }
    
    enhancedPrompt = `${enhancedPrompt}, aspect ratio ${aspectRatio}`;

    const messages: any[] = [
      {
        role: 'user',
        content: baseImage 
          ? [
              {
                type: 'text',
                text: enhancedPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: baseImage
                }
              }
            ]
          : enhancedPrompt
      }
    ];

    console.log('[unified-image-generator] Calling AI with enhanced prompt');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages,
        modalities: ['image', 'text'],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[unified-image-generator] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    console.log('[unified-image-generator] Image generated successfully');

    // Store in database if user is authenticated
    let imageId: string | undefined;
    if (userId) {
      const { data: imageRecord, error: dbError } = await supabase
        .from('generated_images')
        .insert({
          user_id: userId,
          prompt: prompt,
          image_url: imageUrl,
          style: style,
          metadata: {
            mode,
            aspectRatio,
            quality,
            hasBaseImage: !!baseImage
          }
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('[unified-image-generator] Database error:', dbError);
      } else {
        imageId = imageRecord?.id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        imageId,
        prompt,
        mode,
        style,
        aspectRatio,
        quality,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[unified-image-generator] Error:', error);
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
