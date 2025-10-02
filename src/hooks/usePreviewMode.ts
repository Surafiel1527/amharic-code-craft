import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to detect if preview mode should be enabled based on URL query parameter
 * Returns true if ?preview=true is in the URL, false otherwise
 */
export function usePreviewMode() {
  const location = useLocation();
  
  const isPreviewMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('preview') === 'true';
  }, [location.search]);
  
  return isPreviewMode;
}
