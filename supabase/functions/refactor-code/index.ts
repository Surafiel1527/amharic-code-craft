import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { code, filePath, refactorType } = await req.json();
    
    console.log('🔧 Refactoring request:', refactorType, 'for', filePath);

    const refactorPrompts: Record<string, string> = {
      'extract-component': 'Extract reusable components from this code',
      'improve-performance': 'Optimize this code for better performance',
      'add-types': 'Add comprehensive TypeScript types',
      'modernize': 'Modernize this code using latest React patterns',
      'accessibility': 'Improve accessibility and ARIA attributes',
      'error-handling': 'Add comprehensive error handling',
      'clean-code': 'Apply clean code principles and best practices'
    };

    const prompt = `${refactorPrompts[refactorType] || 'Refactor and improve'} this code:

\`\`\`
${code}
\`\`\`

Requirements:
- Maintain exact functionality
- Follow React/TypeScript best practices
- Add helpful comments
- Improve readability and maintainability

Return ONLY the refactored code, no explanations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    
    const data = await response.json();
    let refactoredCode = data.choices[0].message.content;
    
    // Clean up markdown code blocks
    refactoredCode = refactoredCode
      .replace(/```[\w]*\n/g, '')
      .replace(/```$/g, '')
      .trim();

    // Generate diff summary
    const diffPrompt = `Summarize the key improvements made in this refactoring:

Original had ${code.length} characters
Refactored has ${refactoredCode.length} characters

List 3-5 key improvements in bullet points.`;

    const diffResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: diffPrompt }],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    let improvements = [];
    if (diffResponse.ok) {
      const diffData = await diffResponse.json();
      const summary = diffData.choices[0].message.content;
      improvements = summary.split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'));
    }

    console.log('✅ Refactoring complete:', improvements.length, 'improvements');

    return new Response(
      JSON.stringify({
        success: true,
        refactoredCode,
        improvements,
        originalLength: code.length,
        refactoredLength: refactoredCode.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Refactoring error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
