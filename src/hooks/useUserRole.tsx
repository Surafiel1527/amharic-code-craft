import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'user';

export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      console.log('⚠️ No userId provided, setting role to null');
      setRole(null);
      setLoading(false);
      return;
    }

    console.log('🔍 Starting role fetch for userId:', userId);
    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('❌ Error fetching user role:', error);
          setRole('user'); // Default to user on error
        } else if (!data) {
          console.log('⚠️ No role found for user:', userId, '- defaulting to user');
          setRole('user');
        } else {
          console.log('✅ Successfully fetched role:', data.role, 'for user:', userId);
          setRole(data.role as UserRole);
        }
      } catch (error) {
        console.error('❌ Exception while fetching user role:', error);
        setRole('user');
      } finally {
        console.log('🏁 Role fetch completed. Final role:', role, 'Loading:', false);
        setLoading(false);
      }
    };

    fetchRole();
  }, [userId]);

  return { role, loading, isAdmin: role === 'admin' };
};
