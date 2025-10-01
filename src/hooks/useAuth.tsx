import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isInitialLoad = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only navigate on actual sign in/out events, not on token refresh
        if (event === 'SIGNED_IN' && isInitialLoad) {
          navigate("/");
          isInitialLoad = false;
        } else if (event === 'SIGNED_OUT') {
          navigate("/auth");
        } else if (event === 'SIGNED_IN') {
          // Token refresh or other auth update - don't navigate
          isInitialLoad = false;
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        supabase.functions.invoke('report-error', {
          body: {
            errorType: 'AuthError',
            errorMessage: error.message,
            source: 'frontend',
            filePath: 'hooks/useAuth.tsx',
            functionName: 'getSession',
            severity: 'high',
            context: {
              operation: 'initial_session_check',
              errorCode: error.status
            }
          }
        }).catch(err => console.error('Failed to report auth error:', err));
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      supabase.functions.invoke('report-error', {
        body: {
          errorType: 'AuthError',
          errorMessage: error instanceof Error ? error.message : 'Sign out failed',
          source: 'frontend',
          filePath: 'hooks/useAuth.tsx',
          functionName: 'signOut',
          severity: 'medium',
          context: { operation: 'sign_out' }
        }
      }).catch(err => console.error('Failed to report sign out error:', err));
      
      throw error;
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
};
