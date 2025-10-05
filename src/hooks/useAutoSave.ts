import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAutoSaveOptions {
  delay?: number; // milliseconds
  onSave: (data: any) => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions
) {
  const { delay = 2000, onSave, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<T>(data);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    
    try {
      isSavingRef.current = true;
      await onSave(data);
      previousDataRef.current = data;
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Auto-save failed');
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave]);

  useEffect(() => {
    if (!enabled) return;

    // Check if data has changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  return { isSaving: isSavingRef.current };
}
