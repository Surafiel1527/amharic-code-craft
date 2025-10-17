/**
 * ERROR CAPTURE PROVIDER
 * 
 * Wraps the entire app to activate universal error capture
 */

import { ReactNode } from 'react';
import { useUniversalErrorCapture } from '@/hooks/useUniversalErrorCapture';
import { useUserContextTracker } from '@/hooks/useUserContextTracker';

interface Props {
  children: ReactNode;
}

export const ErrorCaptureProvider = ({ children }: Props) => {
  // Activate universal error capture
  useUniversalErrorCapture();
  
  // Activate user context tracking
  useUserContextTracker();

  return <>{children}</>;
};
