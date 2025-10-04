import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Trash2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Theme {
  id: string;
  name: string;
  description: string | null;
  screenshot_url: string | null;
  customizations: any;
  created_at: string;
}

interface ThemeGalleryProps {
  onPreview?: (themeId: string, themeName: string) => void;
  onApply?: (themeId: string) => void;
}

export function ThemeGallery({ onPreview, onApply }: ThemeGalleryProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [applyId, setApplyId] = useState<string | null>(null);
  const { t } = useLanguage();

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('customization_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setThemes(data || []);
    } catch (error) {
      console.error('Error fetching themes:', error);
      toast.error(t('themeGallery.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customization_snapshots')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(t('themeGallery.themeDeleted'));
      setDeleteId(null);
      fetchThemes();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error(t('themeGallery.deleteFailed'));
    }
  };

  const handleApply = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('restore-snapshot', {
        body: { snapshotId: id }
      });

      if (error) throw error;

      toast.success(t('themeGallery.themeApplied'));
      setApplyId(null);
      
      // Reload after short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error applying theme:', error);
      toast.error(t('themeGallery.applyFailed'));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-muted" />
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Palette className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{t('themeGallery.noThemes')}</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {t('themeGallery.noThemesDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <Card key={theme.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              {theme.screenshot_url ? (
                <img
                  src={theme.screenshot_url}
                  alt={theme.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Palette className="h-16 w-16 text-muted-foreground/50" />
              )}
              <Badge className="absolute top-2 right-2">
                {Array.isArray(theme.customizations) ? theme.customizations.length : 0} {t('themeGallery.changes')}
              </Badge>
            </div>
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {theme.name}
              </CardTitle>
              {theme.description && (
                <CardDescription>{theme.description}</CardDescription>
              )}
              <p className="text-xs text-muted-foreground">
                {t('themeGallery.created')} {format(new Date(theme.created_at), 'PPp')}
              </p>
            </CardHeader>

            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview?.(theme.id, theme.name)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                {t('themeGallery.preview')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setApplyId(theme.id)}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-1" />
                {t('themeGallery.apply')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(theme.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!applyId} onOpenChange={(open) => !open && setApplyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('themeGallery.applyTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('themeGallery.applyDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('themeGallery.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyId && handleApply(applyId)}>
              {t('themeGallery.apply')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('themeGallery.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('themeGallery.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('themeGallery.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('themeGallery.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
