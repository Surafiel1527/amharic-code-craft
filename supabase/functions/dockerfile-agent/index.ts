import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DockerfileRequest {
  projectDescription: string;
  language?: string;
  framework?: string;
  additionalServices?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, language, framework, additionalServices = [] }: DockerfileRequest = await req.json();

    if (!projectDescription) {
      return new Response(
        JSON.stringify({ error: 'Project description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🐳 DOCKERFILE AGENT: Starting generation');
    console.log('Project:', projectDescription);
    console.log('Language:', language || 'auto-detect');
    console.log('Framework:', framework || 'auto-detect');

    // STEP 1: Load Docker knowledge from professional_knowledge
    const { data: dockerKnowledge } = await supabase
      .from('professional_knowledge')
      .select('*')
      .eq('domain', 'docker')
      .order('applicability_score', { ascending: false })
      .limit(5);

    console.log(`📚 Loaded ${dockerKnowledge?.length || 0} Docker knowledge entries`);

    // STEP 2: Analyze project requirements
    const analysisPrompt = `You are a Docker expert. Analyze this project and return ONLY a JSON object with the analysis.

Project: ${projectDescription}
${language ? `Language: ${language}` : ''}
${framework ? `Framework: ${framework}` : ''}
${additionalServices.length > 0 ? `Additional Services: ${additionalServices.join(', ')}` : ''}

Return this exact JSON structure:
{
  "detectedLanguage": "string",
  "detectedFramework": "string",
  "baseImage": "string (e.g., node:18-alpine)",
  "requiredPackages": ["array", "of", "system", "packages"],
  "buildSteps": ["array", "of", "build", "commands"],
  "exposedPorts": [8080],
  "environmentVariables": ["ENV_VAR_1", "ENV_VAR_2"],
  "volumeMounts": ["path/to/mount"]
}`;

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.2
      })
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    let analysisContent = analysisData.choices[0].message.content;
    
    // Extract JSON from markdown blocks if present
    const jsonMatch = analysisContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      analysisContent = jsonMatch[1];
    }
    
    const analysis = JSON.parse(analysisContent);
    console.log('✅ STEP 1: Project analysis complete', analysis);

    // STEP 3: Generate Dockerfile
    const knowledgeContext = dockerKnowledge?.map(k => 
      `${k.title}:\n${k.content}\n\nBest Practices:\n${k.code_examples?.map((ex: any) => ex.description).join('\n') || ''}`
    ).join('\n\n---\n\n') || '';

    const dockerfilePrompt = `You are a Docker expert. Generate a production-ready Dockerfile based on this analysis.

PROJECT ANALYSIS:
${JSON.stringify(analysis, null, 2)}

DOCKER BEST PRACTICES:
${knowledgeContext}

CRITICAL RULES:
1. Use multi-stage builds when appropriate
2. Follow security best practices (non-root user, minimal layers)
3. Optimize for caching (copy package files first, then source)
4. Include health checks
5. Use .dockerignore patterns in comments
6. Add clear comments explaining each section

Return ONLY the raw Dockerfile content, no markdown blocks.`;

    const dockerfileResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: dockerfilePrompt }],
        temperature: 0.1
      })
    });

    if (!dockerfileResponse.ok) {
      throw new Error(`Dockerfile generation failed: ${dockerfileResponse.status}`);
    }

    const dockerfileData = await dockerfileResponse.json();
    let dockerfileContent = dockerfileData.choices[0].message.content;
    
    // Clean up any markdown blocks
    const dockerfileMatch = dockerfileContent.match(/```(?:dockerfile)?\s*([\s\S]*?)\s*```/);
    if (dockerfileMatch) {
      dockerfileContent = dockerfileMatch[1];
    }
    
    console.log('✅ STEP 2: Dockerfile generated');

    // STEP 4: Generate docker-compose.yml if additional services requested
    let dockerComposeContent = null;
    if (additionalServices.length > 0) {
      const composePrompt = `Generate a docker-compose.yml file for this project with these services: ${additionalServices.join(', ')}

Base service uses the Dockerfile we generated.
Add the requested services with proper configuration.

Return ONLY the raw docker-compose.yml content, no markdown blocks.`;

      const composeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: composePrompt }],
          temperature: 0.1
        })
      });

      if (composeResponse.ok) {
        const composeData = await composeResponse.json();
        let composeContent = composeData.choices[0].message.content;
        
        const composeMatch = composeContent.match(/```(?:yaml|yml)?\s*([\s\S]*?)\s*```/);
        if (composeMatch) {
          composeContent = composeMatch[1];
        }
        
        dockerComposeContent = composeContent;
        console.log('✅ STEP 3: docker-compose.yml generated');
      }
    }

    console.log('🎉 DOCKERFILE AGENT: Generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        agent: 'dockerfile-agent',
        analysis: analysis,
        files: {
          'Dockerfile': dockerfileContent,
          ...(dockerComposeContent && { 'docker-compose.yml': dockerComposeContent })
        },
        instructions: [
          'Place the Dockerfile in your project root',
          'Build: docker build -t your-app .',
          'Run: docker run -p 8080:8080 your-app',
          ...(dockerComposeContent ? ['Or use: docker-compose up'] : [])
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Dockerfile agent error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
