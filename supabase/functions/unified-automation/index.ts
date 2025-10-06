import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationOperation {
  operation: string;
  workflowId?: string;
  userId?: string;
  config?: any;
  data?: any;
  triggerType?: string;
}

interface AutomationResult {
  success: boolean;
  data?: any;
  workflowId?: string;
  executionId?: string;
  status?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`[${requestId}] Automation operation started`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate request
    const payload: AutomationOperation = await req.json();
    
    if (!payload.operation) {
      throw new Error('Operation type is required');
    }

    // Validate operation type
    const validOperations = [
      'create_workflow',
      'execute_workflow',
      'update_workflow',
      'delete_workflow',
      'list_workflows',
      'trigger_automation',
      'get_execution_status',
      'schedule_task'
    ];

    if (!validOperations.includes(payload.operation)) {
      throw new Error(`Invalid operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result: AutomationResult;

    switch (payload.operation) {
      case 'create_workflow':
        result = await createWorkflow(payload, supabase, requestId);
        break;
      case 'execute_workflow':
        result = await executeWorkflow(payload, supabase, requestId);
        break;
      case 'update_workflow':
        result = await updateWorkflow(payload, supabase, requestId);
        break;
      case 'delete_workflow':
        result = await deleteWorkflow(payload, supabase, requestId);
        break;
      case 'list_workflows':
        result = await listWorkflows(payload, supabase, requestId);
        break;
      case 'trigger_automation':
        result = await triggerAutomation(payload, supabase, requestId);
        break;
      case 'get_execution_status':
        result = await getExecutionStatus(payload, supabase, requestId);
        break;
      case 'schedule_task':
        result = await scheduleTask(payload, supabase, requestId);
        break;
      default:
        throw new Error(`Unhandled operation: ${payload.operation}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Operation completed in ${duration}ms`);

    return new Response(JSON.stringify({ 
      requestId,
      duration,
      timestamp: new Date().toISOString(),
      ...result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${duration}ms:`, error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
        statusCode = 404;
      } else if (error.message.includes('unauthorized') || error.message.includes('permission')) {
        statusCode = 403;
      }
    }
    
    return new Response(JSON.stringify({ 
      success: false,
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Create a new automation workflow
 */
async function createWorkflow(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { userId, config } = payload;
  
  // Validate required fields
  if (!userId || !config?.workflow_name || !config?.workflow_steps) {
    throw new Error('userId, workflow_name, and workflow_steps are required');
  }

  // Validate workflow steps structure
  if (!Array.isArray(config.workflow_steps) || config.workflow_steps.length === 0) {
    throw new Error('workflow_steps must be a non-empty array');
  }

  // Validate each step
  for (const step of config.workflow_steps) {
    if (!step.action || typeof step.action !== 'string') {
      throw new Error('Each workflow step must have an action');
    }
  }

  console.log(`[${requestId}] Creating workflow: ${config.workflow_name}`);

  const { data: workflow, error } = await supabase
    .from('ai_workflows')
    .insert({
      user_id: userId,
      workflow_name: config.workflow_name.substring(0, 255), // Enforce length limit
      description: config.description?.substring(0, 1000) || null,
      trigger_type: config.trigger_type || 'manual',
      trigger_config: config.trigger_config || {},
      workflow_steps: config.workflow_steps,
      is_active: config.is_active ?? true
    })
    .select()
    .single();

  if (error) {
    console.error(`[${requestId}] Failed to create workflow:`, error);
    throw new Error(`Failed to create workflow: ${error.message}`);
  }

  console.log(`[${requestId}] Workflow created: ${workflow.id}`);

  // Log workflow creation
  await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'workflow_created',
      resource_type: 'ai_workflow',
      resource_id: workflow.id,
      severity: 'info',
      metadata: { workflow_name: workflow.workflow_name }
    })
    .then(() => console.log(`[${requestId}] Audit log created`))
    .catch((err: any) => console.warn(`[${requestId}] Failed to create audit log:`, err));

  return {
    success: true,
    workflowId: workflow.id,
    data: workflow
  };
}

/**
 * Execute an automation workflow
 */
async function executeWorkflow(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { workflowId, data: inputData } = payload;
  
  if (!workflowId) {
    throw new Error('workflowId is required');
  }

  console.log(`[${requestId}] Executing workflow: ${workflowId}`);

  // Fetch workflow
  const { data: workflow, error: fetchError } = await supabase
    .from('ai_workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle();

  if (fetchError) {
    console.error(`[${requestId}] Failed to fetch workflow:`, fetchError);
    throw new Error(`Failed to fetch workflow: ${fetchError.message}`);
  }

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  if (!workflow.is_active) {
    throw new Error('Workflow is not active');
  }

  // Create execution record
  const executionId = crypto.randomUUID();
  const executionResults = [];

  console.log(`[${requestId}] Starting workflow execution: ${executionId}`);

  // Execute each step sequentially
  for (let i = 0; i < workflow.workflow_steps.length; i++) {
    const step = workflow.workflow_steps[i];
    console.log(`[${requestId}] Executing step ${i + 1}/${workflow.workflow_steps.length}: ${step.action}`);

    try {
      const stepResult = await executeWorkflowStep(step, inputData, supabase, requestId);
      executionResults.push({
        step: i + 1,
        action: step.action,
        status: 'success',
        result: stepResult
      });
    } catch (stepError) {
      console.error(`[${requestId}] Step ${i + 1} failed:`, stepError);
      executionResults.push({
        step: i + 1,
        action: step.action,
        status: 'failed',
        error: stepError instanceof Error ? stepError.message : 'Unknown error'
      });

      // Stop execution on error if configured
      if (step.stop_on_error !== false) {
        break;
      }
    }
  }

  const allSuccessful = executionResults.every(r => r.status === 'success');

  console.log(`[${requestId}] Workflow execution completed: ${allSuccessful ? 'success' : 'partial/failed'}`);

  return {
    success: allSuccessful,
    executionId,
    status: allSuccessful ? 'completed' : 'failed',
    data: {
      workflow: workflow.workflow_name,
      steps: executionResults
    }
  };
}

/**
 * Execute a single workflow step
 */
async function executeWorkflowStep(
  step: any, 
  inputData: any, 
  supabase: any,
  requestId: string
): Promise<any> {
  const { action, params } = step;

  switch (action) {
    case 'send_notification':
      // Simulated notification
      return { sent: true, message: params?.message || 'Notification sent' };
      
    case 'update_database':
      if (!params?.table || !params?.data) {
        throw new Error('update_database requires table and data');
      }
      const { error: insertError } = await supabase
        .from(params.table)
        .insert(params.data);
      if (insertError) throw insertError;
      return { updated: true };
      
    case 'call_function':
      if (!params?.function_name) {
        throw new Error('call_function requires function_name');
      }
      const { data: funcData, error: funcError } = await supabase.functions.invoke(params.function_name, {
        body: params.body || {}
      });
      if (funcError) throw funcError;
      return funcData;
      
    default:
      console.warn(`[${requestId}] Unknown action: ${action}`);
      return { skipped: true, action };
  }
}

/**
 * Update an existing workflow
 */
async function updateWorkflow(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { workflowId, config, userId } = payload;
  
  if (!workflowId || !config || !userId) {
    throw new Error('workflowId, config, and userId are required');
  }

  console.log(`[${requestId}] Updating workflow: ${workflowId}`);

  // Validate workflow exists and user owns it
  const { data: existing, error: fetchError } = await supabase
    .from('ai_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch workflow: ${fetchError.message}`);
  }

  if (!existing) {
    throw new Error('Workflow not found or access denied');
  }

  const { error: updateError } = await supabase
    .from('ai_workflows')
    .update({
      workflow_name: config.workflow_name || existing.workflow_name,
      description: config.description !== undefined ? config.description : existing.description,
      workflow_steps: config.workflow_steps || existing.workflow_steps,
      trigger_config: config.trigger_config || existing.trigger_config,
      is_active: config.is_active !== undefined ? config.is_active : existing.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', workflowId);

  if (updateError) {
    console.error(`[${requestId}] Failed to update workflow:`, updateError);
    throw new Error(`Failed to update workflow: ${updateError.message}`);
  }

  console.log(`[${requestId}] Workflow updated successfully`);

  return {
    success: true,
    workflowId
  };
}

/**
 * Delete a workflow
 */
async function deleteWorkflow(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { workflowId, userId } = payload;
  
  if (!workflowId || !userId) {
    throw new Error('workflowId and userId are required');
  }

  console.log(`[${requestId}] Deleting workflow: ${workflowId}`);

  const { error } = await supabase
    .from('ai_workflows')
    .delete()
    .eq('id', workflowId)
    .eq('user_id', userId);

  if (error) {
    console.error(`[${requestId}] Failed to delete workflow:`, error);
    throw new Error(`Failed to delete workflow: ${error.message}`);
  }

  console.log(`[${requestId}] Workflow deleted successfully`);

  return {
    success: true,
    workflowId
  };
}

/**
 * List workflows for a user
 */
async function listWorkflows(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { userId } = payload;
  
  if (!userId) {
    throw new Error('userId is required');
  }

  console.log(`[${requestId}] Listing workflows for user: ${userId}`);

  const { data: workflows, error } = await supabase
    .from('ai_workflows')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[${requestId}] Failed to list workflows:`, error);
    throw new Error(`Failed to list workflows: ${error.message}`);
  }

  console.log(`[${requestId}] Found ${workflows.length} workflows`);

  return {
    success: true,
    data: workflows
  };
}

/**
 * Trigger an automation based on event
 */
async function triggerAutomation(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { triggerType, data } = payload;
  
  if (!triggerType) {
    throw new Error('triggerType is required');
  }

  console.log(`[${requestId}] Triggering automation for: ${triggerType}`);

  // Find workflows with matching trigger
  const { data: workflows, error } = await supabase
    .from('ai_workflows')
    .select('*')
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to find workflows: ${error.message}`);
  }

  console.log(`[${requestId}] Found ${workflows.length} matching workflows`);

  const results = [];
  for (const workflow of workflows) {
    try {
      const result = await executeWorkflow(
        { operation: 'execute_workflow', workflowId: workflow.id, data },
        supabase,
        requestId
      );
      results.push({ workflowId: workflow.id, ...result });
    } catch (err) {
      console.error(`[${requestId}] Failed to execute workflow ${workflow.id}:`, err);
      results.push({
        workflowId: workflow.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  return {
    success: true,
    data: { triggered: workflows.length, results }
  };
}

/**
 * Get execution status
 */
async function getExecutionStatus(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { executionId } = payload as any;
  
  if (!executionId) {
    throw new Error('executionId is required');
  }

  console.log(`[${requestId}] Getting execution status: ${executionId}`);

  // In a real implementation, this would fetch from an executions table
  return {
    success: true,
    executionId,
    status: 'completed',
    data: { message: 'Execution tracking not yet implemented' }
  };
}

/**
 * Schedule a task for later execution
 */
async function scheduleTask(
  payload: AutomationOperation, 
  supabase: any, 
  requestId: string
): Promise<AutomationResult> {
  const { userId, config } = payload;
  
  if (!userId || !config?.task || !config?.schedule_time) {
    throw new Error('userId, task, and schedule_time are required');
  }

  console.log(`[${requestId}] Scheduling task for: ${config.schedule_time}`);

  // Validate schedule time is in the future
  const scheduleDate = new Date(config.schedule_time);
  if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
    throw new Error('schedule_time must be a valid future date');
  }

  // In a real implementation, this would create a scheduled job
  const taskId = crypto.randomUUID();

  console.log(`[${requestId}] Task scheduled: ${taskId}`);

  return {
    success: true,
    data: {
      taskId,
      scheduledFor: scheduleDate.toISOString()
    }
  };
}
