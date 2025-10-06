import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityOperation {
  operation: string;
  code?: string;
  projectId?: string;
  userId?: string;
  language?: string;
  options?: any;
}

interface QualityResult {
  success: boolean;
  data?: any;
  score?: number;
  issues?: any[];
  suggestions?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Quality operation started`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: QualityOperation = await req.json();
    
    if (!payload.operation) {
      throw new Error('Operation type is required');
    }

    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result: QualityResult;

    switch (payload.operation) {
      case 'analyze_quality':
        result = await analyzeQuality(payload, supabase, requestId);
        break;
      case 'code_review':
        result = await codeReview(payload, supabase, requestId);
        break;
      case 'security_audit':
        result = await securityAudit(payload, supabase, requestId);
        break;
      case 'performance_audit':
        result = await performanceAudit(payload, supabase, requestId);
        break;
      case 'accessibility_check':
        result = await accessibilityCheck(payload, supabase, requestId);
        break;
      case 'generate_documentation':
        result = await generateDocumentation(payload, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      requestId,
      ...result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    return new Response(JSON.stringify({ 
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: error instanceof Error && error.message.includes('required') ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Comprehensive code quality analysis
 */
async function analyzeQuality(
  payload: QualityOperation, 
  supabase: any, 
  requestId: string
): Promise<QualityResult> {
  const { code, language, projectId, userId } = payload;
  
  if (!code) {
    throw new Error('Code is required for quality analysis');
  }

  console.log(`[${requestId}] Analyzing code quality (${language || 'unknown'})`);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const analysisPrompt = `
Analyze this ${language || 'code'} for quality:

\`\`\`
${code.substring(0, 5000)} ${code.length > 5000 ? '...' : ''}
\`\`\`

Provide comprehensive analysis with:
1. Overall quality score (0-100)
2. Code smells and anti-patterns
3. Maintainability issues
4. Performance concerns
5. Best practice violations

Return JSON:
{
  "score": 0-100,
  "issues": [{"severity": "high|medium|low", "type": "", "message": "", "line": 0}],
  "suggestions": ["suggestion1", "suggestion2"],
  "metrics": {"complexity": 0, "maintainability": 0}
}
`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a code quality expert. Return valid JSON only.' },
        { role: 'user', content: analysisPrompt }
      ]
    })
  });

  if (!response.ok) {
    console.error(`[${requestId}] AI analysis failed: ${response.status}`);
    throw new Error('AI analysis failed');
  }

  const aiData = await response.json();
  const aiContent = aiData.choices[0].message.content;
  
  let analysis = {
    score: 70,
    issues: [],
    suggestions: [],
    metrics: {}
  };
  
  try {
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn(`[${requestId}] Failed to parse AI response`);
  }

  // Store analysis if projectId provided
  if (projectId) {
    await supabase
      .from('code_analysis')
      .insert({
        project_id: projectId,
        analysis_type: 'quality',
        score: analysis.score,
        issues: analysis.issues,
        suggestions: analysis.suggestions
      });

    console.log(`[${requestId}] Analysis stored for project: ${projectId}`);
  }

  return {
    success: true,
    score: analysis.score,
    issues: analysis.issues,
    suggestions: analysis.suggestions,
    data: analysis.metrics
  };
}

/**
 * Perform code review
 */
async function codeReview(
  payload: QualityOperation, 
  supabase: any, 
  requestId: string
): Promise<QualityResult> {
  const { code, language, userId } = payload;
  
  if (!code || !userId) {
    throw new Error('Code and userId are required');
  }

  console.log(`[${requestId}] Performing code review`);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const reviewPrompt = `
Review this code like a senior engineer:

\`\`\`${language || ''}
${code.substring(0, 5000)}
\`\`\`

Provide:
1. Overall grade (A-F)
2. Security concerns
3. Performance issues
4. Maintainability score (0-100)
5. Specific improvements

Return JSON:
{
  "grade": "A|B|C|D|F",
  "overall_score": 0-100,
  "security_score": 0-100,
  "performance_score": 0-100,
  "maintainability_score": 0-100,
  "improvements": [{"priority": "high|medium|low", "description": ""}]
}
`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a senior code reviewer. Return valid JSON only.' },
        { role: 'user', content: reviewPrompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Code review failed');
  }

  const aiData = await response.json();
  const aiContent = aiData.choices[0].message.content;
  
  let review = {
    grade: 'C',
    overall_score: 70,
    security_score: 70,
    performance_score: 70,
    maintainability_score: 70,
    improvements: []
  };
  
  try {
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      review = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn(`[${requestId}] Failed to parse review response`);
  }

  // Store review
  await supabase
    .from('code_reviews')
    .insert({
      user_id: userId,
      filename: 'reviewed_code',
      language: language || 'unknown',
      code_length: code.length,
      grade: review.grade,
      overall_score: review.overall_score,
      security_score: review.security_score,
      performance_score: review.performance_score,
      maintainability_score: review.maintainability_score,
      improvements_count: review.improvements.length
    });

  console.log(`[${requestId}] Code review completed and stored`);

  return {
    success: true,
    score: review.overall_score,
    data: review
  };
}

/**
 * Security audit
 */
async function securityAudit(
  payload: QualityOperation, 
  supabase: any, 
  requestId: string
): Promise<QualityResult> {
  const { code, projectId } = payload;
  
  if (!code) {
    throw new Error('Code is required');
  }

  console.log(`[${requestId}] Running security audit`);

  const vulnerabilities = [];
  
  // Basic security checks
  if (code.includes('eval(')) {
    vulnerabilities.push({
      severity: 'critical',
      type: 'code_injection',
      message: 'Use of eval() detected - potential code injection risk',
      line: code.split('\n').findIndex(l => l.includes('eval(')) + 1
    });
  }
  
  if (code.match(/password\s*=\s*['"][^'"]+['"]/i)) {
    vulnerabilities.push({
      severity: 'critical',
      type: 'hardcoded_credentials',
      message: 'Hardcoded password detected',
      line: code.split('\n').findIndex(l => l.match(/password\s*=\s*['"][^'"]+['"]/i)) + 1
    });
  }

  if (code.includes('dangerouslySetInnerHTML')) {
    vulnerabilities.push({
      severity: 'high',
      type: 'xss',
      message: 'dangerouslySetInnerHTML usage - XSS risk',
      line: code.split('\n').findIndex(l => l.includes('dangerouslySetInnerHTML')) + 1
    });
  }

  // Store security scan results
  if (projectId) {
    await supabase
      .from('security_scans')
      .insert({
        project_id: projectId,
        scan_type: 'code_audit',
        issues_found: vulnerabilities.length,
        status: 'completed',
        scan_results: { vulnerabilities }
      });

    console.log(`[${requestId}] Security scan stored for project: ${projectId}`);
  }

  const securityScore = Math.max(0, 100 - (vulnerabilities.length * 15));

  return {
    success: true,
    score: securityScore,
    issues: vulnerabilities,
    data: {
      totalVulnerabilities: vulnerabilities.length,
      criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
      highCount: vulnerabilities.filter(v => v.severity === 'high').length
    }
  };
}

/**
 * Performance audit
 */
async function performanceAudit(
  payload: QualityOperation, 
  supabase: any, 
  requestId: string
): Promise<QualityResult> {
  const { code, language } = payload;
  
  if (!code) {
    throw new Error('Code is required');
  }

  console.log(`[${requestId}] Running performance audit`);

  const issues = [];
  
  // Basic performance checks
  if (code.match(/for\s*\([^)]*\)\s*\{[^}]*for\s*\(/)) {
    issues.push({
      severity: 'medium',
      type: 'nested_loops',
      message: 'Nested loops detected - potential O(n²) complexity'
    });
  }

  if (code.includes('.map(').split('.map(').length > 3) {
    issues.push({
      severity: 'low',
      type: 'multiple_iterations',
      message: 'Multiple array iterations - consider combining operations'
    });
  }

  const performanceScore = Math.max(0, 100 - (issues.length * 10));

  return {
    success: true,
    score: performanceScore,
    issues,
    suggestions: [
      'Consider memoization for expensive computations',
      'Use lazy loading for large datasets',
      'Optimize re-renders in React components'
    ]
  };
}

/**
 * Accessibility check
 */
async function accessibilityCheck(
  payload: QualityOperation, 
  supabase: any, 
  requestId: string
): Promise<QualityResult> {
  const { code } = payload;
  
  if (!code) {
    throw new Error('Code is required');
  }

  console.log(`[${requestId}] Running accessibility check`);

  const issues = [];
  
  // Basic a11y checks
  if (code.includes('<img') && !code.match(/<img[^>]+alt=/)) {
    issues.push({
      severity: 'high',
      type: 'missing_alt',
      message: 'Images without alt attributes'
    });
  }

  if (code.includes('<button') && !code.match(/<button[^>]+aria-label=/)) {
    issues.push({
      severity: 'medium',
      type: 'missing_aria',
      message: 'Buttons without aria-label'
    });
  }

  const a11yScore = Math.max(0, 100 - (issues.length * 20));

  return {
    success: true,
    score: a11yScore,
    issues
  };
}

/**
 * Generate documentation
 */
async function generateDocumentation(
  payload: QualityOperation, 
  supabase: any, 
  requestId: string
): Promise<QualityResult> {
  const { code, language, projectId, userId } = payload;
  
  if (!code || !userId) {
    throw new Error('Code and userId are required');
  }

  console.log(`[${requestId}] Generating documentation`);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const docPrompt = `
Generate comprehensive documentation for this code:

\`\`\`${language || ''}
${code.substring(0, 5000)}
\`\`\`

Include:
1. Overview and purpose
2. Function descriptions
3. Parameters and return values
4. Usage examples
5. Important notes

Return as markdown.
`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a technical documentation expert.' },
        { role: 'user', content: docPrompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Documentation generation failed');
  }

  const aiData = await response.json();
  const documentation = aiData.choices[0].message.content;

  // Store documentation
  await supabase
    .from('code_documentation')
    .insert({
      user_id: userId,
      project_id: projectId,
      file_path: 'generated_code',
      original_code: code,
      documented_code: code,
      readme_content: documentation,
      doc_type: 'auto_generated'
    });

  console.log(`[${requestId}] Documentation generated and stored`);

  return {
    success: true,
    data: { documentation }
  };
}
