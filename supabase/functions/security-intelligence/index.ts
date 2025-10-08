import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Security Intelligence Engine
 * Auto-applies security best practices to generated code
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
      generatedCode, 
      tableName, 
      operation, 
      projectContext,
      userId 
    } = await req.json();

    console.log('🔒 Security Intelligence analyzing:', { tableName, operation, userId });

    const securityAnalysis = {
      risks: [] as string[],
      recommendations: [] as string[],
      auto_fixes: [] as any[],
      rls_policies: [] as string[],
      requires_approval: false
    };

    // **1. Check for missing RLS**
    if (tableName && !await hasRLS(supabase, tableName)) {
      securityAnalysis.risks.push(`Table '${tableName}' has no RLS enabled`);
      securityAnalysis.recommendations.push('Enable RLS and add user-based policies');
      securityAnalysis.auto_fixes.push({
        type: 'enable_rls',
        sql: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`
      });
      securityAnalysis.rls_policies.push(generateUserRLSPolicy(tableName));
      securityAnalysis.requires_approval = true;
    }

    // **2. Check for auth requirements**
    if (operation === 'insert' || operation === 'update' || operation === 'delete') {
      if (!generatedCode.includes('auth.uid()')) {
        securityAnalysis.risks.push('Mutation without user authentication check');
        securityAnalysis.recommendations.push('Add user_id column linked to auth.uid()');
        securityAnalysis.requires_approval = true;
      }
    }

    // **3. Check for PII exposure**
    const piiColumns = ['email', 'phone', 'address', 'ssn', 'credit_card'];
    if (piiColumns.some(col => generatedCode.toLowerCase().includes(col))) {
      securityAnalysis.risks.push('Potential PII exposure detected');
      securityAnalysis.recommendations.push('Restrict public SELECT policies on PII columns');
      securityAnalysis.requires_approval = true;
    }

    // **4. Auto-generate secure patterns**
    const securePatterns = {
      protected_route: generateProtectedRoute(),
      confirm_dialog: generateConfirmDialog(),
      use_profile_hook: generateUseProfileHook()
    };

    // Log security event
    await supabase
      .from('security_events')
      .insert({
        user_id: userId,
        event_type: 'security_analysis',
        table_name: tableName,
        risks_detected: securityAnalysis.risks.length,
        auto_fixed: securityAnalysis.auto_fixes.length,
        metadata: {
          risks: securityAnalysis.risks,
          recommendations: securityAnalysis.recommendations
        }
      });

    return new Response(JSON.stringify({
      success: true,
      security_analysis: securityAnalysis,
      secure_patterns: securePatterns,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in security-intelligence:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper: Check if table has RLS enabled
async function hasRLS(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `SELECT relrowsecurity FROM pg_class WHERE relname = '${tableName}'`
    });
    return data?.[0]?.relrowsecurity === true;
  } catch {
    return false;
  }
}

// Generate standard user-based RLS policy
function generateUserRLSPolicy(tableName: string): string {
  return `
-- Enable RLS on ${tableName}
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Users can view their own ${tableName}
CREATE POLICY "Users can view own ${tableName}"
  ON ${tableName} FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own ${tableName}
CREATE POLICY "Users can create own ${tableName}"
  ON ${tableName} FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ${tableName}
CREATE POLICY "Users can update own ${tableName}"
  ON ${tableName} FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own ${tableName}
CREATE POLICY "Users can delete own ${tableName}"
  ON ${tableName} FOR DELETE
  USING (auth.uid() = user_id);
  `;
}

// Generate ProtectedRoute component
function generateProtectedRoute(): string {
  return `
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  
  return <>{children}</>;
}
  `;
}

// Generate ConfirmDialog component
function generateConfirmDialog(): string {
  return `
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export function ConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  title,
  description 
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
  `;
}

// Generate useProfile hook
function generateUseProfileHook(): string {
  return `
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        toast({ title: 'Error loading profile', variant: 'destructive' });
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: any) => {
    if (!userId) return { error: 'No user ID' };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      toast({ title: 'Error updating profile', variant: 'destructive' });
      return { error };
    }

    toast({ title: 'Profile updated successfully' });
    setProfile({ ...profile, ...updates });
    return { error: null };
  };

  return { profile, loading, updateProfile };
}
  `;
}
