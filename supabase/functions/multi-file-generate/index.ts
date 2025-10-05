import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Framework detection patterns
const detectFramework = (request: string): string => {
  if (/react|jsx|tsx|component/i.test(request)) return 'react';
  if (/vue|\.vue/i.test(request)) return 'vue';
  if (/svelte/i.test(request)) return 'svelte';
  if (/angular/i.test(request)) return 'angular';
  return 'vanilla';
};

// Dependency analyzer
const analyzeDependencies = (code: string, fileType: string): string[] => {
  const deps = new Set<string>();
  
  // Extract imports
  const importMatches = code.matchAll(/import\s+.+?from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    const pkg = match[1];
    if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
      deps.add(pkg.split('/')[0]);
    }
  }
  
  // Common framework dependencies
  if (fileType === 'tsx' || fileType === 'jsx') {
    deps.add('react');
    deps.add('react-dom');
  }
  
  return Array.from(deps);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userRequest, projectId, conversationId, framework } = await req.json();
    
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
    const detectedFramework = framework || detectFramework(userRequest);

    // Step 1: Get architecture plan with framework awareness
    const planPrompt = `Analyze this request and create a multi-file ${detectedFramework} project structure: "${userRequest}"

Consider best practices for ${detectedFramework} projects, including:
- Proper component structure
- State management if needed
- Routing if multi-page
- Styling approach (CSS modules, Tailwind, styled-components)
- Build configuration

Return JSON with:
{
  "files": [
    {
      "path": "src/components/Header.tsx",
      "type": "tsx",
      "purpose": "Main header component",
      "dependencies": ["react", "lucide-react"],
      "imports": ["./styles.css"]
    }
  ],
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "architecture": "Brief architecture overview",
  "entryPoint": "index.html",
  "buildTool": "vite"
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

    // Step 2: Generate package.json
    const packageJson = {
      name: projectId || 'generated-project',
      version: '1.0.0',
      type: 'module',
      scripts: plan.scripts || {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: plan.dependencies || {},
      devDependencies: plan.devDependencies || {}
    };

    // Step 3: Generate each file with proper imports
    const generatedFiles = [];
    const allDependencies = new Set<string>();
    
    for (const fileSpec of plan.files) {
      const codePrompt = `Generate complete, production-ready ${detectedFramework} code for: ${fileSpec.path}

Purpose: ${fileSpec.purpose}
Dependencies available: ${fileSpec.dependencies?.join(', ')}
Imports needed: ${fileSpec.imports?.join(', ')}
Framework: ${detectedFramework}
User request: ${userRequest}

Important:
- Use proper TypeScript types
- Include all necessary imports
- Follow ${detectedFramework} best practices
- Add helpful comments
- Make it production-ready

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
        
        // Analyze dependencies in generated code
        const codeDeps = analyzeDependencies(cleanCode, fileSpec.type);
        codeDeps.forEach(dep => allDependencies.add(dep));
        
        generatedFiles.push({
          path: fileSpec.path,
          content: cleanCode,
          type: fileSpec.type,
          size: cleanCode.length
        });

        console.log('✅ Generated:', fileSpec.path, `(${cleanCode.length} bytes)`);
      }
    }

    // Step 4: Update package.json with discovered dependencies
    allDependencies.forEach(dep => {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = 'latest';
      }
    });

    // Add package.json to generated files
    generatedFiles.unshift({
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      type: 'json',
      size: JSON.stringify(packageJson).length
    });

    // Add README.md
    const readme = `# ${packageJson.name}

${plan.architecture || 'Generated project'}

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Generated Files

${generatedFiles.map(f => `- ${f.path}`).join('\n')}
`;

    generatedFiles.push({
      path: 'README.md',
      content: readme,
      type: 'md',
      size: readme.length
    });

    // Step 5: Save files to database
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

    // Calculate total project size
    const totalSize = generatedFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        files: generatedFiles,
        architecture: plan.architecture,
        entryPoint: plan.entryPoint,
        framework: detectedFramework,
        packageJson,
        stats: {
          totalFiles: generatedFiles.length,
          totalSize,
          dependencies: Object.keys(packageJson.dependencies).length
        }
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
