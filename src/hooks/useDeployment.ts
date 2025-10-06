import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DeploymentFile {
  path: string;
  content: string;
}

interface DeploymentOptions {
  projectId: string;
  projectName: string;
  files: DeploymentFile[];
  envVariables?: Record<string, string>;
  customDomain?: string;
}

interface Deployment {
  id: string;
  project_id: string;
  vercel_deployment_id: string | null;
  vercel_project_id: string | null;
  deployment_url: string | null;
  custom_domain: string | null;
  status: 'pending' | 'building' | 'deploying' | 'ready' | 'error' | 'canceled';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export const useDeployment = (projectId?: string) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const queryClient = useQueryClient();

  // Fetch deployments for a project
  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('vercel_deployments' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) as Deployment[];
    },
    enabled: !!projectId,
    refetchInterval: () => {
      // Refetch every 5 seconds if there are pending/building/deploying deployments
      const hasPending = deployments?.some(d => 
        ['pending', 'building', 'deploying'].includes(d.status)
      );
      return hasPending ? 5000 : false;
    },
  });

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: async (options: DeploymentOptions) => {
      setIsDeploying(true);

      // Convert files array to object
      const filesObject = options.files.reduce((acc, file) => {
        acc[file.path] = file.content;
        return acc;
      }, {} as Record<string, string>);

      const { data, error } = await supabase.functions.invoke('vercel-deploy-full', {
        body: {
          projectId: options.projectId,
          projectName: options.projectName,
          files: filesObject,
          envVariables: options.envVariables,
          customDomain: options.customDomain,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Deployment started successfully!');
      queryClient.invalidateQueries({ queryKey: ['deployments', projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Deployment failed: ${error.message}`);
    },
    onSettled: () => {
      setIsDeploying(false);
    },
  });

  // Cancel deployment
  const cancelDeployment = async (deploymentId: string) => {
    const { error } = await supabase
      .from('vercel_deployments' as any)
      .update({ status: 'canceled' } as any)
      .eq('id', deploymentId);

    if (error) {
      toast.error('Failed to cancel deployment');
      throw error;
    }

    toast.success('Deployment canceled');
    queryClient.invalidateQueries({ queryKey: ['deployments', projectId] });
  };

  return {
    deployments,
    isLoading,
    isDeploying,
    deploy: deployMutation.mutate,
    cancelDeployment,
    latestDeployment: deployments?.[0],
  };
};
