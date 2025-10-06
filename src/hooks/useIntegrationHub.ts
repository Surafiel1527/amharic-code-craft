/**
 * Integration Hub Hook - Phase 3C
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export function useIntegrationHub() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const connectIntegration = useCallback(async (type: string, name: string, credentials: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any).from('external_integrations').insert({
        user_id: user.id,
        integration_type: type,
        integration_name: name,
        credentials,
        is_active: true
      });

      if (error) throw error;
      toast.success(`${name} connected successfully`);
    } catch (error) {
      logger.error('Integration error', error);
      toast.error('Failed to connect integration');
    }
  }, []);

  return { integrations, loading, connectIntegration };
}
