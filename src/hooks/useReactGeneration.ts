import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeneratedFile {
  path: string;
  code: string;
  type: 'component' | 'hook' | 'util' | 'style' | 'config';
}

export interface ReactGeneration {
  id: string;
  entry_point: string;
  files: GeneratedFile[];
  prompt: string;
  created_at: string;
  user_id: string;
}

export const useReactGeneration = () => {
  return useMutation({
    mutationFn: async ({ prompt, context }: { prompt: string; context?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call the generation function
      const { data, error } = await supabase.functions.invoke('unified-code-operations', {
        body: {
          operation: 'react-generation',
          prompt,
          context,
          user_id: user.id
        }
      });

      if (error) throw error;
      
      // Store the generation result
      const { data: jobData, error: jobError } = await supabase
        .from('ai_generation_jobs')
        .insert({
          user_id: user.id,
          job_type: 'react-generation',
          input_data: { prompt, context },
          output_data: {
            entry_point: data.entry_point,
            files: data.files
          },
          status: 'completed'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      return {
        id: jobData.id,
        entry_point: data.entry_point,
        files: data.files,
        prompt,
        created_at: jobData.created_at,
        user_id: user.id
      } as ReactGeneration;
    },
    onSuccess: () => {
      toast.success('React components generated successfully!');
    },
    onError: (error: any) => {
      toast.error('Generation failed: ' + (error?.message || 'Unknown error'));
    },
  });
};

export const useReactGenerationHistory = () => {
  return useQuery({
    queryKey: ['react-generations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('job_type', 'react-generation')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(job => {
        const outputData = job.output_data as any;
        const inputData = job.input_data as any;
        return {
          id: job.id,
          entry_point: outputData?.entry_point || '',
          files: outputData?.files || [],
          prompt: inputData?.prompt || '',
          created_at: job.created_at,
          user_id: job.user_id
        } as ReactGeneration;
      });
    },
  });
};

export const useReactGenerationById = (id: string) => {
  return useQuery({
    queryKey: ['react-generation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const outputData = data.output_data as any;
      const inputData = data.input_data as any;

      return {
        id: data.id,
        entry_point: outputData?.entry_point || '',
        files: outputData?.files || [],
        prompt: inputData?.prompt || '',
        created_at: data.created_at,
        user_id: data.user_id
      } as ReactGeneration;
    },
    enabled: !!id,
  });
};
