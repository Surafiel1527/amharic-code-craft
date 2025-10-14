/**
 * useMegaMind Hook
 * Client-side interface to the Mega Mind AGI system
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    setCurrentPhase('Understanding request...');

    try {
      // STEP 1: Understand
      const { data: understandResult, error: understandError } = await supabase.functions.invoke(
        'mega-mind',
        {
          body: {
            operation: 'understand',
            userRequest,
            userId: (await supabase.auth.getUser()).data.user?.id,
            conversationId,
            projectId
          }
        }
      );

      if (understandError) throw understandError;

      const megaDecision = understandResult.decision as MegaMindDecision;
      setDecision(megaDecision);

      // Show what Mega Mind understood
      toast({
        title: "🧠 Mega Mind Analysis",
        description: `Complexity: ${megaDecision.complexity} | ${megaDecision.requiredFunctions} functions needed`,
      });

      return megaDecision;

    } catch (error) {
      console.error('Mega Mind error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to analyze',
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
      setCurrentPhase('');
    }
  };

  const execute = async (
    decision: MegaMindDecision,
    resources: Record<string, string> = {}
  ) => {
    setIsProcessing(true);
    setCurrentPhase('Executing plan...');

    try {
      const { data: executeResult, error: executeError } = await supabase.functions.invoke(
        'mega-mind',
        {
          body: {
            operation: 'execute',
            decision,
            resources
          }
        }
      );

      if (executeError) throw executeError;

      toast({
        title: "✅ Execution Complete",
        description: "Code generated successfully",
      });

      return executeResult.result;

    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: "Error",
        description: "Failed to execute plan",
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
