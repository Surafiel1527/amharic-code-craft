import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface PreviewBannerProps {
  pendingCount: number;
  affectedPages: string[];
}

export function PreviewBanner({ pendingCount, affectedPages }: PreviewBannerProps) {
  const { t } = useLanguage();
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
          🔍 <strong>{t("preview.showing")}</strong> {pendingCount} {pendingCount > 1 ? t("preview.pendingChangesPlural") : t("preview.pendingChanges")}. 
          {otherPages.length > 0 && (
            <span className="ml-1">
              {t("preview.navigateTo")} <strong>{otherPages.map(getPageName).join(', ')}</strong> {t("preview.toSee")} {otherPages.length > 1 ? t("preview.those") : t("preview.that")} {t("preview.previews")}.
            </span>
          )}
          <span className="ml-1">{t("preview.approveOrReject")}</span>
        </div>
        {otherPages.length > 0 && (
          <Button
            onClick={() => navigate(otherPages[0])}
            variant="outline"
            size="sm"
          >
            {t("preview.goTo")} {getPageName(otherPages[0])}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
