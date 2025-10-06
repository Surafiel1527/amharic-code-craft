import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Code, Palette, Layout, FileText, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PagePreviewDialog } from './PagePreviewDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { logger } from '@/utils/logger';

interface Customization {
  id: string;
  customization_type: string;
  prompt: string;
  applied_changes: any;
  status: string;
  created_at: string;
  applied_at?: string;
}

const typeIcons = {
  style: Palette,
  feature: Code,
  layout: Layout,
  content: FileText,
};

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  applied: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function AdminCustomizationsList() {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState({ path: '/', title: 'Home' });
  const { toast } = useToast();
  const { t } = useLanguage();
  
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

  useEffect(() => {
    loadCustomizations();
  }, []);

  const loadCustomizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_customizations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setCustomizations(data);
      }
    } catch (error) {
      console.error('Error loading customizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customizations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reapplyCustomization = async (prompt: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the chat interface to send the prompt
      toast({
        title: '📋 Prompt copied',
        description: 'Paste it in the chat below to reapply',
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(prompt);
    } catch (error) {
      console.error('Error reapplying customization:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy prompt',
        variant: 'destructive',
      });
    }
  };

  const approveCustomization = async (customizationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update status to applied
      const { error } = await supabase
        .from('admin_customizations')
        .update({ 
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', customizationId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: '✅ Approved',
        description: 'Turn OFF preview mode to see the applied change on the page.',
      });

      loadCustomizations();
    } catch (error) {
      console.error('Error approving customization:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve customization',
        variant: 'destructive',
      });
    }
  };

  const rejectCustomization = async (customizationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        return;
      }

      logger.info('Attempting to delete customization', { customizationId });

      // Delete the rejected customization
      const { error, data } = await supabase
        .from('admin_customizations')
        .delete()
        .eq('id', customizationId)
        .eq('user_id', user.id)
        .select();

      if (error) {
        logger.error('Database error', error);
        throw error;
      }

      logger.info('Deleted rows', { count: data?.length });

      if (!data || data.length === 0) {
        toast({
          title: '⚠️ Already removed',
          description: 'This customization was already deleted',
        });
        loadCustomizations();
        return;
      }

      toast({
        title: '🗑️ Rejected',
        description: 'Customization has been removed',
      });

      loadCustomizations();
    } catch (error: any) {
      console.error('Error rejecting customization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject customization',
        variant: 'destructive',
      });
    }
  };

  const clearOldDuplicates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Keep only the most recent customization, delete older ones
      if (customizations.length <= 1) {
        toast({
          title: 'Nothing to clear',
          description: 'You only have one customization',
        });
        return;
      }

      // Delete all but the most recent
      const idsToDelete = customizations.slice(1).map(c => c.id);
      
      const { error } = await supabase
        .from('admin_customizations')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: '🧹 Cleaned up',
        description: `Removed ${idsToDelete.length} old customization${idsToDelete.length !== 1 ? 's' : ''}`,
      });

      loadCustomizations();
    } catch (error) {
      console.error('Error clearing duplicates:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear old customizations',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <Card className="p-4">Loading customizations...</Card>;
  }

  return (
    <>
      <PagePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        pagePath={previewPage.path}
        pageTitle={previewPage.title}
      />
      
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('recentCustomizations.title')}
        </h3>
        {customizations.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={clearOldDuplicates}
            className="text-xs"
          >
            🧹 {t('recentCustomizations.clearOld')}
          </Button>
        )}
      </div>

      {customizations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No customizations yet. Start by chatting with the AI!
        </p>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {customizations.map((customization) => {
              const Icon = typeIcons[customization.customization_type as keyof typeof typeIcons] || Code;
              
              return (
                <Card key={customization.id} className="p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">
                          {customization.prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={statusColors[customization.status as keyof typeof statusColors]}
                          >
                            {t(`recentCustomizations.${customization.status}`)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {t(`recentCustomizations.${customization.customization_type}`)}
                          </Badge>
                          {customization.applied_changes?.page && (
                            <Badge variant="outline" className="text-xs">
                              📄 {getPageName(customization.applied_changes.page)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(customization.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                     {customization.status === 'pending' && (
                       <div className="flex flex-row sm:flex-row gap-1.5 flex-shrink-0 w-full sm:w-auto">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => {
                             const pagePath = customization.applied_changes?.page || '/';
                             setPreviewPage({
                               path: pagePath,
                               title: getPageName(pagePath)
                             });
                             setPreviewOpen(true);
                           }}
                           className="gap-1 h-8 px-2 text-xs flex-1 sm:flex-initial"
                         >
                           <Eye className="h-3 w-3" />
                           <span>{t('recentCustomizations.view')}</span>
                         </Button>
                         <Button
                           size="sm"
                           variant="default"
                           onClick={() => approveCustomization(customization.id)}
                           className="gap-1 h-8 px-2 text-xs flex-1 sm:flex-initial"
                         >
                           <CheckCircle className="h-3 w-3" />
                           <span>{t('recentCustomizations.approve')}</span>
                         </Button>
                         <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => rejectCustomization(customization.id)}
                           className="gap-1 h-8 px-2 text-xs flex-1 sm:flex-initial"
                         >
                           <XCircle className="h-3 w-3" />
                           <span>{t('recentCustomizations.reject')}</span>
                         </Button>
                       </div>
                     )}

                     {customization.status === 'applied' && (
                       <div className="flex gap-2 flex-shrink-0">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => reapplyCustomization(customization.prompt)}
                           className="gap-1"
                         >
                           📋 {t('recentCustomizations.reuse')}
                         </Button>
                         <CheckCircle className="h-5 w-5 text-green-500" />
                       </div>
                     )}

                    {customization.status === 'failed' && (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  {customization.applied_changes?.description && (
                    <p className="text-xs text-muted-foreground mt-2 pl-11">
                      {customization.applied_changes.description}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
      </Card>
    </>
  );
}