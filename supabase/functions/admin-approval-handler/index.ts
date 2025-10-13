/**
 * Admin Approval Handler
 * Phase 4A: Processes admin approvals/rejections of AI improvements
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin role
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some((r) => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { action, itemId, notes, reason } = await req.json();

    if (!action || !itemId) {
      throw new Error('Missing required fields: action, itemId');
    }

    // Get the approval item
    const { data: item, error: fetchError } = await supabaseClient
      .from('admin_approval_queue')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError) throw fetchError;
    if (!item) throw new Error('Approval item not found');

    if (action === 'approve') {
      // Update approval status
      const { error: updateError } = await supabaseClient
        .from('admin_approval_queue')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: notes || 'Approved',
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Apply the improvement based on item type
      await applyImprovement(supabaseClient, item);

      // Log the approval
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'approve_ai_improvement',
        resource_type: 'admin_approval_queue',
        resource_id: itemId,
        metadata: {
          item_type: item.item_type,
          notes,
        },
        severity: 'info',
      });

      console.log(`✅ Approved: ${itemId} by admin ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Improvement approved and applied',
          itemId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'reject') {
      if (!reason) {
        throw new Error('Rejection reason is required');
      }

      // Update rejection status
      const { error: updateError } = await supabaseClient
        .from('admin_approval_queue')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: reason,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Log the rejection
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'reject_ai_improvement',
        resource_type: 'admin_approval_queue',
        resource_id: itemId,
        metadata: {
          item_type: item.item_type,
          reason,
        },
        severity: 'info',
      });

      console.log(`❌ Rejected: ${itemId} by admin ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Improvement rejected',
          itemId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('❌ Admin approval handler error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Apply the approved improvement based on type
 */
async function applyImprovement(supabaseClient: any, item: any) {
  const itemType = item.item_type;
  const metadata = item.metadata || {};

  try {
    switch (itemType) {
      case 'prompt_improvement':
        // Update the prompt in the system
        if (metadata.prompt_id && metadata.new_prompt) {
          await supabaseClient
            .from('ai_prompts')
            .update({
              prompt_text: metadata.new_prompt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', metadata.prompt_id);
          
          console.log(`✅ Applied prompt improvement: ${metadata.prompt_id}`);
        }
        break;

      case 'pattern_evolution':
        // Update pattern confidence or code
        if (metadata.pattern_id) {
          const updateData: any = {};
          
          if (metadata.new_confidence !== undefined) {
            updateData.success_rate = metadata.new_confidence;
          }
          
          if (metadata.new_code_template) {
            updateData.code_template = metadata.new_code_template;
          }
          
          if (Object.keys(updateData).length > 0) {
            updateData.last_used_at = new Date().toISOString();
            
            await supabaseClient
              .from('learned_patterns')
              .update(updateData)
              .eq('id', metadata.pattern_id);
            
            console.log(`✅ Applied pattern evolution: ${metadata.pattern_id}`);
          }
        }
        break;

      case 'ai_suggestion':
        // Store as approved suggestion
        await supabaseClient.from('ai_improvements').insert({
          improvement_type: metadata.suggestion_type || 'general',
          reason: metadata.reason || 'AI-suggested improvement',
          new_version: metadata.new_version,
          old_version: metadata.old_version,
          status: 'approved',
          deployed_at: new Date().toISOString(),
        });
        
        console.log(`✅ Applied AI suggestion`);
        break;

      default:
        console.warn(`⚠️ Unknown improvement type: ${itemType}`);
    }
  } catch (error) {
    console.error(`❌ Failed to apply improvement:`, error);
    throw error;
  }
}
