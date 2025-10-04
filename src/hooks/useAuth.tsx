import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only navigate on explicit sign out - never on sign in or token refresh
        if (event === 'SIGNED_OUT') {
          navigate("/auth");
          hasNavigatedRef.current = false;
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
      // Use local scope to clear client-side session even if server session is invalid
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Even if there's an error, clear local state and redirect
      if (error) {
        console.warn('Sign out warning:', error.message);
        
        // If session not found, it means we're already signed out server-side
        if (error.message.includes('session_not_found')) {
          console.log('Session already expired, clearing local state');
        } else {
          // Report other errors but don't block sign out
          supabase.functions.invoke('report-error', {
            body: {
              errorType: 'AuthError',
              errorMessage: error.message,
              source: 'frontend',
              filePath: 'hooks/useAuth.tsx',
              functionName: 'signOut',
              severity: 'low',
              context: { operation: 'sign_out' }
            }
          }).catch(err => console.error('Failed to report sign out error:', err));
        }
      }
      
      // Always clear local state and redirect
      setUser(null);
      setSession(null);
      navigate("/auth");
      
    } catch (error) {
      // If sign out completely fails, still clear local state
      console.error('Sign out error:', error);
      setUser(null);
      setSession(null);
      navigate("/auth");
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
};
