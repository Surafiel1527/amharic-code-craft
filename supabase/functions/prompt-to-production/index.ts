import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log(`✅ Authenticated user: ${user.id}`);

    const { prompt, projectName } = await req.json();

    if (!prompt || !projectName) {
      throw new Error('Prompt and project name are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('🚀 Starting AI-powered prompt-to-production pipeline...');
    console.log(`📝 User prompt: ${prompt}`);

    // Create project record
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: projectName,
        html_code: '',
      })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    const projectId = project.id;
    console.log(`✅ Project created: ${projectId}`);

    // PHASE 1: AI Code Generation
    console.log('🤖 Phase 1: Generating code with AI (google/gemini-2.5-flash)...');
    
    const systemPrompt = `You are an expert React/TypeScript developer. Generate a complete, production-ready React application based on the user's requirements.

CRITICAL INSTRUCTIONS:
1. Generate ALL necessary files with complete, working code - no placeholders or TODO comments
2. Use React 18.3.1, TypeScript, and modern best practices
3. Include proper TypeScript types for everything
4. Use functional components with hooks
5. Add proper error handling and loading states
6. Include responsive design with Tailwind CSS
7. Generate package.json with ALL required dependencies
8. Return files in this exact JSON format:

{
  "files": [
    {
      "path": "src/App.tsx",
      "content": "// complete file content here",
      "type": "component"
    },
    {
      "path": "package.json",
      "content": "// complete package.json with all dependencies",
      "type": "config"
    }
  ],
  "architecture": "Brief description of the architecture",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
    // list ALL dependencies needed
  }
}

REQUIRED FILES:
- package.json (with ALL dependencies and scripts)
- tsconfig.json
- vite.config.ts
- index.html
- src/main.tsx
- src/App.tsx
- src/index.css (with Tailwind directives)
- Any additional components needed

USER REQUEST: Generate a fully functional application. Include all features requested, with proper state management, error handling, and a beautiful UI.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    console.log('✅ AI response received');

    // Parse AI response
    let generatedCode;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      generatedCode = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI response:', aiContent);
      throw new Error('AI generated invalid JSON format');
    }

    if (!generatedCode.files || !Array.isArray(generatedCode.files)) {
      throw new Error('AI did not generate files array');
    }

    console.log(`✅ Generated ${generatedCode.files.length} files`);

    // PHASE 2: Analyze Dependencies
    console.log('📦 Phase 2: Analyzing dependencies...');
    
    let dependencies = generatedCode.dependencies || {};
    let devDependencies: Record<string, string> = {
      '@vitejs/plugin-react': '^4.3.1',
      'vite': '^5.4.2',
      'typescript': '^5.5.3',
      '@types/react': '^18.3.3',
      '@types/react-dom': '^18.3.0',
    };

    // Find package.json in generated files
    const packageJsonFile = generatedCode.files.find((f: any) => f.path === 'package.json');
    if (packageJsonFile) {
      try {
        const pkgJson = JSON.parse(packageJsonFile.content);
        if (pkgJson.dependencies) {
          dependencies = { ...dependencies, ...pkgJson.dependencies };
        }
        if (pkgJson.devDependencies) {
          devDependencies = { ...devDependencies, ...pkgJson.devDependencies };
        }
      } catch (e) {
        console.warn('Could not parse package.json from AI:', e);
      }
    }

    // Ensure base dependencies
    dependencies['react'] = dependencies['react'] || '^18.3.1';
    dependencies['react-dom'] = dependencies['react-dom'] || '^18.3.1';

    console.log(`✅ Found ${Object.keys(dependencies).length} dependencies`);

    // PHASE 3: Build Project Files
    console.log('🔨 Phase 3: Building project files...');
    const projectFiles: Record<string, string> = {};

    for (const file of generatedCode.files) {
      projectFiles[file.path] = file.content;
    }

    // Ensure package.json exists and is properly formatted
    if (!projectFiles['package.json']) {
      projectFiles['package.json'] = JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview',
        },
        dependencies,
        devDependencies,
      }, null, 2);
    }

    // Ensure tsconfig.node.json exists
    if (!projectFiles['tsconfig.node.json']) {
      projectFiles['tsconfig.node.json'] = JSON.stringify({
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          allowSyntheticDefaultImports: true,
        },
        include: ['vite.config.ts'],
      }, null, 2);
    }

    console.log(`✅ Built ${Object.keys(projectFiles).length} files`);

    // PHASE 4: Install Dependencies via Unified Package Manager
    console.log('⚙️ Phase 4: Installing dependencies...');
    try {
      const { error: installError } = await supabase.functions.invoke('unified-package-manager', {
        body: {
          operation: 'install',
          projectId,
          packages: Object.entries(dependencies).map(([name, version]) => ({
            name,
            version,
          })),
        },
      });

      if (installError) {
        console.warn('Package installation warning:', installError);
      } else {
        console.log('✅ Dependencies installed');
      }
    } catch (e) {
      console.warn('Package installation failed, continuing:', e);
    }

    // PHASE 5: Deploy via Complete Vercel Pipeline
    console.log('🚀 Phase 5: Deploying to Vercel...');
    const { data: deploymentData, error: deploymentError } = await supabase.functions.invoke(
      'complete-vercel-pipeline',
      {
        body: {
          projectId,
          projectName,
          files: projectFiles,
          runTests: true,
          runBuild: true,
        },
      }
    );

    if (deploymentError) {
      console.error('Deployment error:', deploymentError);
      throw new Error(`Deployment failed: ${deploymentError.message}`);
    }

    console.log('✅ Deployment completed:', deploymentData);

    // Update project with generated code
    const mainContent = projectFiles['src/App.tsx'] || projectFiles['index.html'] || '';
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        html_code: mainContent,
      })
      .eq('id', projectId);

    if (updateError) {
      console.warn('Failed to update project code:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        deploymentId: deploymentData.deploymentId,
        filesGenerated: generatedCode.files.length,
        dependenciesInstalled: Object.keys(dependencies).length,
        architecture: generatedCode.architecture || 'React + TypeScript + Vite',
        message: 'Project generated with AI and deployed successfully!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Pipeline error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('Authentication') ? 401 : 400;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
