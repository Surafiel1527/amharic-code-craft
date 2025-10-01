import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Undo2, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
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

interface Customization {
  id: string;
  prompt: string;
  customization_type: string;
  status: string;
  applied_at: string;
  created_at: string;
  applied_changes: any;
}

export function ModificationHistory() {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackId, setRollbackId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_customizations')
        .select('*')
        .eq('status', 'applied')
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setCustomizations(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load modification history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Subscribe to changes
    const channel = supabase
      .channel('admin_customizations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_customizations'
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRollback = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('rollback-customization', {
        body: { customizationId: id }
      });

      if (error) throw error;

      toast.success('Modification rolled back successfully');
      setRollbackId(null);
    } catch (error) {
      console.error('Error rolling back:', error);
      toast.error('Failed to rollback modification');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modification History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Modification History
          </CardTitle>
          <CardDescription>
            View and manage all approved dashboard modifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customizations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No modifications yet. Start customizing your dashboard!
            </p>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {customizations.map((customization) => (
                  <Card key={customization.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {customization.customization_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(customization.applied_at), 'PPp')}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{customization.prompt}</p>
                          {customization.applied_changes && (
                            <p className="text-xs text-muted-foreground">
                              {JSON.stringify(customization.applied_changes).length > 100
                                ? JSON.stringify(customization.applied_changes).substring(0, 100) + '...'
                                : JSON.stringify(customization.applied_changes)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRollbackId(customization.id)}
                          title="Rollback this modification"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!rollbackId} onOpenChange={(open) => !open && setRollbackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Modification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this modification from your dashboard. This action cannot be undone, but you can always reapply changes later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => rollbackId && handleRollback(rollbackId)}>
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}