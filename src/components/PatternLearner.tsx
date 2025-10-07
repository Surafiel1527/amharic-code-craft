import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PatternLearner() {
  useEffect(() => {
    // Pattern learning disabled - edge function not implemented yet
    console.log('✅ Pattern learning system ready (currently disabled)');
  }, []);

  return null; // This is a utility component with no UI
}
