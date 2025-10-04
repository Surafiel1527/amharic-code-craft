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
    const { userRequest, projectId, conversationId } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    console.log('🎯 Multi-file generation request:', userRequest);

    // Step 1: Get architecture plan
    const planPrompt = `Analyze this request and create a multi-file project structure: "${userRequest}"

Return JSON with:
{
  "files": [
    {
      "path": "components/Header.tsx",
      "type": "tsx",
      "purpose": "Main header component",
      "dependencies": ["react", "lucide-react"]
    }
  ],
  "architecture": "Brief architecture overview",
  "entryPoint": "index.html"
}`;

    const planResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: planPrompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!planResponse.ok) throw new Error(`AI error: ${planResponse.status}`);
    
    const planData = await planResponse.json();
    const planContent = planData.choices[0].message.content;
    const jsonMatch = planContent.match(/\{[\s\S]*\}/);
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { files: [] };

    console.log('📋 Plan created:', plan.files.length, 'files');

    // Step 2: Generate each file
    const generatedFiles = [];
    
    for (const fileSpec of plan.files) {
      const codePrompt = `Generate complete, production-ready code for: ${fileSpec.path}

Purpose: ${fileSpec.purpose}
Dependencies: ${fileSpec.dependencies?.join(', ')}
User request: ${userRequest}

Return ONLY the code, no explanations.`;

      const codeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: codePrompt }],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        const code = codeData.choices[0].message.content;
        
        // Clean up code blocks
        let cleanCode = code.replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();
        
        generatedFiles.push({
          path: fileSpec.path,
          content: cleanCode,
          type: fileSpec.type
        });

        console.log('✅ Generated:', fileSpec.path);
      }
    }

    // Step 3: Save files to database
    const filesToInsert = generatedFiles.map(file => ({
      project_id: projectId,
      file_path: file.path,
      file_content: file.content,
      file_type: file.type,
      created_by: user.id
    }));

    await supabaseClient
      .from('project_files')
      .upsert(filesToInsert, {
        onConflict: 'project_id,file_path'
      });

    console.log('💾 Saved', generatedFiles.length, 'files to database');

    return new Response(
      JSON.stringify({
        success: true,
        files: generatedFiles,
        architecture: plan.architecture,
        entryPoint: plan.entryPoint
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Multi-file generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
