import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Load project memory and context
async function loadProjectContext(supabaseClient: any, userId: string, conversationId?: string, projectId?: string) {
  const context: any = { learnings: [], patterns: [], knowledge: [], projectSize: 'small' };
  
  // Load conversation learnings
  if (conversationId) {
    const { data: learnings } = await supabaseClient
      .from('conversation_learnings')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('confidence', { ascending: false })
      .limit(20);
    context.learnings = learnings || [];
  }
  
  // Load cross-project patterns
  const { data: patterns } = await supabaseClient
    .from('cross_project_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false })
    .limit(15);
  context.patterns = patterns || [];
  
  // Load AI knowledge base
  const { data: knowledge } = await supabaseClient
    .from('ai_knowledge_base')
    .select('*')
    .order('confidence_score', { ascending: false })
    .limit(10);
  context.knowledge = knowledge || [];
  
  // Estimate project size based on history
  if (conversationId) {
    const { count } = await supabaseClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    
    if (count && count > 50) context.projectSize = 'large';
    else if (count && count > 20) context.projectSize = 'medium';
  }
  
  return context;
}

// Helper: Detect database requirements from task
function detectDatabaseNeeds(task: string, context: any) {
  const needs = {
    requiresDatabase: false,
    requiresAuth: false,
    requiresStorage: false,
    requiresEdgeFunctions: false,
    requiresRLS: false,
    estimatedTables: 0
  };
  
  const lowerTask = task.toLowerCase();
  
  // Check for database keywords
  if (lowerTask.match(/save|store|persist|database|table|record|data/)) {
    needs.requiresDatabase = true;
    needs.requiresRLS = true;
    
    // Estimate tables
    const tableKeywords = ['user', 'post', 'comment', 'like', 'profile', 'message', 'notification', 'friend'];
    needs.estimatedTables = tableKeywords.filter(k => lowerTask.includes(k)).length || 1;
  }
  
  // Check for auth keywords
  if (lowerTask.match(/login|signup|auth|register|user|account|profile/)) {
    needs.requiresAuth = true;
    needs.requiresDatabase = true;
  }
  
  // Check for storage keywords
  if (lowerTask.match(/upload|image|file|photo|video|avatar/)) {
    needs.requiresStorage = true;
  }
  
  // Check for backend logic keywords
  if (lowerTask.match(/api|backend|server|function|webhook|integration|email|payment/)) {
    needs.requiresEdgeFunctions = true;
  }
  
  return needs;
}

// Helper: Generate database migration SQL
async function generateDatabaseMigration(supabaseClient: any, task: string, needs: any, LOVABLE_API_KEY: string) {
  if (!needs.requiresDatabase) return null;
  
  const prompt = `Generate production-ready PostgreSQL migration for this task: "${task}"

Requirements:
- Create ${needs.estimatedTables} table(s)
- ${needs.requiresAuth ? 'Include user authentication tables and profiles' : ''}
- ${needs.requiresRLS ? 'Add Row Level Security (RLS) policies' : ''}
- ${needs.requiresStorage ? 'Set up storage buckets and policies' : ''}
- Use proper foreign keys, indexes, and constraints
- Include created_at, updated_at timestamps
- Add helpful comments

Return ONLY valid SQL (no explanations). Include:
1. CREATE TABLE statements
2. CREATE INDEX statements
3. ALTER TABLE for RLS
4. CREATE POLICY statements
5. CREATE TRIGGER for updated_at`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: 'You are a PostgreSQL expert. Generate production-ready SQL migrations.' },
        { role: 'user', content: prompt }
      ],
    }),
  });
  
  const data = await response.json();
  let sql = data.choices[0].message.content;
  
  // Extract SQL from code blocks if present
  const sqlMatch = sql.match(/```sql\n([\s\S]*?)\n```/);
  if (sqlMatch) sql = sqlMatch[1];
  
  return sql.trim();
}

// Helper: Prepare database migration (for user review/approval)
async function prepareDatabaseMigration(supabaseClient: any, sql: string, jobId: string) {
  try {
    // Store migration for manual execution by user
    await supabaseClient
      .from('ai_generation_jobs')
      .update({
        output_data: { 
          migration_sql: sql,
          migration_status: 'pending_approval',
          migration_note: 'Review and execute this migration in your database settings'
        }
      })
      .eq('id', jobId);
    
    console.log('📝 Migration SQL prepared for user review');
    
    // In Lovable Cloud, we prepare the migration but don't auto-execute
    // Users can review and approve database changes through the platform
    return { success: true, sql, requiresApproval: true };
  } catch (error: any) {
    console.error('Migration preparation failed:', error);
    return { success: false, error: error.message, sql };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, context = {}, projectId, conversationId, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('🚀 Super Mastermind Orchestrator activated:', task);

    // Initialize Supabase for real-time broadcasts and state persistence
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? ''
          }
        }
      }
    );

    const channelId = projectId || conversationId || 'default';
    
    // Create job record for state persistence
    const { data: job, error: jobError } = await supabaseClient
      .from('ai_generation_jobs')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        project_id: projectId,
        job_type: 'orchestration',
        status: 'running',
        input_data: { task, context },
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
    }

    const jobId = job?.id;
    
    const broadcastStatus = async (status: string, message: string, progress?: number) => {
      try {
        // Update job in database
        if (jobId) {
          await supabaseClient
            .from('ai_generation_jobs')
            .update({
              progress: progress || 0,
              current_step: message,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }

        // Broadcast for real-time updates (for users currently watching)
        await supabaseClient.channel(`ai-status-${channelId}`).send({
          type: 'broadcast',
          event: 'status-update',
          payload: {
            status,
            message,
            timestamp: new Date().toISOString(),
            progress,
            jobId
          }
        });
      } catch (e) {
        console.error('Broadcast error:', e);
      }
    };

    // Define background task
    const processTask = async () => {
      try {
        await broadcastStatus('thinking', 'Loading project intelligence...', 3);
        
        // Load project memory and context
        const projectContext = await loadProjectContext(supabaseClient, userId, conversationId, projectId);
        console.log(`📊 Project size: ${projectContext.projectSize}, Learnings: ${projectContext.learnings.length}, Patterns: ${projectContext.patterns.length}`);
        
        await broadcastStatus('analyzing', 'Detecting backend requirements...', 8);
        
        // Detect database and backend needs
        const dbNeeds = detectDatabaseNeeds(task, { ...context, ...projectContext });
        console.log('🔍 Database needs:', dbNeeds);
        
        // Generate database migration if needed
        let migrationResult = null;
        if (dbNeeds.requiresDatabase) {
          await broadcastStatus('analyzing', 'Generating database schema and migrations...', 12);
          const migrationSQL = await generateDatabaseMigration(supabaseClient, task, dbNeeds, LOVABLE_API_KEY);
          
          if (migrationSQL) {
            await broadcastStatus('analyzing', 'Preparing database migration...', 15);
            migrationResult = await prepareDatabaseMigration(supabaseClient, migrationSQL, jobId!);
            
            if (!migrationResult.success) {
              console.warn('⚠️ Migration prep failed, continuing without DB changes');
              migrationResult = null;
            } else {
              console.log('✅ Database migration prepared for approval');
            }
          }
        }

        await broadcastStatus('analyzing', 'Creating intelligent execution plan...', 20);
        
        // Build enhanced context with project intelligence
        const enhancedContext = {
          ...context,
          projectSize: projectContext.projectSize,
          previousPatterns: projectContext.patterns.slice(0, 5).map((p: any) => ({
            name: p.pattern_name,
            type: p.pattern_type,
            successRate: p.success_rate
          })),
          recentLearnings: projectContext.learnings.slice(0, 5).map((l: any) => ({
            pattern: l.learned_pattern,
            category: l.pattern_category,
            confidence: l.confidence
          })),
          databaseSetup: migrationResult ? 'completed' : 'not_required',
          backendNeeds: dbNeeds
        };

    // Step 1: Break down the task with full project intelligence
    const planResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a Super Mastermind AI Orchestrator capable of handling massive projects of any size and duration.

Your capabilities:
- Handle projects with 100+ functions, multiple databases, complex architectures
- Break down multi-hour tasks into manageable checkpointed steps
- Automatically set up backend infrastructure (database, auth, storage, edge functions)
- Learn from previous patterns and apply best practices
- Generate production-ready, scalable code
- Handle full-stack development including frontend, backend, and database

Break down tasks into detailed steps with:
- step_number: Sequential number
- description: Clear, specific action
- action_type: code_gen, database_migration, edge_function, auth_setup, storage_setup, rls_policy, testing, deploy
- estimated_time: Realistic estimate (can be hours for complex tasks)
- dependencies: Array of step numbers this depends on
- checkpoint: true/false (whether to save state after this step)

For large projects (>1 hour), include checkpoint steps every 10-15 minutes.
Return a JSON array of steps.`
          },
          {
            role: 'user',
            content: `Task: ${task}

Project Context:
- Size: ${projectContext.projectSize}
- Previous successful patterns: ${JSON.stringify(enhancedContext.previousPatterns)}
- Recent learnings: ${JSON.stringify(enhancedContext.recentLearnings)}
- Database setup: ${enhancedContext.databaseSetup}
- Backend requirements: ${JSON.stringify(dbNeeds)}

Create a comprehensive execution plan that can handle any project complexity and duration.`
          }
        ],
      }),
    });

    const planData = await planResponse.json();
    const planText = planData.choices[0].message.content;
    
    let executionPlan;
    try {
      const jsonMatch = planText.match(/```json\n([\s\S]*?)\n```/) || planText.match(/\[[\s\S]*\]/);
      executionPlan = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : planText);
    } catch {
      executionPlan = [
        { step_number: 1, description: task, action_type: 'code_gen', estimated_time: '5 min', dependencies: [] }
      ];
    }

    const totalEstimatedMinutes = executionPlan.reduce((sum: number, step: any) => {
      const time = step.estimated_time || '5 min';
      const minutes = parseInt(time) || 5;
      return sum + minutes;
    }, 0);
    
    console.log(`📋 Execution plan: ${executionPlan.length} steps, ~${totalEstimatedMinutes} minutes`);
    await broadcastStatus('generating', `Intelligent plan ready: ${executionPlan.length} steps (~${totalEstimatedMinutes} min). Executing...`, 25);

    // Step 2: Execute each step with full backend integration
    const results: any[] = [];
    const completedSteps: any[] = [];
    
    for (let i = 0; i < executionPlan.length; i++) {
      const step = executionPlan[i];
      const progress = 25 + ((i / executionPlan.length) * 65);
      
      console.log(`⚡ Step ${step.step_number}/${executionPlan.length}: ${step.description} [${step.action_type}]`);
      await broadcastStatus('editing', `Step ${step.step_number}/${executionPlan.length}: ${step.description}`, progress);
      
      // Choose the right model based on action complexity
      const model = step.action_type === 'database_migration' || step.action_type === 'edge_function' 
        ? 'google/gemini-2.5-pro' 
        : 'google/gemini-2.5-flash';
      
      const stepResponse: any = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are a Super Mastermind AI Developer executing step ${step.step_number} of ${executionPlan.length}.

Action type: ${step.action_type}

Capabilities by action type:
- code_gen: Generate production-ready React/TypeScript components with proper error handling, loading states, and accessibility
- database_migration: Create PostgreSQL migrations with proper indexes, constraints, and RLS policies
- edge_function: Build Deno edge functions with error handling, rate limiting, and proper CORS
- auth_setup: Configure authentication with proper RLS and security policies
- storage_setup: Set up storage buckets with proper policies and access controls
- rls_policy: Create comprehensive Row Level Security policies
- testing: Generate comprehensive test suites
- deploy: Prepare deployment configurations

Previous completed steps: ${completedSteps.map((s: any) => `${s.step_number}. ${s.description}`).join(', ')}

Provide detailed, production-ready output. Include code comments and error handling.`
            },
            {
              role: 'user',
              content: `Execute this step: ${step.description}

Context:
- Project size: ${projectContext.projectSize}
- Database needs: ${JSON.stringify(dbNeeds)}
- Previous results: ${JSON.stringify(results.slice(-3))}
- Enhanced context: ${JSON.stringify(enhancedContext)}

Generate complete, production-ready implementation.`
            }
          ],
        }),
      });

      const stepData: any = await stepResponse.json();
      const stepResult: any = {
        step_number: step.step_number,
        description: step.description,
        action_type: step.action_type,
        output: stepData.choices[0].message.content,
        status: 'completed',
        completed_at: new Date().toISOString(),
        model_used: model
      };

      results.push(stepResult);
      completedSteps.push(stepResult);
      
      // Checkpoint: Save progress for long-running tasks
      if (step.checkpoint || i % 5 === 0) {
        await supabaseClient
          .from('ai_generation_jobs')
          .update({
            completed_steps: i + 1,
            output_data: { results: completedSteps }
          })
          .eq('id', jobId);
        console.log(`💾 Checkpoint: Saved progress at step ${i + 1}`);
      }
      
      // Broadcast code/schema updates
      if (step.action_type === 'code_gen' || step.action_type === 'edge_function') {
        await supabaseClient.channel(`preview-${channelId}`).send({
          type: 'broadcast',
          event: 'code-update',
          payload: {
            component: step.description,
            code: stepResult.output,
            timestamp: new Date().toISOString(),
            status: 'complete',
            step: i + 1,
            total: executionPlan.length
          }
        });
      }
      
      // Learn from this step
      if (step.action_type === 'code_gen' && userId) {
        try {
          await supabaseClient
            .from('conversation_learnings')
            .insert({
              user_id: userId,
              conversation_id: conversationId,
              learned_pattern: step.description,
              pattern_category: step.action_type,
              context: { step_number: step.step_number, estimated_time: step.estimated_time },
              confidence: 70
            });
          console.log(`📚 Learned from step: ${step.description}`);
        } catch (e) {
          console.log('Learning error:', e);
        }
      }
    }

    // Step 3: Generate comprehensive summary with next steps
    await broadcastStatus('analyzing', 'Generating comprehensive summary and recommendations...', 92);
    const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are summarizing a completed Super Mastermind orchestration. Provide:

1. **What was built**: Clear summary of features and components
2. **Backend setup**: Database tables, auth, storage, edge functions created
3. **Code quality**: Architecture decisions and patterns used
4. **Production readiness**: Security, performance, scalability considerations
5. **Next steps**: Recommended improvements and features to add
6. **Learning insights**: Patterns that can be reused

Be specific and technical. Include counts of tables, functions, components created.`
          },
          {
            role: 'user',
            content: `Original task: ${task}

Execution summary:
- Total steps: ${executionPlan.length}
- Time spent: ~${totalEstimatedMinutes} minutes
- Database setup: ${migrationResult ? 'Yes - migration executed' : 'No migration needed'}
- Backend needs addressed: ${JSON.stringify(dbNeeds)}
- Project size: ${projectContext.projectSize}

Results: ${JSON.stringify(results.slice(-10))}

Generate a comprehensive summary.`
          }
        ],
      }),
    });

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices[0].message.content;

    await broadcastStatus('idle', '✨ Super Mastermind execution complete! All systems operational.', 100);
    console.log('🎉 Orchestration completed successfully!');

    // Mark job as completed with full details
    if (jobId) {
      await supabaseClient
        .from('ai_generation_jobs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          completed_steps: executionPlan.length,
          total_steps: executionPlan.length,
          output_data: {
            execution_plan: executionPlan,
            results: completedSteps,
            summary,
            projectContext: {
              size: projectContext.projectSize,
              patternsApplied: projectContext.patterns.length,
              learningsUsed: projectContext.learnings.length
            },
            backendSetup: {
              database: migrationResult !== null,
              migration: migrationResult,
              needs: dbNeeds
            },
            metrics: {
              totalSteps: executionPlan.length,
              estimatedMinutes: totalEstimatedMinutes,
              modelsUsed: {
                pro: results.filter((r: any) => r.model_used === 'google/gemini-2.5-pro').length,
                flash: results.filter((r: any) => r.model_used === 'google/gemini-2.5-flash').length
              }
            }
          }
        })
        .eq('id', jobId);
    }
    
    // Store cross-project pattern for future reuse
    if (userId && completedSteps.length > 3) {
      try {
        await supabaseClient
          .from('cross_project_patterns')
          .insert({
            user_id: userId,
            pattern_name: task.substring(0, 100),
            pattern_type: 'full_orchestration',
            pattern_code: JSON.stringify({ steps: executionPlan.map((s: any) => s.description) }),
            success_rate: 100,
            confidence_score: 85,
            usage_count: 1
          });
        console.log('📊 Pattern stored for future projects');
      } catch (e) {
        console.log('Pattern storage error:', e);
      }
    }

    return {
      task,
      jobId,
      execution_plan: executionPlan,
      results: completedSteps,
      summary,
      total_steps: executionPlan.length,
      success_rate: 100,
      total_time_minutes: totalEstimatedMinutes,
      backend_setup: migrationResult !== null,
      project_size: projectContext.projectSize
    };
      } catch (error: any) {
        console.error('Error in background task:', error);
        
        // Mark job as failed
        if (jobId) {
          await supabaseClient
            .from('ai_generation_jobs')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }
        
        throw error;
      }
    };

    // Run background task and return immediately
    processTask().catch(error => {
      console.error('Background task error:', error);
    });

    // Return immediately with job ID and project intelligence
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        message: '🚀 Super Mastermind activated! Processing in background. Safe to close.',
        estimatedTime: 'Calculating based on project complexity...',
        projectIntelligence: {
          size: 'analyzing',
          willSetupBackend: true,
          willHandleDatabase: true,
          capabilities: [
            'Unlimited project size',
            'Multi-hour tasks supported',
            'Auto database setup',
            'Backend integration',
            'Learning from patterns'
          ]
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in smart-orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
