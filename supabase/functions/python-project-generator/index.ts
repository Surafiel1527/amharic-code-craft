import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PythonProject {
  projectName: string;
  projectType: 'flask' | 'django' | 'fastapi' | 'script' | 'data-science' | 'pygame';
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  dependencies: string[];
  setupInstructions: string;
  runCommand: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userRequest, 
      projectType = 'script',
      projectName = 'my-python-project'
    } = await req.json();

    if (!userRequest) {
      throw new Error('User request is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const generationPrompt = `You are an expert Python developer. Generate a complete, production-ready Python project.

User Request: "${userRequest}"
Project Type: ${projectType}
Project Name: ${projectName}

Generate a complete Python project with:
1. All necessary Python files with complete, working code
2. requirements.txt with all dependencies
3. README.md with setup and usage instructions
4. Any configuration files needed (.env.example, config.py, etc.)
5. Proper project structure and best practices

For ${projectType}:
${projectType === 'flask' ? '- Create a Flask web application with routes, templates if needed\n- Include error handling and CORS\n- Add environment configuration' : ''}
${projectType === 'django' ? '- Create a Django project with proper app structure\n- Include models, views, urls\n- Add settings configuration' : ''}
${projectType === 'fastapi' ? '- Create a FastAPI application with async support\n- Include models with Pydantic\n- Add API documentation setup' : ''}
${projectType === 'pygame' ? '- Create a game with proper game loop\n- Include sprite handling and collision detection\n- Add controls and game logic' : ''}
${projectType === 'data-science' ? '- Include data loading and preprocessing\n- Add visualization code\n- Include analysis and insights' : ''}

Return ONLY valid JSON:
{
  "projectName": "${projectName}",
  "projectType": "${projectType}",
  "files": [
    {
      "path": "main.py",
      "content": "# Complete Python code here",
      "description": "Main application file"
    }
  ],
  "dependencies": ["flask==2.3.0", "requests==2.31.0"],
  "setupInstructions": "Step by step setup guide",
  "runCommand": "python main.py"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: generationPrompt
        }],
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let project: PythonProject;

    if (jsonMatch) {
      project = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse project structure from AI response');
    }

    // Log to database
    if (user) {
      await supabaseClient.from('python_projects').insert({
        user_id: user.id,
        project_name: project.projectName,
        project_type: project.projectType,
        user_request: userRequest,
        files_count: project.files.length,
        dependencies_count: project.dependencies.length,
      });
    }

    return new Response(JSON.stringify(project), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Python project generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
