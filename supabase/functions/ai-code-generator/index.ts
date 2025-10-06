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
    const { prompt, userId, jobId } = await req.json();
    
    if (!prompt || !userId || !jobId) {
      throw new Error('Missing required fields');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🎯 Starting AI code generation for job:', jobId);

    // Update job status
    await supabase
      .from('ai_generation_jobs')
      .update({ 
        status: 'processing',
        current_step: 'Planning architecture...',
        progress: 10
      })
      .eq('id', jobId);

    // Phase 1: Architecture Planning
    const architecturePrompt = `You are an expert software architect. Create a detailed architecture plan for this request:

${prompt}

Return a JSON structure with:
1. components: Array of component names and purposes
2. database_schema: Tables needed with columns
3. features: List of features to implement
4. file_structure: Files to create
5. complexity: "simple", "medium", or "complex"

Be specific and actionable.`;

    console.log('🏗️ Phase 1: Architecture planning...');
    
    const archResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert software architect. Return valid JSON only.' },
          { role: 'user', content: architecturePrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!archResponse.ok) {
      throw new Error(`Architecture planning failed: ${archResponse.status}`);
    }

    const archData = await archResponse.json();
    const architectureText = archData.choices[0].message.content;
    
    // Extract JSON from response
    let architecture;
    try {
      const jsonMatch = architectureText.match(/\{[\s\S]*\}/);
      architecture = JSON.parse(jsonMatch ? jsonMatch[0] : architectureText);
    } catch (e) {
      console.error('Failed to parse architecture JSON:', architectureText);
      architecture = {
        components: ['Main component'],
        database_schema: [],
        features: ['Basic functionality'],
        file_structure: ['src/pages/Generated.tsx'],
        complexity: 'simple'
      };
    }

    console.log('✅ Architecture planned:', architecture);

    await supabase
      .from('ai_generation_jobs')
      .update({ 
        progress: 30,
        current_step: 'Generating database schema...',
        phases: [
          { name: 'Architecture Planning', completed: true },
          { name: 'Database Schema', completed: false },
          { name: 'Code Generation', completed: false }
        ]
      })
      .eq('id', jobId);

    // Phase 2: Database Schema Generation
    let databaseSQL = '';
    if (architecture.database_schema && architecture.database_schema.length > 0) {
      console.log('🗄️ Phase 2: Generating database schema...');
      
      const schemaPrompt = `Generate PostgreSQL SQL for these tables with proper RLS policies:

${JSON.stringify(architecture.database_schema, null, 2)}

Requirements:
- Use UUID primary keys with gen_random_uuid()
- Add user_id columns where needed
- Enable RLS on all tables
- Create policies for users to manage their own data
- Add indexes for foreign keys
- Add created_at and updated_at timestamps

Return ONLY executable SQL, no explanations.`;

      const schemaResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a PostgreSQL expert. Generate secure, production-ready SQL with RLS.' },
            { role: 'user', content: schemaPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (schemaResponse.ok) {
        const schemaData = await schemaResponse.json();
        databaseSQL = schemaData.choices[0].message.content;
        console.log('✅ Database schema generated');
      }
    }

    await supabase
      .from('ai_generation_jobs')
      .update({ 
        progress: 50,
        current_step: 'Generating React components...',
        phases: [
          { name: 'Architecture Planning', completed: true },
          { name: 'Database Schema', completed: true },
          { name: 'Code Generation', completed: false }
        ]
      })
      .eq('id', jobId);

    // Phase 3: Code Generation
    console.log('⚛️ Phase 3: Generating React components...');
    
    const codePrompt = `Generate a complete React TypeScript component for this application:

${prompt}

Architecture plan:
${JSON.stringify(architecture, null, 2)}

Requirements:
- Use React with TypeScript
- Use Supabase client from @/integrations/supabase/client
- Use shadcn/ui components from @/components/ui/*
- Use tailwind CSS for styling
- Include proper error handling
- Add loading states
- Use toast notifications from 'sonner'
- Follow React best practices
- Make it production-ready

Component should be exported as default and be a complete, working implementation.

Return ONLY the TypeScript/React code, no explanations.`;

    const codeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert React developer. Generate clean, production-ready code.' },
          { role: 'user', content: codePrompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!codeResponse.ok) {
      throw new Error(`Code generation failed: ${codeResponse.status}`);
    }

    const codeData = await codeResponse.json();
    let generatedCode = codeData.choices[0].message.content;
    
    // Clean up code - remove markdown formatting
    generatedCode = generatedCode
      .replace(/```typescript\n?/g, '')
      .replace(/```tsx\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('✅ Code generated, length:', generatedCode.length);

    await supabase
      .from('ai_generation_jobs')
      .update({ 
        progress: 90,
        current_step: 'Finalizing generation...',
        phases: [
          { name: 'Architecture Planning', completed: true },
          { name: 'Database Schema', completed: true },
          { name: 'Code Generation', completed: true }
        ]
      })
      .eq('id', jobId);

    // Store results
    const outputData = {
      architecture,
      database_sql: databaseSQL,
      generated_files: [
        {
          path: 'src/pages/Generated.tsx',
          content: generatedCode,
          type: 'component'
        }
      ],
      summary: {
        components_created: architecture.components?.length || 1,
        tables_created: architecture.database_schema?.length || 0,
        features_implemented: architecture.features?.length || 1
      }
    };

    await supabase
      .from('ai_generation_jobs')
      .update({ 
        status: 'completed',
        progress: 100,
        current_step: 'Generation complete!',
        output_data: outputData,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('🎉 Generation completed successfully!');

    return new Response(
      JSON.stringify({ 
        success: true,
        output: outputData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Generation error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});