import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

interface PreviewBannerProps {
  pendingCount: number;
  affectedPages: string[];
}

export function PreviewBanner({ pendingCount, affectedPages }: PreviewBannerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getPageName = (path: string) => {
    const pageNames: Record<string, string> = {
      '/': 'Home',
      '/auth': 'Login',
      '/admin': 'Admin',
      '/settings': 'Settings',
      '/explore': 'Explore'
    };
    return pageNames[path] || path;
  };

  const otherPages = affectedPages.filter(page => page !== location.pathname);

  if (pendingCount === 0) return null;

  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div>
          🔍 <strong>Preview Mode:</strong> Showing {pendingCount} pending change{pendingCount > 1 ? 's' : ''}. 
          {otherPages.length > 0 && (
            <span className="ml-1">
              Navigate to <strong>{otherPages.map(getPageName).join(', ')}</strong> to see {otherPages.length > 1 ? 'those' : 'that'} preview{otherPages.length > 1 ? 's' : ''}.
            </span>
          )}
          <span className="ml-1">Go to the Self-Modify tab to approve or reject.</span>
        </div>
        {otherPages.length > 0 && (
          <Button
            onClick={() => navigate(otherPages[0])}
            variant="outline"
            size="sm"
          >
            Go to {getPageName(otherPages[0])}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
