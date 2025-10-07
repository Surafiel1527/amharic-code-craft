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
    const { userRequest, framework, projectId, conversationId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Create a TransformStream for SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Send SSE event helper
    const sendEvent = async (event: string, data: any) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };

    // Start background generation
    (async () => {
      try {
        await sendEvent('status', { message: 'Analyzing requirements...', progress: 10 });

        const systemPrompt = `You are an expert code generator. Generate a complete ${framework} project based on the user's request.

Framework: ${framework}
${framework === 'react' ? 'Use React 18+ with TypeScript, Vite, and modern patterns.' : ''}
${framework === 'html' ? 'Use semantic HTML5, modern CSS, and vanilla JavaScript.' : ''}
${framework === 'vue' ? 'Use Vue 3 with Composition API and TypeScript.' : ''}

Return a JSON object with this structure:
{
  "files": [
    {
      "path": "src/App.tsx",
      "content": "file content here",
      "type": "component"
    }
  ],
  "framework": "${framework}",
  "architecture": "brief description",
  "stats": {
    "totalFiles": 5,
    "dependencies": 3,
    "totalSize": 12345
  }
}

Include all necessary files: components, styles, config files, package.json, etc.`;

        await sendEvent('status', { message: 'Generating file structure...', progress: 30 });

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userRequest }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          if (response.status === 402) {
            throw new Error("AI credits depleted. Please add credits to continue.");
          }
          throw new Error(`AI generation failed: ${response.status}`);
        }

        await sendEvent('status', { message: 'Processing generated files...', progress: 60 });

        const aiResponse = await response.json();
        const content = aiResponse.choices[0].message.content;
        const result = JSON.parse(content);

        // Stream each file as it's "generated"
        for (let i = 0; i < result.files.length; i++) {
          const file = result.files[i];
          await sendEvent('file', {
            file,
            progress: 60 + (i / result.files.length) * 30,
            current: i + 1,
            total: result.files.length
          });
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for visual effect
        }

        await sendEvent('status', { message: 'Finalizing project...', progress: 95 });

        // Send complete result
        await sendEvent('complete', {
          ...result,
          projectId,
          conversationId
        });

        await sendEvent('status', { message: 'Done!', progress: 100 });

      } catch (error) {
        console.error('Generation error:', error);
        await sendEvent('error', { 
          message: error instanceof Error ? error.message : 'Generation failed'
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Stream setup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
