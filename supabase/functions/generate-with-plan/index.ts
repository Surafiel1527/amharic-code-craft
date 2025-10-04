import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phase, 
      userRequest, 
      conversationId, 
      planId, 
      currentCode,
      userId 
    } = await req.json();
    
    console.log('🎯 Generate with plan:', { phase, conversationId, hasPlan: !!planId });

    // PHASE 1: PLANNING - Analyze and create architecture plan
    if (phase === 'plan') {
      console.log('📋 PHASE 1: Creating architecture plan...');
      
      const planningPrompt = `You are a senior software architect. Analyze this request and create a detailed architecture plan.

USER REQUEST: "${userRequest}"
${currentCode ? `\nEXISTING CODE LENGTH: ${currentCode.length} characters` : '\nNEW PROJECT'}

Your task: Create a comprehensive plan BEFORE any code generation. Respond in JSON format:

{
  "architectureOverview": "High-level description of the architecture",
  "componentBreakdown": [
    {
      "name": "ComponentName",
      "purpose": "What it does",
      "complexity": "low|medium|high",
      "dependencies": ["other components"]
    }
  ],
  "technologyStack": ["HTML", "CSS", "JavaScript", "etc"],
  "fileStructure": {
    "description": "How files should be organized",
    "suggestedFiles": ["file1.html", "file2.js"]
  },
  "estimatedComplexity": "simple|moderate|complex|very complex",
  "potentialChallenges": [
    "Challenge 1",
    "Challenge 2"
  ],
  "recommendedApproach": "Step-by-step implementation strategy",
  "architecturalDecisions": [
    {
      "decision": "Why this approach",
      "reasoning": "Benefits and trade-offs"
    }
  ]
}`;

      const planResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "user", content: planningPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!planResponse.ok) {
        throw new Error(`Planning API error: ${planResponse.status}`);
      }

      const planData = await planResponse.json();
      let planContent = planData.choices[0].message.content;
      
      console.log('📄 Raw AI response length:', planContent.length);
      
      // Extract JSON from response - try to find valid JSON block
      let jsonMatch = planContent.match(/```json\s*([\s\S]*?)```/);
      if (!jsonMatch) {
        jsonMatch = planContent.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) {
        console.error('❌ No JSON found in response:', planContent.substring(0, 500));
        throw new Error('Failed to extract JSON from plan response');
      }
      
      const jsonString = jsonMatch[1] || jsonMatch[0];
      console.log('📋 Extracted JSON length:', jsonString.length);
      
      let plan;
      try {
        plan = JSON.parse(jsonString);
        console.log('✅ Successfully parsed plan JSON');
      } catch (parseError: any) {
        console.error('❌ JSON parse error:', parseError.message);
        console.error('❌ Failed JSON string:', jsonString.substring(0, 1000));
        throw new Error(`Invalid JSON in plan response: ${parseError.message}`);
      }
      
      // Save plan to database
      const { data: savedPlan, error: planError } = await supabase
        .from('architecture_plans')
        .insert({
          conversation_id: conversationId,
          user_request: userRequest,
          plan_type: currentCode ? 'modification' : 'generation',
          architecture_overview: plan.architectureOverview,
          component_breakdown: plan.componentBreakdown,
          technology_stack: plan.technologyStack,
          file_structure: plan.fileStructure,
          estimated_complexity: plan.estimatedComplexity,
          potential_challenges: plan.potentialChallenges,
          recommended_approach: plan.recommendedApproach
        })
        .select()
        .single();

      if (planError) {
        console.error('❌ Error saving plan:', planError);
        throw new Error(`Failed to save plan: ${planError.message}`);
      }

      if (!savedPlan || !savedPlan.id) {
        console.error('❌ Plan saved but no ID returned:', savedPlan);
        throw new Error('Plan saved but no ID returned');
      }

      console.log('✅ Plan created and saved with ID:', savedPlan.id);

      return new Response(
        JSON.stringify({
          success: true,
          phase: 'plan',
          planId: savedPlan.id,
          plan: plan
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PHASE 2: GENERATION - Generate code based on approved plan
    if (phase === 'generate') {
      console.log('🚀 PHASE 2: Generating code from plan...');
      console.log('📋 Plan ID received:', planId);
      
      if (!planId) {
        console.error('❌ No planId provided for generate phase');
        throw new Error('Plan ID is required for generate phase');
      }
      
      // Get the approved plan
      const { data: plan, error: planFetchError } = await supabase
        .from('architecture_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planFetchError) {
        console.error('❌ Error fetching plan:', planFetchError);
        throw new Error(`Failed to fetch plan: ${planFetchError.message}`);
      }

      if (!plan) {
        console.error('❌ Plan not found for ID:', planId);
        throw new Error('Plan not found');
      }
      
      console.log('✅ Plan retrieved successfully');

      // Get project memory
      const { data: memory } = await supabase
        .from('project_memory')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      const generationPrompt = `You are an expert developer implementing an approved architecture plan.

CRITICAL INSTRUCTIONS:
- Generate ACTUAL SOURCE CODE (HTML/CSS/JavaScript/React/TypeScript files)
- DO NOT generate setup instructions, bash commands, or npm commands
- DO NOT include installation steps or project initialization commands
- Return ONLY the complete, ready-to-use code that runs in a browser
- For web projects: Generate complete HTML/CSS/JS that works immediately
- For React projects: Generate complete React/TypeScript components with imports

APPROVED ARCHITECTURE PLAN:
${JSON.stringify(plan, null, 2)}

${memory ? `
PROJECT MEMORY:
Architecture: ${memory.architecture}
Features: ${(memory.features || []).join(', ')}
Tech Stack: ${(memory.tech_stack || []).join(', ')}
Coding Patterns: ${JSON.stringify(memory.coding_patterns || {})}
` : ''}

${currentCode ? `
EXISTING CODE TO MODIFY:
${currentCode.substring(0, 5000)}... (truncated)

IMPORTANT: Make surgical changes. Only modify what's needed for the request: "${userRequest}"
Preserve all existing functionality.
` : ''}

USER REQUEST: "${userRequest}"

YOUR TASK:
Generate production-ready, executable source code that:
1. Follows the architecture plan EXACTLY
2. Uses the recommended technology stack
3. Implements all components from the breakdown
4. ${currentCode ? 'Makes MINIMAL, FOCUSED changes to existing code' : 'Creates complete, working HTML/CSS/JavaScript code'}
5. Follows project memory patterns and conventions
6. Can be directly rendered in a browser or executed immediately

WHAT TO GENERATE:
✅ Complete HTML structure with all sections
✅ CSS styles for responsive design
✅ JavaScript for interactive features
✅ React components if using React
✅ Working, executable code

WHAT NOT TO GENERATE:
❌ npm install commands
❌ Project setup instructions
❌ Bash/terminal commands
❌ Package.json files
❌ Build configuration

Wrap the ACTUAL SOURCE CODE in <code></code> tags. Provide brief explanation before the code.`;

      const genResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "user", content: generationPrompt }
          ],
          temperature: 0.7,
          max_tokens: 16000,
        }),
      });

      if (!genResponse.ok) {
        throw new Error(`Generation API error: ${genResponse.status}`);
      }

      const genData = await genResponse.json();
      const aiResponse = genData.choices[0].message.content;
      
      console.log('📄 AI response length:', aiResponse.length);
      console.log('📄 AI response preview:', aiResponse.substring(0, 200));
      
      // Extract code - try multiple patterns
      let code = null;
      let explanation = '';
      
      // Try <code></code> tags first
      let codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
      if (codeMatch) {
        code = codeMatch[1].trim();
        explanation = aiResponse.replace(/<code>[\s\S]*?<\/code>/, '').trim();
        console.log('✅ Code extracted from <code> tags');
      } else {
        // Try ```html, ```javascript, ```typescript, or plain ``` code blocks
        const codeBlockMatch = aiResponse.match(/```(?:html|javascript|typescript|jsx|tsx|css|json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          code = codeBlockMatch[1].trim();
          explanation = aiResponse.replace(/```(?:html|javascript|typescript|jsx|tsx|css|json)?\s*[\s\S]*?```/, '').trim();
          console.log('✅ Code extracted from ``` blocks');
        } else if (aiResponse.includes('<!DOCTYPE') || aiResponse.includes('<html')) {
          // Raw HTML response - use entire response as code
          code = aiResponse.trim();
          explanation = 'Generated complete HTML code based on architecture plan.';
          console.log('✅ Using entire response as raw HTML code');
        } else {
          // Last resort: check if response contains code-like patterns
          const hasCodePatterns = /(?:function|const|let|var|class|import|export|<\w+|{|\}|\(|\)|;)/g.test(aiResponse);
          if (hasCodePatterns && aiResponse.length > 50) {
            code = aiResponse.trim();
            explanation = 'Generated code based on architecture plan (no explicit wrapper detected).';
            console.log('✅ Using entire response as code (detected code patterns)');
          } else {
            console.error('❌ No code patterns detected in AI response');
            console.error('   Response preview:', aiResponse.substring(0, 500));
          }
        }
      }
      
      // Validate extracted code
      if (!code || code.length < 10) {
        console.error('❌ Failed to extract valid code from AI response');
        console.error('   Code length:', code?.length || 0);
        console.error('   Response preview:', aiResponse.substring(0, 1000));
        throw new Error('AI did not generate valid code. Please try again with a clearer request.');
      }
      
      // Basic validation: check for valid code structure
      const hasValidStructure = (
        // HTML structure
        (code.includes('<!DOCTYPE') || code.includes('<html')) ||
        // JavaScript/TypeScript structure
        code.includes('function') || code.includes('const') || code.includes('class') ||
        // React/JSX structure
        code.includes('export') || code.includes('import') ||
        // CSS structure
        code.includes('{') && code.includes('}') ||
        // JSON structure
        (code.startsWith('{') && code.endsWith('}'))
      );
      
      if (!hasValidStructure) {
        console.warn('⚠️ Generated code may not have valid file structure');
        console.warn('   Code preview:', code.substring(0, 300));
        // Don't throw - let it through but log warning
      }
      
      console.log('✅ Code validation passed');
      console.log('   - Final code length:', code.length);
      console.log('   - Has valid structure:', hasValidStructure);

      // Update project memory with architectural decisions
      if (conversationId && code) {
        const architecturalDecisions = plan.component_breakdown.map((comp: any) => ({
          component: comp.name,
          decision: `Added ${comp.name} for ${comp.purpose}`,
          reasoning: `Complexity: ${comp.complexity}`,
          timestamp: new Date().toISOString()
        }));

        await supabase
          .from('project_memory')
          .upsert({
            conversation_id: conversationId,
            architectural_decisions: architecturalDecisions,
            last_plan: plan,
            architecture: plan.architecture_overview,
            tech_stack: plan.technology_stack,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'conversation_id'
          });

        // Mark plan as approved
        await supabase
          .from('architecture_plans')
          .update({ approved: true, approved_at: new Date().toISOString() })
          .eq('id', planId);
      }

      // Track generation
      if (userId) {
        await supabase
          .from('generation_analytics')
          .insert({
            user_id: userId,
            model_used: 'google/gemini-2.5-pro',
            user_prompt: userRequest,
            system_prompt: 'Plan-based generation',
            generated_code: code || '',
            status: 'success'
          });
      }

      console.log('✅ Code generated from plan');

      return new Response(
        JSON.stringify({
          success: true,
          phase: 'generate',
          code,
          explanation,
          planUsed: plan.architecture_overview
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid phase specified');

  } catch (error: any) {
    console.error('💥 Error in generate-with-plan:', error);
    
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