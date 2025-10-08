import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * useProfile Hook
 * Manages user profile data with CRUD operations
 * 
 * Usage:
 * const { profile, loading, updateProfile } = useProfile(userId);
 * 
 * // Update profile
 * await updateProfile({ full_name: 'New Name' });
 */

interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          toast({ 
            title: 'Error loading profile', 
            description: error.message,
            variant: 'destructive' 
          });
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Exception fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId, toast]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return { error: 'No user ID provided' };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        toast({ 
          title: 'Error updating profile', 
          description: error.message,
          variant: 'destructive' 
        });
        return { error };
      }

      toast({ title: 'Profile updated successfully' });
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: 'Error updating profile', 
        description: message,
        variant: 'destructive' 
      });
      return { error: message };
    }
  };

  const refreshProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    setProfile(data);
    setLoading(false);
  };

  return { 
    profile, 
    loading, 
    updateProfile,
    refreshProfile
  };
}
