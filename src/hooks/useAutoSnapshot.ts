import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { logger } from '@/utils/logger';

interface AutoSnapshotConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxSnapshots: number;
}

export function useAutoSnapshot(onChange?: () => void) {
  const [config, setConfig] = useState<AutoSnapshotConfig>({
    enabled: true,
    intervalMinutes: 15,
    maxSnapshots: 50
  });
  const [lastSnapshot, setLastSnapshot] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load config from database
  useEffect(() => {
    const loadConfig = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('auto_snapshot_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error loading auto-snapshot config', error);
        return;
      }

      if (data) {
        setConfig({
          enabled: data.enabled,
          intervalMinutes: data.interval_minutes,
          maxSnapshots: data.max_snapshots
        });
      } else {
        // Create default config
        await supabase.from('auto_snapshot_config').insert({
          user_id: user.id,
          enabled: true,
          interval_minutes: 15,
          max_snapshots: 50
        });
      }
    };

    loadConfig();
  }, []);

  // Set up auto-snapshot timer
  useEffect(() => {
    if (!config.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const createAutoSnapshot = async () => {
      try {
        logger.info('Creating auto-snapshot');
        
        // Capture screenshot
        const mainContent = document.querySelector('main') || document.body;
        const canvas = await html2canvas(mainContent as HTMLElement, {
          backgroundColor: null,
          scale: 0.5,
          logging: false,
          windowWidth: 1280,
          windowHeight: 800,
        });
        const screenshot = canvas.toDataURL('image/png');

        // Save snapshot
        const { error } = await supabase.functions.invoke('save-snapshot', {
          body: { 
            name: `Auto-snapshot ${new Date().toLocaleString()}`, 
            description: 'Automatically created snapshot',
            screenshot,
            isAutomatic: true
          }
        });

        if (error) throw error;

        setLastSnapshot(new Date());
        logger.success('Auto-snapshot created');
        
        // Clean up old snapshots if needed
        await cleanupOldSnapshots();
      } catch (error) {
        logger.error('Error creating auto-snapshot', error);
      }
    };

    // Initial snapshot after 1 minute
    const initialTimeout = setTimeout(createAutoSnapshot, 60000);

    // Set up recurring snapshots
    intervalRef.current = setInterval(
      createAutoSnapshot,
      config.intervalMinutes * 60 * 1000
    );

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config]);

  const cleanupOldSnapshots = async () => {
    try {
      const { data: snapshots, error } = await supabase
        .from('customization_snapshots')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (snapshots && snapshots.length > config.maxSnapshots) {
        const toDelete = snapshots.slice(config.maxSnapshots);
        const ids = toDelete.map(s => s.id);
        
        await supabase
          .from('customization_snapshots')
          .delete()
          .in('id', ids);

        logger.info('Cleaned up old snapshots', { count: ids.length });
      }
    } catch (error) {
      logger.error('Error cleaning up snapshots', error);
    }
  };

  const updateConfig = async (newConfig: Partial<AutoSnapshotConfig>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updated = { ...config, ...newConfig };
    setConfig(updated);

    await supabase
      .from('auto_snapshot_config')
      .update({
        enabled: updated.enabled,
        interval_minutes: updated.intervalMinutes,
        max_snapshots: updated.maxSnapshots
      })
      .eq('user_id', user.id);

    toast.success('Auto-snapshot settings updated');
  };

  const triggerManualSnapshot = async () => {
    try {
      const mainContent = document.querySelector('main') || document.body;
      const canvas = await html2canvas(mainContent as HTMLElement, {
        backgroundColor: null,
        scale: 0.5,
        logging: false,
      });
      const screenshot = canvas.toDataURL('image/png');

      const { error } = await supabase.functions.invoke('save-snapshot', {
        body: { 
          name: `Manual snapshot ${new Date().toLocaleString()}`, 
          description: 'Manually triggered snapshot',
          screenshot
        }
      });

      if (error) throw error;
      toast.success('Snapshot created successfully');
      setLastSnapshot(new Date());
    } catch (error) {
      logger.error('Error creating manual snapshot', error);
      toast.error('Failed to create snapshot');
    }
  };

  return {
    config,
    updateConfig,
    lastSnapshot,
    triggerManualSnapshot
  };
}
