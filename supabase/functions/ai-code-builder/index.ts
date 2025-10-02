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

interface ProjectMemory {
  id: string;
  architecture: string;
  features: string[];
  techStack: string[];
  recentChanges: Array<{ change: string; timestamp: string }>;
  codeStructure: string;
}

// Summarize old messages to save tokens
function summarizeHistory(messages: any[]): any[] {
  if (messages.length <= 6) return messages; // Keep recent messages as-is
  
  // Keep first message (system context) and last 4 messages
  const recentMessages = messages.slice(-4);
  const oldMessages = messages.slice(1, -4);
  
  // Create summary of old messages
  const summary = {
    role: "system",
    content: `Previous conversation summary:
${oldMessages.map((m, i) => `${i + 1}. ${m.role === 'user' ? 'User requested' : 'AI completed'}: ${m.content.substring(0, 100)}...`).join('\n')}

Total previous interactions: ${oldMessages.length}`
  };
  
  return [messages[0], summary, ...recentMessages];
}

// Extract key information from code for memory
function analyzeCodeStructure(code: string): string {
  const lines = code.split('\n');
  const structure: string[] = [];
  
  // Extract functions
  const functionMatches = code.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(/g);
  if (functionMatches) {
    structure.push(`Functions: ${functionMatches.slice(0, 20).join(', ')}`);
  }
  
  // Extract classes
  const classMatches = code.match(/class\s+(\w+)/g);
  if (classMatches) {
    structure.push(`Classes: ${classMatches.join(', ')}`);
  }
  
  // Estimate complexity
  const complexity = {
    lines: lines.length,
    functions: functionMatches?.length || 0,
    classes: classMatches?.length || 0,
  };
  
  structure.push(`Complexity: ${complexity.lines} lines, ${complexity.functions} functions, ${complexity.classes} classes`);
  
  return structure.join('\n');
}

// Store project memory in database
async function saveProjectMemory(conversationId: string, memory: Partial<ProjectMemory>) {
  try {
    const { error } = await supabase
      .from('project_memory')
      .upsert({
        conversation_id: conversationId,
        architecture: memory.architecture,
        features: memory.features,
        tech_stack: memory.techStack,
        recent_changes: memory.recentChanges,
        code_structure: memory.codeStructure,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id'
      });
    
    if (error) {
      console.error('Error saving project memory:', error);
    } else {
      console.log('✅ Project memory saved');
    }
  } catch (error) {
    console.error('Failed to save project memory:', error);
  }
}

// Retrieve project memory
async function getProjectMemory(conversationId: string): Promise<ProjectMemory | null> {
  try {
    const { data, error } = await supabase
      .from('project_memory')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      architecture: data.architecture,
      features: data.features || [],
      techStack: data.tech_stack || [],
      recentChanges: data.recent_changes || [],
      codeStructure: data.code_structure
    };
  } catch (error) {
    console.error('Failed to get project memory:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, message, history, currentCode, projectContext, error, conversationId } = await req.json();
    
    console.log('🤖 AI Code Builder request:', { 
      action, 
      hasCode: !!currentCode, 
      historyLength: history?.length,
      conversationId,
      codeLength: currentCode?.length || 0
    });

    // Get or create project memory
    let projectMemory = conversationId ? await getProjectMemory(conversationId) : null;
    
    // Analyze code structure if we have code
    let codeStructure = '';
    if (currentCode && currentCode.length > 500) {
      codeStructure = analyzeCodeStructure(currentCode);
      console.log('📊 Code structure:', codeStructure);
    }

    // Build enhanced system prompt with memory
    let systemPrompt = `You are an advanced AI senior developer that can build and maintain large, complex projects.

CAPABILITIES:
1. CREATE complete projects from descriptions (e.g., "Facebook clone")
2. MODIFY existing code intelligently, even in large codebases
3. FIX errors with detailed explanations
4. BUILD and MAINTAIN projects with 40+ functions/classes
5. REMEMBER project architecture and make consistent changes
6. TEST and DEBUG complex applications

CRITICAL RULES:
- Generate complete, production-ready code
- Always respond with code in <code></code> tags
- For large projects, focus on the relevant part but maintain consistency
- When modifying, preserve existing functionality
- Explain your changes clearly
- Use modern best practices
- Make code modular and maintainable

CURRENT CONTEXT:
Action: ${action}
Project Complexity: ${currentCode ? `${currentCode.length} characters` : 'New project'}
${error ? `Error to Fix: ${error}` : ''}

${projectMemory ? `
PROJECT MEMORY:
Architecture: ${projectMemory.architecture}
Features: ${projectMemory.features.join(', ')}
Tech Stack: ${projectMemory.techStack.join(', ')}
Recent Changes: ${projectMemory.recentChanges.slice(-3).map(c => c.change).join(', ')}
Code Structure: ${projectMemory.codeStructure}
` : ''}

${codeStructure ? `
CURRENT CODE STRUCTURE:
${codeStructure}

Note: You have full context of the project. Make changes that are consistent with the existing architecture.
` : ''}

For large projects:
- You can see the entire codebase structure
- Focus changes on relevant sections
- Maintain consistency with existing patterns
- Preserve all existing functionality
- Only modify what's needed for the request`;

    // Summarize history for large conversations
    const optimizedHistory = history ? summarizeHistory(history) : [];
    
    const messages = [
      { role: "system", content: systemPrompt },
      ...optimizedHistory,
      { role: "user", content: message }
    ];

    console.log('🚀 Calling Lovable AI (Gemini 2.5 Pro)...');
    console.log('📝 Message count:', messages.length);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        temperature: 0.7,
        max_tokens: 16000, // Increased for large projects
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('rate_limit');
      } else if (response.status === 402) {
        throw new Error('payment_required');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('✅ AI response received, length:', aiResponse.length);

    // Extract code from response
    const codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
    const code = codeMatch ? codeMatch[1].trim() : null;
    
    // Extract explanation
    let explanation = aiResponse;
    if (codeMatch) {
      explanation = aiResponse.replace(/<code>[\s\S]*?<\/code>/, '').trim();
    }

    console.log('📦 Extracted:', { hasCode: !!code, explanationLength: explanation.length });

    // Update project memory in background (don't block response)
    if (conversationId && code) {
      const backgroundTask = async () => {
        try {
          const newCodeStructure = analyzeCodeStructure(code);
          
          // Extract features mentioned in the explanation
          const featureMentions = explanation.toLowerCase();
          const detectedFeatures: string[] = [];
          
          if (featureMentions.includes('login') || featureMentions.includes('auth')) detectedFeatures.push('authentication');
          if (featureMentions.includes('database') || featureMentions.includes('storage')) detectedFeatures.push('data-persistence');
          if (featureMentions.includes('responsive') || featureMentions.includes('mobile')) detectedFeatures.push('responsive-design');
          if (featureMentions.includes('api') || featureMentions.includes('fetch')) detectedFeatures.push('api-integration');
          
          const updatedMemory: Partial<ProjectMemory> = {
            architecture: action === 'create' ? 'Single-page application' : projectMemory?.architecture,
            features: [...new Set([...(projectMemory?.features || []), ...detectedFeatures])],
            techStack: ['HTML', 'CSS', 'JavaScript'],
            recentChanges: [
              ...(projectMemory?.recentChanges || []).slice(-5), // Keep last 5
              {
                change: `${action}: ${message.substring(0, 100)}`,
                timestamp: new Date().toISOString()
              }
            ],
            codeStructure: newCodeStructure
          };
          
          await saveProjectMemory(conversationId, updatedMemory);
        } catch (error) {
          console.error('Background memory update failed:', error);
        }
      };
      
      // Run in background without blocking response
      backgroundTask().catch(console.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        code,
        explanation,
        action,
        timestamp: new Date().toISOString(),
        projectComplexity: {
          hasMemory: !!projectMemory,
          codeLength: code?.length || 0,
          historyLength: optimizedHistory.length
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('💥 Error in ai-code-builder:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        type: error.message.includes('rate_limit') ? 'rate_limit' : 
              error.message.includes('payment_required') ? 'payment_required' : 'unknown'
      }),
      { 
        status: error.message.includes('rate_limit') ? 429 : 
                error.message.includes('payment_required') ? 402 : 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
