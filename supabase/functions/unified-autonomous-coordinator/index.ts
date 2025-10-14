/**
 * Unified Autonomous Coordinator
 * Central hub connecting all autonomous systems for intelligent decision-making
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutonomousEvent {
  type: 'error_detected' | 'pattern_learned' | 'ux_frustration' | 'performance_degradation';
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  requires_intervention: boolean;
}

interface CoordinatorDecision {
  action: string;
  confidence: number;
  systems_to_invoke: string[];
  reasoning: string;
  requires_approval: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { event } = await req.json() as { event: AutonomousEvent };

    console.log(`[Coordinator] Processing event: ${event.type} (${event.severity})`);

    // Intelligence Engine: Decide what to do
    const decision = await makeAutonomousDecision(supabase, event);
    
    console.log(`[Coordinator] Decision: ${decision.action} (confidence: ${decision.confidence})`);

    // Execute decision if confidence is high enough
    let executionResult = null;
    if (decision.confidence >= 0.75 && !decision.requires_approval) {
      executionResult = await executeAutonomousAction(supabase, decision, event);
    } else {
      // Queue for admin approval
      await queueForApproval(supabase, event, decision);
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_processed: true,
        decision,
        executed: executionResult !== null,
        execution_result: executionResult,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Coordinator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function makeAutonomousDecision(
  supabase: any,
  event: AutonomousEvent
): Promise<CoordinatorDecision> {
  
  // Query intelligence patterns
  const { data: learnings } = await supabase
    .from('confidence_scores')
    .select('*')
    .order('current_confidence', { ascending: false })
    .limit(10);

  // Query recent successful patterns
  const { data: patterns } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .gte('confidence_score', 0.7)
    .order('last_success_at', { ascending: false })
    .limit(5);

  // Decision logic based on event type
  switch (event.type) {
    case 'error_detected':
      return {
        action: 'trigger_backend_self_monitor',
        confidence: 0.85,
        systems_to_invoke: ['backend-self-monitor', 'autonomous-corrector'],
        reasoning: 'High confidence pattern match found for this error type',
        requires_approval: event.severity === 'critical'
      };

    case 'pattern_learned':
      return {
        action: 'update_intelligence_engine',
        confidence: 0.9,
        systems_to_invoke: ['pattern-learning'],
        reasoning: 'New pattern can be safely integrated into learning system',
        requires_approval: false
      };

    case 'ux_frustration':
      return {
        action: 'analyze_and_suggest',
        confidence: 0.7,
        systems_to_invoke: ['ux-pattern-integration'],
        reasoning: 'UX pattern detected, suggesting improvements',
        requires_approval: true
      };

    case 'performance_degradation':
      return {
        action: 'optimize_and_monitor',
        confidence: 0.75,
        systems_to_invoke: ['performance-optimizer'],
        reasoning: 'Performance metrics below threshold',
        requires_approval: event.severity === 'critical'
      };

    default:
      return {
        action: 'log_and_monitor',
        confidence: 0.5,
        systems_to_invoke: [],
        reasoning: 'Unknown event type, requires analysis',
        requires_approval: true
      };
  }
}

async function executeAutonomousAction(
  supabase: any,
  decision: CoordinatorDecision,
  event: AutonomousEvent
): Promise<any> {
  
  const results = [];

  for (const system of decision.systems_to_invoke) {
    console.log(`[Coordinator] Invoking system: ${system}`);
    
    try {
      const { data, error } = await supabase.functions.invoke(system, {
        body: { event, decision }
      });

      if (error) {
        console.error(`[Coordinator] System ${system} failed:`, error);
        results.push({ system, success: false, error: error.message });
      } else {
        results.push({ system, success: true, data });
      }
    } catch (err) {
      console.error(`[Coordinator] Failed to invoke ${system}:`, err);
      results.push({ system, success: false, error: err.message });
    }
  }

  // Log coordination event
  await supabase.from('orchestration_metrics').insert({
    operation_type: decision.action,
    success: results.every(r => r.success),
    duration_ms: 0,
    metadata: {
      event_type: event.type,
      systems_invoked: decision.systems_to_invoke,
      results
    }
  });

  return results;
}

async function queueForApproval(
  supabase: any,
  event: AutonomousEvent,
  decision: CoordinatorDecision
): Promise<void> {
  
  console.log('[Coordinator] Queueing for admin approval');

  // Create notification for admins
  await supabase.rpc('notify_admins', {
    notification_type: 'autonomous_action_pending',
    notification_title: 'Autonomous Action Requires Approval',
    notification_message: `${decision.action} pending approval (confidence: ${decision.confidence})`,
    notification_data: {
      event,
      decision,
      timestamp: new Date().toISOString()
    }
  });

  // Store in pending actions table
  await supabase.from('auto_fixes').insert({
    error_id: event.data.id,
    fix_strategy: decision.action,
    status: 'pending_approval',
    confidence_score: decision.confidence,
    reasoning: decision.reasoning,
    metadata: { event, decision }
  });
}
