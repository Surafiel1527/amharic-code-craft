/**
 * Admin Approval Handler Edge Function
 * Handles approval/rejection/rollback of AI improvements
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { restorePreviousState } from "./rollback.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SECURITY: Get user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication failed' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Verify admin access server-side using secure function
    const { data: isAdmin, error: adminCheckError } = await supabaseClient
      .rpc('verify_admin_access', { check_user_id: user.id });

    if (adminCheckError || !isAdmin) {
      console.error('Admin verification failed:', adminCheckError);
      return new Response(JSON.stringify({ 
        error: 'Access denied' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, itemId, notes, reason, improvementId } = await req.json();

    console.log('Processing approval action:', { action, itemId, improvementId, userId: user.id });

    if (action === 'approve') {
      // Update approval status
      const { error: updateError } = await supabaseClient
        .from('admin_approval_queue')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Get the approved item to apply changes
      const { data: approvedItem, error: fetchError } = await supabaseClient
        .from('admin_approval_queue')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      // Track improvement for rollback before applying
      await trackAppliedImprovement(supabaseClient, approvedItem, user.id);

      // Apply the improvement based on item type
      await applyImprovement(supabaseClient, approvedItem);

      // Log the approval
      await supabaseClient.from('ai_improvement_logs').insert({
        improvement_type: approvedItem.item_type,
        before_metric: 0,
        after_metric: 100,
        changes_made: approvedItem.metadata,
        validation_status: 'approved',
        validated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Improvement approved and applied',
          itemId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reject') {
      // Update rejection status
      const { error: updateError } = await supabaseClient
        .from('admin_approval_queue')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: reason,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Log the rejection
      const { data: rejectedItem } = await supabaseClient
        .from('admin_approval_queue')
        .select('*')
        .eq('id', itemId)
        .single();

      if (rejectedItem) {
        await supabaseClient.from('ai_improvement_logs').insert({
          improvement_type: rejectedItem.item_type,
          before_metric: 0,
          after_metric: 0,
          changes_made: rejectedItem.metadata,
          validation_status: 'rejected',
          validated_at: new Date().toISOString(),
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Improvement rejected',
          itemId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'rollback') {
      // Get the improvement to rollback
      const { data: improvement } = await supabaseClient
        .from('applied_improvements')
        .select('*')
        .eq('id', improvementId)
        .single();

      if (!improvement) {
        throw new Error('Improvement not found');
      }

      // Apply the rollback by restoring previous state
      await restorePreviousState(supabaseClient, improvement);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Rollback completed successfully',
          improvementId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Error in admin-approval-handler:', error);
    // SECURITY: Generic error message to prevent information disclosure
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Store improvement for rollback tracking
 */
async function trackAppliedImprovement(supabaseClient: any, approvalItem: any, userId: string) {
  const { data: currentState } = await getCurrentState(supabaseClient, approvalItem);
  
  await supabaseClient
    .from('applied_improvements')
    .insert({
      approval_id: approvalItem.id,
      item_type: approvalItem.item_type,
      item_id: approvalItem.item_id,
      applied_by: userId,
      previous_state: currentState || {},
      new_state: approvalItem.metadata || {},
      affected_tables: extractAffectedTables(approvalItem),
      deployment_safe: checkDeploymentSafety(approvalItem),
      metadata: approvalItem.metadata,
    });
}

/**
 * Get current state before applying improvement
 */
async function getCurrentState(supabaseClient: any, item: any) {
  const { item_type, item_id } = item;
  
  switch (item_type) {
    case 'prompt_improvement':
      return await supabaseClient
        .from('ai_prompts')
        .select('*')
        .eq('id', item_id)
        .single();
    
    case 'pattern_evolution':
      return await supabaseClient
        .from('universal_error_patterns')
        .select('*')
        .eq('id', item_id)
        .single();
    
    case 'ai_suggestion':
      return await supabaseClient
        .from('ai_knowledge_base')
        .select('*')
        .eq('pattern_name', item.metadata?.knowledge?.pattern_name)
        .single();
    
    default:
      return { data: null };
  }
}

/**
 * Extract affected tables from improvement
 */
function extractAffectedTables(item: any): string[] {
  const tables: string[] = [];
  
  switch (item.item_type) {
    case 'prompt_improvement':
      tables.push('ai_prompts');
      break;
    case 'pattern_evolution':
      tables.push('universal_error_patterns');
      break;
    case 'ai_suggestion':
      tables.push('ai_knowledge_base');
      break;
  }
  
  return tables;
}

/**
 * Check if rollback is deployment-safe
 */
function checkDeploymentSafety(item: any): boolean {
  // Prompt improvements are generally safe
  if (item.item_type === 'prompt_improvement') return true;
  
  // Pattern evolution could affect deployments
  if (item.item_type === 'pattern_evolution') return false;
  
  // Default to safe
  return true;
}

/**
 * Apply approved improvement to the system
 */
async function applyImprovement(supabaseClient: any, item: any) {
  const { item_type, metadata, item_id } = item;

  console.log('Applying improvement:', { item_type, item_id });

  switch (item_type) {
    case 'prompt_improvement':
      // Update the prompt in ai_prompts table
      if (metadata.newPrompt) {
        await supabaseClient
          .from('ai_prompts')
          .update({
            prompt_text: metadata.newPrompt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item_id);
      }
      break;

    case 'pattern_evolution':
      // Update pattern in universal_error_patterns
      if (metadata.newPattern) {
        await supabaseClient
          .from('universal_error_patterns')
          .update({
            fix_strategy: metadata.newPattern,
            confidence_score: metadata.confidence || 0.8,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item_id);
      }
      break;

    case 'ai_suggestion':
      // Apply AI suggestion to ai_knowledge_base
      if (metadata.knowledge) {
        await supabaseClient
          .from('ai_knowledge_base')
          .upsert({
            pattern_name: metadata.knowledge.pattern_name,
            category: metadata.knowledge.category,
            best_approach: metadata.knowledge.best_approach,
            confidence_score: metadata.confidence || 0.75,
          });
      }
      break;

    default:
      console.log('Unknown improvement type:', item_type);
  }
}
