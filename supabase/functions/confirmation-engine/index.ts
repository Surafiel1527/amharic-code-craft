import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Confirmation Rules Engine
 * Pauses for user approval on major changes
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      changeType,
      proposedChanges,
      affectedTables,
      affectedComponents,
      userId,
      conversationId
    } = await req.json();

    console.log('⏸️  Confirmation Engine evaluating:', { changeType, userId });

    // **Evaluate if confirmation is needed**
    const needsConfirmation = evaluateConfirmationNeed({
      changeType,
      proposedChanges,
      affectedTables,
      affectedComponents
    });

    if (!needsConfirmation.required) {
      return new Response(JSON.stringify({
        requires_confirmation: false,
        can_proceed: true,
        reasoning: 'Low-risk change, no confirmation needed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // **Create confirmation request**
    const confirmationPreview = generateChangePreview({
      changeType,
      proposedChanges,
      affectedTables,
      affectedComponents
    });

    const { data: confirmRequest, error } = await supabase
      .from('pending_confirmations')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        change_type: changeType,
        severity: needsConfirmation.severity,
        preview: confirmationPreview,
        proposed_changes: proposedChanges,
        affected_resources: {
          tables: affectedTables,
          components: affectedComponents
        },
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min expiry
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      requires_confirmation: true,
      confirmation_id: confirmRequest.id,
      preview: confirmationPreview,
      severity: needsConfirmation.severity,
      reasoning: needsConfirmation.reasoning,
      expires_at: confirmRequest.expires_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in confirmation-engine:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Evaluate if change needs confirmation
function evaluateConfirmationNeed(context: any) {
  const { changeType, affectedTables, affectedComponents } = context;

  // High severity changes (ALWAYS need confirmation)
  const highSeverity = [
    'schema_migration',
    'rls_policy_change',
    'auth_system_change',
    'delete_table',
    'drop_column'
  ];

  if (highSeverity.includes(changeType)) {
    return {
      required: true,
      severity: 'high',
      reasoning: `${changeType} is a critical operation that requires approval`
    };
  }

  // Medium severity (need confirmation if affects multiple resources)
  if (affectedTables?.length > 2 || affectedComponents?.length > 5) {
    return {
      required: true,
      severity: 'medium',
      reasoning: 'Large-scale changes affecting multiple resources'
    };
  }

  // Destructive operations
  if (changeType.includes('delete') || changeType.includes('remove')) {
    return {
      required: true,
      severity: 'medium',
      reasoning: 'Destructive operation requires confirmation'
    };
  }

  // Low severity (no confirmation needed)
  return {
    required: false,
    severity: 'low',
    reasoning: 'Low-risk change'
  };
}

// Generate human-readable preview
function generateChangePreview(context: any) {
  const { changeType, proposedChanges, affectedTables, affectedComponents } = context;

  let preview = `## ${formatChangeType(changeType)}\n\n`;

  if (affectedTables?.length) {
    preview += `**Affected Tables:**\n`;
    affectedTables.forEach((table: string) => {
      preview += `- ${table}\n`;
    });
    preview += '\n';
  }

  if (affectedComponents?.length) {
    preview += `**Affected Components:**\n`;
    affectedComponents.forEach((comp: string) => {
      preview += `- ${comp}\n`;
    });
    preview += '\n';
  }

  if (proposedChanges) {
    preview += `**Changes:**\n\`\`\`sql\n${proposedChanges.substring(0, 500)}${proposedChanges.length > 500 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
  }

  preview += `\n**⚠️ Do you approve these changes?**`;

  return preview;
}

function formatChangeType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
