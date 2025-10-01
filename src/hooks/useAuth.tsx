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
    console.log('🔐 Auth: Initializing authentication...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth event:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle auth events
        if (event === 'SIGNED_IN') {
          console.log('✅ Auth: User signed in successfully');
          navigate("/");
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Auth: User signed out');
          navigate("/auth");
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Auth: Token refreshed successfully');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Auth: Error getting session:', error);
        
        // Report authentication error to self-healing system
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
      
      console.log('🔐 Auth: Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('🔐 Auth: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    console.log('👋 Auth: Signing out user...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Auth: Sign out error:', error);
        throw error;
      }
      console.log('✅ Auth: Sign out successful');
    } catch (error) {
      console.error('❌ Auth: Sign out failed:', error);
      
      // Report sign out error
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
