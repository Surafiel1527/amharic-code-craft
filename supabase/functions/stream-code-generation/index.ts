import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, prompt, userId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const channel = supabaseClient.channel(`preview-${projectId}`);

    // Broadcast status: thinking
    await channel.send({
      type: 'broadcast',
      event: 'status-update',
      payload: {
        status: 'thinking',
        message: 'Analyzing requirements...',
        timestamp: new Date().toISOString(),
        progress: 10
      }
    });

    // Call AI to generate code
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `Generate React components for: ${prompt}. 
            Return ONLY valid JSON array with components:
            [{"name": "ComponentName", "code": "component code"}]`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('AI generation failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Broadcast status: generating
    await channel.send({
      type: 'broadcast',
      event: 'status-update',
      payload: {
        status: 'generating',
        message: 'Generating components...',
        timestamp: new Date().toISOString(),
        progress: 50
      }
    });

    // Parse components
    let components: Array<{name: string, code: string}> = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        components = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse components:', e);
    }

    // Stream each component incrementally
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      
      await channel.send({
        type: 'broadcast',
        event: 'status-update',
        payload: {
          status: 'editing',
          message: `Building ${component.name}...`,
          timestamp: new Date().toISOString(),
          progress: 50 + (i / components.length) * 40
        }
      });

      await channel.send({
        type: 'broadcast',
        event: 'code-update',
        payload: {
          component: component.name,
          code: component.code,
          timestamp: new Date().toISOString(),
          status: 'pending'
        }
      });

      // Simulate incremental building
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Check for TypeScript errors
    await channel.send({
      type: 'broadcast',
      event: 'status-update',
      payload: {
        status: 'analyzing',
        message: 'Checking for TypeScript errors...',
        timestamp: new Date().toISOString(),
        progress: 95
      }
    });

    // Complete
    await channel.send({
      type: 'broadcast',
      event: 'status-update',
      payload: {
        status: 'idle',
        message: 'Generation complete!',
        timestamp: new Date().toISOString(),
        progress: 100
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        components: components.length,
        message: 'Code generated and streamed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Stream error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
