/**
 * Security Pattern Generators
 * Reusable security components and RLS policies
 */

/**
 * Generate standard user-based RLS policy
 */
export function generateUserRLSPolicy(tableName: string): string {
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

/**
 * Generate ProtectedRoute component code
 */
export function generateProtectedRoute(): string {
  return `import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  
  return <>{children}</>;
}`;
}

/**
 * Generate ConfirmDialog component code
 */
export function generateConfirmDialog(): string {
  return `import {
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
}`;
}

/**
 * Generate useProfile hook code
 */
export function generateUseProfileHook(): string {
  return `import { useState, useEffect } from 'react';
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
}`;
}
