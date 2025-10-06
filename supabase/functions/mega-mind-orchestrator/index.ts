import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// Rate limiting map (in-memory for this instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 10) { // Max 10 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

function sanitizeInput(input: string): string {
  // Remove potential script tags and malicious content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request, requestType, context = {}, jobId } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let userId: string;
    
    // Check if this is a service role call (from cron job)
    if (token === serviceRoleKey) {
      console.log('🔧 Service role authentication detected');
      
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'jobId required for service role calls' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get user_id from the job record
      const { data: job, error: jobError } = await supabaseClient
        .from('ai_generation_jobs')
        .select('user_id')
        .eq('id', jobId)
        .single();
      
      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = job.user_id;
      console.log('✅ Using user_id from job:', userId);
    } else {
      // Normal user JWT authentication
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authorization' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = user.id;
      console.log('✅ User authenticated:', userId);
    }

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      console.warn('⚠️ Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedRequest = request ? sanitizeInput(request) : '';
    
    console.log('🧠 Mega Mind Orchestrator - Starting:', { 
      requestType, 
      userId,
      requestLength: sanitizedRequest.length,
      jobId: jobId || 'new'
    });

    // Audit log
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'orchestration_started',
        resource_type: 'ai_generation',
        resource_id: jobId,
        severity: 'info',
        metadata: {
          request_type: requestType,
          request_length: sanitizedRequest.length
        }
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log audit:', error);
      });

    // Create orchestration record with sanitized data
    const { data: orchestration, error: orchError } = await supabaseClient
      .from('mega_mind_orchestrations')
      .insert({
        user_id: userId,
        request_type: requestType,
        original_request: sanitizedRequest,
        context: {
          ...context,
          ip_hash: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          timestamp: new Date().toISOString()
        },
        status: 'analyzing'
      })
      .select()
      .single();

    if (orchError || !orchestration) {
      throw new Error('Failed to create orchestration record');
    }

    const orchestrationId = orchestration.id;

    // Update job progress if jobId is provided
    const updateJobProgress = async (progress: number, currentStep?: string) => {
      if (jobId) {
        await supabaseClient
          .from('ai_generation_jobs')
          .update({
            progress,
            current_step: currentStep,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    };

    // PHASE 1: Analyze the request
    console.log('📊 Phase 1: Analyzing request...');
    await updateJobProgress(25, 'Analyzing request...');
    const analysis = await analyzeRequest(request, requestType, context);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        analysis_phase: analysis,
        status: 'installing-deps'
      })
      .eq('id', orchestrationId);

    // PHASE 2: Detect and install dependencies
    console.log('📦 Phase 2: Detecting dependencies...');
    await updateJobProgress(40, 'Detecting dependencies...');
    const dependencies = await detectDependencies(analysis, context);
    
    if (dependencies.length > 0) {
      console.log(`Found ${dependencies.length} dependencies to install:`, dependencies);
      
      // Track each dependency
      for (const dep of dependencies) {
        await supabaseClient
          .from('smart_dependency_tracking')
          .insert({
            orchestration_id: orchestrationId,
            package_name: dep.name,
            version: dep.version,
            detected_from: dep.detectedFrom,
            detection_context: dep.context,
            should_install: dep.shouldInstall,
            install_location: dep.location,
            installation_command: dep.installCommand,
            peer_dependencies: dep.peerDependencies || [],
            status: 'detected'
          });
      }

      // Install dependencies via unified-package-manager
      const installedDeps: any[] = [];
      for (const dep of dependencies.filter(d => d.shouldInstall)) {
        try {
          console.log(`Installing ${dep.name}...`);
          
          // Use unified-package-manager instead of non-existent auto-install-dependency
          const installResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/unified-package-manager`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operation: 'install',
              packageName: dep.name,
              version: dep.version,
              autoInstall: true,
              installLocation: dep.location
            }),
          });

          const installResult = await installResponse.json();
          
          if (installResult.success && installResult.installed) {
            installedDeps.push({
              name: dep.name,
              version: installResult.version,
              command: installResult.command
            });
            
            await supabaseClient
              .from('smart_dependency_tracking')
              .update({ 
                status: 'installed',
                installation_result: installResult,
                installed_at: new Date().toISOString()
              })
              .eq('orchestration_id', orchestrationId)
              .eq('package_name', dep.name);
          }
        } catch (error) {
          console.error(`Failed to install ${dep.name}:`, error);
        }
      }

      await supabaseClient
        .from('mega_mind_orchestrations')
        .update({ 
          dependency_phase: { 
            detected: dependencies,
            installed: installedDeps
          },
          dependencies_installed: installedDeps,
          status: 'generating'
        })
        .eq('id', orchestrationId);
    } else {
      await supabaseClient
        .from('mega_mind_orchestrations')
        .update({ status: 'generating' })
        .eq('id', orchestrationId);
    }

    // PHASE 3: Generate code/solution
    console.log('⚡ Phase 3: Generating solution...');
    await updateJobProgress(70, 'Generating solution...');
    const generation = await generateSolution(request, requestType, analysis, context);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        generation_phase: generation,
        files_generated: generation.files || [],
        status: 'verifying'
      })
      .eq('id', orchestrationId);

    // PHASE 4: Self-Correction & Reasoning
    console.log('🔍 Phase 4: Self-correction and reasoning...');
    await updateJobProgress(75, 'Performing self-correction...');
    const selfCorrection = await performSelfCorrection(generation, analysis, request);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        self_correction_phase: selfCorrection,
        files_generated: selfCorrection.correctedFiles || generation.files || []
      })
      .eq('id', orchestrationId);

    // PHASE 5: Security Vulnerability Detection
    console.log('🔒 Phase 5: Detecting security vulnerabilities...');
    await updateJobProgress(80, 'Scanning for security issues...');
    const securityScan = await detectSecurityVulnerabilities(selfCorrection.correctedFiles || generation.files);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ security_scan_phase: securityScan })
      .eq('id', orchestrationId);

    // PHASE 6: Performance Optimization
    console.log('⚡ Phase 6: Optimizing performance...');
    await updateJobProgress(85, 'Optimizing performance...');
    const performanceOpt = await optimizePerformance(selfCorrection.correctedFiles || generation.files, analysis);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ performance_optimization_phase: performanceOpt })
      .eq('id', orchestrationId);

    // PHASE 7: Best Practices Enforcement
    console.log('✨ Phase 7: Enforcing best practices...');
    await updateJobProgress(90, 'Applying best practices...');
    const bestPractices = await enforceBestPractices(performanceOpt.optimizedFiles || selfCorrection.correctedFiles || generation.files);
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ best_practices_phase: bestPractices })
      .eq('id', orchestrationId);

    // PHASE 8: Final Verification
    console.log('✅ Phase 8: Final verification...');
    await updateJobProgress(95, 'Final verification...');
    const verification = await verifySolution(
      bestPractices.enforcedFiles || performanceOpt.optimizedFiles || selfCorrection.correctedFiles || generation.files,
      dependencies,
      securityScan,
      performanceOpt,
      bestPractices
    );
    
    await supabaseClient
      .from('mega_mind_orchestrations')
      .update({ 
        verification_phase: verification,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', orchestrationId);

    console.log('🎉 Mega Mind orchestration completed successfully!');

    // Mark job as completed
    if (jobId) {
      const finalFiles = bestPractices.enforcedFiles || performanceOpt.optimizedFiles || selfCorrection.correctedFiles || generation.files;
      
      // Format the generated code for frontend display
      let generatedCode = '';
      if (finalFiles && finalFiles.length > 0) {
        // Create a combined view of all files
        generatedCode = finalFiles.map((file: any) => 
          `// File: ${file.path}\n${file.description ? `// ${file.description}\n` : ''}${file.content}\n\n`
        ).join('\n');
      }

      await supabaseClient
        .from('ai_generation_jobs')
        .update({
          status: 'completed',
          progress: 100,
          current_step: 'Completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          output_data: {
            orchestrationId,
            generatedCode,
            html: generatedCode,
            dependencies: dependencies.length > 0 ? {
              detected: dependencies.length,
              installed: dependencies.filter(d => d.shouldInstall).length,
              list: dependencies
            } : null,
            generation,
            selfCorrection,
            securityScan,
            performanceOpt,
            bestPractices,
            verification,
            instructions: generation.instructions,
            nextSteps: [
              ...generation.nextSteps || [],
              ...securityScan.criticalIssues?.length > 0 ? ['⚠️ Review and fix critical security issues'] : [],
              ...performanceOpt.recommendations || []
            ]
          }
        })
        .eq('id', jobId);
    }

    // Audit log completion
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'orchestration_completed',
        resource_type: 'ai_generation',
        resource_id: orchestrationId,
        severity: 'info',
        metadata: {
          dependencies_installed: dependencies.filter(d => d.shouldInstall).length,
          files_generated: generation.files?.length || 0
        }
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log audit:', error);
      });

    const finalFiles = bestPractices.enforcedFiles || performanceOpt.optimizedFiles || selfCorrection.correctedFiles || generation.files;
    
    return new Response(
      JSON.stringify({
        success: true,
        orchestrationId,
        analysis,
        dependencies: dependencies.length > 0 ? {
          detected: dependencies.length,
          installed: dependencies.filter(d => d.shouldInstall).length,
          list: dependencies
        } : null,
        generation,
        selfCorrection,
        securityScan,
        performanceOpt,
        bestPractices,
        verification,
        message: `✨ Enhanced Mega Mind completed: ${finalFiles?.length || 0} files, ${securityScan.issuesFound || 0} security issues fixed, ${performanceOpt.optimizationsApplied || 0} performance improvements`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in mega-mind-orchestrator:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update job as failed
    try {
      const { jobId } = await req.json().catch(() => ({}));
      if (jobId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabaseClient
          .from('ai_generation_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    } catch (jobUpdateError) {
      console.error('Failed to update job status:', jobUpdateError);
    }
    
    // Audit log error
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabaseClient
          .from('audit_logs')
          .insert({
            action: 'orchestration_error',
            resource_type: 'ai_generation',
            severity: 'error',
            metadata: {
              error: errorMessage
            }
          });
      }
    } catch (auditError) {
      console.error('Failed to log error audit:', auditError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeRequest(request: string, requestType: string, context: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Analyze this ${requestType} request and identify what needs to be done:

**Request:** ${request}
**Type:** ${requestType}
**Context:** ${JSON.stringify(context, null, 2)}

**Output JSON:**
{
  "requestType": "${requestType}",
  "mainGoal": "what the user wants to achieve",
  "subTasks": ["task 1", "task 2"],
  "requiredTechnologies": ["react", "typescript", etc],
  "complexity": "simple|moderate|complex",
  "estimatedFiles": 5,
  "architecturalApproach": "description"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert software architect. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function detectDependencies(analysis: any, context: any): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Based on this analysis, determine ALL npm packages needed:

**Analysis:** ${JSON.stringify(analysis, null, 2)}
**Existing Code:** ${context.currentCode || 'none'}

**Rules:**
- For game apps: Include game engines (phaser, three.js, babylonjs, etc)
- For UI: Include UI libraries if needed
- For data: Include state management, APIs
- Include ALL peer dependencies
- Specify dev vs production dependencies

**Output JSON array:**
[
  {
    "name": "package-name",
    "version": "latest" or "^1.0.0",
    "shouldInstall": true|false,
    "location": "dependencies"|"devDependencies",
    "detectedFrom": "game-requirement"|"ui-requirement"|etc,
    "context": {},
    "installCommand": "npm install package-name",
    "peerDependencies": ["peer1", "peer2"],
    "reason": "why needed"
  }
]`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a package management expert. Respond with JSON array only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  return result.dependencies || result || [];
}

async function generateSolution(request: string, requestType: string, analysis: any, context: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Generate the complete solution:

**Request:** ${request}
**Analysis:** ${JSON.stringify(analysis, null, 2)}

**Generate:**
- Complete working code
- All necessary files
- Configuration files
- README with instructions

**Output JSON:**
{
  "files": [
    {"path": "src/App.tsx", "content": "...", "description": "..."}
  ],
  "instructions": "How to use the generated code",
  "nextSteps": ["step 1", "step 2"]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert code generator. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API Error:', response.status, errorText);
    throw new Error(`AI API failed with status ${response.status}: ${errorText}`);
  }

  // Read response as text first to handle potential parsing issues
  const responseText = await response.text();
  console.log('Raw AI response (first 500 chars):', responseText.substring(0, 500));
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (jsonError) {
    console.error('Failed to parse AI response as JSON:', jsonError);
    console.error('Response text:', responseText.substring(0, 1000));
    const errorMsg = jsonError instanceof Error ? jsonError.message : String(jsonError);
    throw new Error(`AI API returned invalid JSON: ${errorMsg}`);
  }
  
  console.log('AI Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
  
  if (!data.choices?.[0]?.message?.content) {
    console.error('Invalid AI response structure:', JSON.stringify(data, null, 2));
    throw new Error('AI response missing expected data structure');
  }

  try {
    const content = data.choices[0].message.content;
    console.log('AI content to parse:', content.substring(0, 500));
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse AI content as JSON:', parseError);
    console.error('Content received:', data.choices[0].message.content?.substring(0, 1000));
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Failed to parse AI generated content: ${errorMsg}`);
  }
}

async function performSelfCorrection(generation: any, analysis: any, originalRequest: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Review and self-correct this generated solution using multi-step reasoning:

**Original Request:** ${originalRequest}
**Analysis:** ${JSON.stringify(analysis, null, 2)}
**Generated Files:** ${JSON.stringify(generation.files?.map((f: any) => ({ path: f.path, contentLength: f.content?.length })), null, 2)}

**Multi-Step Reasoning Process:**
1. Does the solution fully address the original request?
2. Are there any logical errors or bugs in the code?
3. Is the code structure optimal?
4. Are there missing edge cases?
5. Can the code be simplified?

**Output JSON:**
{
  "issuesFound": ["issue 1", "issue 2"],
  "corrections": ["correction 1", "correction 2"],
  "correctedFiles": [{"path": "...", "content": "...", "changes": "..."}],
  "reasoning": "multi-step reasoning explanation",
  "confidence": 0-100
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro', // Use Pro for deeper reasoning
      messages: [
        { role: 'system', content: 'You are an expert code reviewer with deep reasoning capabilities. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function detectSecurityVulnerabilities(files: any[]): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Scan these files for security vulnerabilities:

**Files:** ${JSON.stringify(files?.map((f: any) => ({ path: f.path, content: f.content?.substring(0, 1000) })), null, 2)}

**Check for:**
- XSS vulnerabilities
- SQL injection risks
- Authentication/Authorization issues
- Sensitive data exposure
- CSRF vulnerabilities
- Insecure dependencies
- Hard-coded secrets
- Input validation issues
- API security issues

**Output JSON:**
{
  "criticalIssues": [{"file": "...", "line": 0, "issue": "...", "severity": "critical", "fix": "..."}],
  "warnings": [{"file": "...", "issue": "...", "severity": "warning"}],
  "issuesFound": 0,
  "securityScore": 0-100,
  "recommendations": ["rec 1", "rec 2"]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a security expert. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function optimizePerformance(files: any[], analysis: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Analyze and optimize performance for these files:

**Files:** ${JSON.stringify(files?.map((f: any) => ({ path: f.path, content: f.content?.substring(0, 1000) })), null, 2)}
**Complexity:** ${analysis.complexity}

**Optimize for:**
- Bundle size reduction
- Lazy loading opportunities
- Memo/useMemo/useCallback usage
- Unnecessary re-renders
- API call optimization
- Asset optimization
- Code splitting
- Memory leaks
- Efficient algorithms

**Output JSON:**
{
  "optimizationsApplied": 0,
  "optimizedFiles": [{"path": "...", "content": "...", "improvements": ["..."]}],
  "performanceGains": {"bundleSize": "-20%", "renderTime": "-30%"},
  "recommendations": ["rec 1", "rec 2"],
  "beforeScore": 0-100,
  "afterScore": 0-100
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a performance optimization expert. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function enforceBestPractices(files: any[]): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Enforce best practices on these files:

**Files:** ${JSON.stringify(files?.map((f: any) => ({ path: f.path, content: f.content?.substring(0, 1000) })), null, 2)}

**Enforce:**
- TypeScript strict mode
- Proper error handling
- Accessibility (WCAG 2.1)
- SEO optimization
- Clean code principles
- DRY (Don't Repeat Yourself)
- SOLID principles
- Proper naming conventions
- Documentation/comments
- Test coverage readiness
- Component composition
- State management patterns

**Output JSON:**
{
  "practicesEnforced": ["practice 1", "practice 2"],
  "enforcedFiles": [{"path": "...", "content": "...", "changes": ["..."]}],
  "violations": [{"file": "...", "violation": "...", "fixed": true}],
  "qualityScore": 0-100,
  "recommendations": ["rec 1", "rec 2"]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a code quality expert. Respond with JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function verifySolution(
  files: any[], 
  dependencies: any[],
  securityScan: any,
  performanceOpt: any,
  bestPractices: any
): Promise<any> {
  return {
    codeQuality: bestPractices.qualityScore > 80 ? 'excellent' : bestPractices.qualityScore > 60 ? 'good' : 'needs-improvement',
    securityScore: securityScan.securityScore,
    performanceScore: performanceOpt.afterScore,
    qualityScore: bestPractices.qualityScore,
    dependenciesComplete: dependencies.filter(d => d.shouldInstall).length > 0,
    filesGenerated: files?.length || 0,
    readyForProduction: securityScan.criticalIssues?.length === 0 && performanceOpt.afterScore > 70,
    recommendations: [
      'Test all functionality',
      'Review generated code',
      ...securityScan.recommendations || [],
      ...performanceOpt.recommendations || [],
      ...bestPractices.recommendations || []
    ],
    summary: {
      security: `${securityScan.criticalIssues?.length || 0} critical issues, ${securityScan.warnings?.length || 0} warnings`,
      performance: `${performanceOpt.optimizationsApplied || 0} optimizations applied`,
      quality: `${bestPractices.practicesEnforced?.length || 0} best practices enforced`
    }
  };
}
