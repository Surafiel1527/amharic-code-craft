import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

interface TrackGenerationParams {
  userPrompt: string;
  systemPrompt: string;
  generatedCode: string;
  model: string;
  conversationHistory?: any[];
  existingCode?: string;
  generationTimeMs?: number;
  projectId?: string;
}

export const useAITracking = () => {
  const [generationId, setGenerationId] = useState<string | null>(null);

  const trackGeneration = async (params: TrackGenerationParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get active prompt version
      const { data: promptVersion } = await supabase
        .from('prompt_versions')
        .select('version')
        .eq('is_active', true)
        .single();

      const startTime = Date.now();

      const { data, error } = await supabase
        .from('generation_analytics')
        .insert({
          user_id: user.id,
          project_id: params.projectId,
          prompt_version: promptVersion?.version || 'v1.0.0',
          model_used: params.model,
          user_prompt: params.userPrompt,
          system_prompt: params.systemPrompt,
          generated_code: params.generatedCode,
          conversation_history: params.conversationHistory || [],
          existing_code_context: params.existingCode,
          generation_time_ms: params.generationTimeMs || Date.now() - startTime,
          status: 'success'
        })
        .select()
        .single();

      if (error) throw error;

      setGenerationId(data.id);
      return data.id;
    } catch (error) {
      logger.error('Error tracking generation', error);
      return null;
    }
  };

  const trackError = async (params: TrackGenerationParams & { errorMessage: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('generation_analytics')
        .insert({
          user_id: user.id,
          project_id: params.projectId,
          prompt_version: 'v1.0.0',
          model_used: params.model,
          user_prompt: params.userPrompt,
          system_prompt: params.systemPrompt,
          generated_code: params.generatedCode || '',
          status: 'error',
          error_message: params.errorMessage,
          generation_time_ms: params.generationTimeMs
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      logger.error('Error tracking error', error);
      return null;
    }
  };

  const requestReflection = async (generationId: string) => {
    try {
      const { data: generation } = await supabase
        .from('generation_analytics')
        .select('*')
        .eq('id', generationId)
        .single();

      if (!generation) return null;

      const { data, error } = await supabase.functions.invoke('ai-reflect', {
        body: {
          generatedCode: generation.generated_code,
          userRequest: generation.user_prompt,
          model: generation.model_used
        }
      });

      if (error) throw error;

      return data.reflection;
    } catch (error) {
      logger.error('Error requesting reflection', error);
      return null;
    }
  };

  return {
    generationId,
    trackGeneration,
    trackError,
    requestReflection
  };
};