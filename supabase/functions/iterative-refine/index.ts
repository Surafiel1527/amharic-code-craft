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

// Analyze code quality
async function analyzeCodeQuality(code: string) {
  const analysis: any = {
    readability: 0,
    maintainability: 0,
    performance: 0,
    security: 0,
    overall: 0,
    issues: [],
    suggestions: []
  };

  // Readability checks
  const lines = code.split('\n');
  const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  const longLines = lines.filter(line => line.length > 120).length;
  const commentLines = lines.filter(line => line.trim().startsWith('//')).length;
  
  analysis.readability = Math.max(0, 100 - (longLines * 5) - (avgLineLength > 80 ? 10 : 0));
  if (commentLines < lines.length * 0.1) {
    analysis.issues.push('Low comment density');
    analysis.suggestions.push('Add more comments to explain complex logic');
  }

  // Maintainability checks
  const functionCount = (code.match(/function|=>/g) || []).length;
  const codeLength = code.length;
  const avgFunctionSize = codeLength / Math.max(1, functionCount);
  
  analysis.maintainability = Math.max(0, 100 - (avgFunctionSize > 100 ? 20 : 0));
  if (avgFunctionSize > 100) {
    analysis.issues.push('Large functions detected');
    analysis.suggestions.push('Break down large functions into smaller, focused functions');
  }

  // Performance checks
  const nestedLoops = (code.match(/for[\s\S]*?for/g) || []).length;
  const synchronousCalls = (code.match(/\bawait\s+await\b/g) || []).length;
  
  analysis.performance = Math.max(0, 100 - (nestedLoops * 10) - (synchronousCalls * 15));
  if (nestedLoops > 0) {
    analysis.issues.push('Nested loops may cause performance issues');
    analysis.suggestions.push('Consider optimizing nested loops or using more efficient algorithms');
  }

  // Security checks
  const unsafePatterns = [
    { pattern: /eval\(/, issue: 'eval() usage' },
    { pattern: /innerHTML\s*=/, issue: 'innerHTML assignment (XSS risk)' },
    { pattern: /document\.write/, issue: 'document.write usage' }
  ];
  
  analysis.security = 100;
  unsafePatterns.forEach(({ pattern, issue }) => {
    if (pattern.test(code)) {
      analysis.security -= 20;
      analysis.issues.push(issue);
      analysis.suggestions.push(`Avoid ${issue} - use safer alternatives`);
    }
  });

  // Calculate overall score
  analysis.overall = Math.round(
    (analysis.readability + analysis.maintainability + 
     analysis.performance + analysis.security) / 4
  );

  return analysis;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      generatedCode, 
      userRequest,
      maxIterations = 3,
      targetQualityScore = 85,
      userId,
      parentGenerationId
    } = await req.json();
    
    console.log('🔄 Starting iterative refinement...');

    if (!generatedCode) {
      throw new Error('generatedCode required');
    }

    let currentCode = generatedCode;
    let iterationNumber = 0;
    let qualityScore = 0;
    const iterations: any[] = [];

    // Initial analysis
    let analysis = await analyzeCodeQuality(currentCode);
    qualityScore = analysis.overall;
    
    console.log(`📊 Initial quality score: ${qualityScore}/100`);

    // Iterative refinement loop
    while (
      iterationNumber < maxIterations && 
      qualityScore < targetQualityScore && 
      analysis.issues.length > 0
    ) {
      iterationNumber++;
      console.log(`🔁 Iteration ${iterationNumber}...`);

      // Generate refinement prompt
      const refinementPrompt = `You are refining generated code to improve quality.

CURRENT CODE:
${currentCode}

QUALITY ANALYSIS:
- Overall Score: ${qualityScore}/100
- Readability: ${analysis.readability}/100
- Maintainability: ${analysis.maintainability}/100
- Performance: ${analysis.performance}/100
- Security: ${analysis.security}/100

IDENTIFIED ISSUES:
${analysis.issues.map((issue: string, i: number) => `${i + 1}. ${issue}`).join('\n')}

IMPROVEMENT SUGGESTIONS:
${analysis.suggestions.map((sugg: string, i: number) => `${i + 1}. ${sugg}`).join('\n')}

TASK: Refine the code to address these issues. Keep the core functionality but improve:
- Code quality and readability
- Performance and efficiency
- Security and best practices

Wrap the improved code in <code></code> tags. Explain what you improved.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: refinementPrompt }],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      const codeMatch = aiResponse.match(/<code>([\s\S]*?)<\/code>/);
      const refinedCode = codeMatch ? codeMatch[1].trim() : currentCode;

      // Analyze refined code
      const previousQualityScore = qualityScore;
      analysis = await analyzeCodeQuality(refinedCode);
      qualityScore = analysis.overall;

      // Track iteration
      const iterationData = {
        iteration: iterationNumber,
        qualityBefore: previousQualityScore,
        qualityAfter: qualityScore,
        improvement: qualityScore - previousQualityScore,
        issues: analysis.issues,
        explanation: aiResponse.replace(/<code>[\s\S]*?<\/code>/, '').trim()
      };
      
      iterations.push(iterationData);

      // Store iteration in database
      if (parentGenerationId) {
        await supabase
          .from('generation_iterations')
          .insert({
            parent_generation_id: parentGenerationId,
            iteration_number: iterationNumber,
            refinement_type: 'quality_improvement',
            analysis_results: analysis,
            improvements_made: iterationData,
            quality_score_before: previousQualityScore,
            quality_score_after: qualityScore
          });
      }

      currentCode = refinedCode;
      
      console.log(`✅ Iteration ${iterationNumber} complete: ${previousQualityScore} → ${qualityScore}`);

      // Break if no improvement
      if (qualityScore <= previousQualityScore) {
        console.log('⚠️ No improvement detected, stopping refinement');
        break;
      }
    }

    const finalAnalysis = await analyzeCodeQuality(currentCode);

    console.log(`🎯 Refinement complete: ${iterations.length} iterations, final score: ${finalAnalysis.overall}/100`);

    return new Response(
      JSON.stringify({
        success: true,
        refinedCode: currentCode,
        iterations,
        summary: {
          totalIterations: iterations.length,
          initialScore: iterations[0]?.qualityBefore || qualityScore,
          finalScore: finalAnalysis.overall,
          improvement: finalAnalysis.overall - (iterations[0]?.qualityBefore || qualityScore),
          remainingIssues: finalAnalysis.issues
        },
        finalAnalysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Error in iterative refinement:', error);
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