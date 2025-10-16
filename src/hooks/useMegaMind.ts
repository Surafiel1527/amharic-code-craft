/**
 * useMegaMind Hook
 * Client-side interface to the Mega Mind AGI system
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { awashContext } from '@/services/awashPlatformContext';

interface MegaMindDecision {
  understood: boolean;
  confidence: number;
  complexity: string;
  requiredPhases: number;
  requiredFunctions: number;
  needsInternet: boolean;
  needsCredentials: string[];
  reasoning: string[];
  plan: any;
  resourceRequests: any[];
  selfTest: any;
}

export function useMegaMind() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [decision, setDecision] = useState<MegaMindDecision | null>(null);

  const analyze = async (
    userRequest: string,
    conversationId: string,
    projectId?: string
  ) => {
    setIsProcessing(true);
    setCurrentPhase('Analyzing request with AI...');

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Build full workspace context
      const platformContext = await awashContext.buildContext(conversationId, projectId);
      console.log('🌍 Full workspace context built:', platformContext);

      // Call unified Universal Mega Mind endpoint with FULL CONTEXT
      const { data: result, error } = await supabase.functions.invoke(
        'mega-mind',
        {
          body: {
            userRequest,
            userId: user.id,
            conversationId,
            projectId,
            awashContext: platformContext // ← FULL WORKSPACE ACCESS
          }
        }
      );

      if (error) throw error;

      // Display AI-generated analysis
      toast({
        title: "🧠 Universal Mega Mind",
        description: result.analysis.intent,
      });

      return result;

    } catch (error) {
      console.error('Universal Mega Mind error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to process request',
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
      setCurrentPhase('');
    }
  };

  const execute = async (
    userRequest: string,
    conversationId: string,
    projectId?: string
  ) => {
    setIsProcessing(true);
    setCurrentPhase('Executing with AI...');

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Build full workspace context
      const platformContext = await awashContext.buildContext(conversationId, projectId);
      console.log('🌍 Full workspace context for execution:', platformContext);

      // Universal Mega Mind handles everything in one call with FULL CONTEXT
      const { data: result, error } = await supabase.functions.invoke(
        'mega-mind',
        {
          body: {
            userRequest,
            userId: user.id,
            conversationId,
            projectId,
            awashContext: platformContext // ← FULL WORKSPACE ACCESS
          }
        }
      );

      if (error) throw error;

      // AI-generated completion message
      toast({
        title: "✅ Complete",
        description: result.result.message,
      });

      return result;

    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
      setCurrentPhase('');
    }
  };

  return {
    analyze,
    execute,
    isProcessing,
    currentPhase,
    decision
  };
}
