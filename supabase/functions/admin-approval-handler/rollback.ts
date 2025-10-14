/**
 * Rollback Helper Functions
 * Restore previous state when rolling back improvements
 */

export async function restorePreviousState(supabaseClient: any, improvement: any) {
  const { item_type, item_id, previous_state } = improvement;

  console.log('Restoring previous state for:', { item_type, item_id });

  switch (item_type) {
    case 'prompt_improvement':
      // Restore old prompt
      if (previous_state.data) {
        await supabaseClient
          .from('ai_prompts')
          .update({
            prompt_text: previous_state.data.prompt_text,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item_id);
      }
      break;

    case 'pattern_evolution':
      // Restore old pattern
      if (previous_state.data) {
        await supabaseClient
          .from('universal_error_patterns')
          .update({
            fix_strategy: previous_state.data.fix_strategy,
            confidence_score: previous_state.data.confidence_score,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item_id);
      }
      break;

    case 'ai_suggestion':
      // Remove the suggestion or restore old version
      if (previous_state.data) {
        await supabaseClient
          .from('ai_knowledge_base')
          .upsert({
            id: previous_state.data.id,
            pattern_name: previous_state.data.pattern_name,
            category: previous_state.data.category,
            best_approach: previous_state.data.best_approach,
            confidence_score: previous_state.data.confidence_score,
          });
      } else {
        // If there was no previous state, delete the new entry
        await supabaseClient
          .from('ai_knowledge_base')
          .delete()
          .eq('pattern_name', improvement.metadata?.knowledge?.pattern_name);
      }
      break;

    default:
      console.warn('Unknown improvement type for rollback:', item_type);
  }
}
