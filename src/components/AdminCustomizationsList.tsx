import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Code, Palette, Layout, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const { toast } = useToast();

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
        title: '✅ Approved & Applied',
        description: 'Customization is now live!',
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
      if (!user) return;

      // Delete the rejected customization
      const { error } = await supabase
        .from('admin_customizations')
        .delete()
        .eq('id', customizationId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: '🗑️ Rejected',
        description: 'Customization has been removed',
      });

      loadCustomizations();
    } catch (error) {
      console.error('Error rejecting customization:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject customization',
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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Customizations
        </h3>
        {customizations.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={clearOldDuplicates}
            className="text-xs"
          >
            🧹 Clear Old
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">
                          {customization.prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={statusColors[customization.status as keyof typeof statusColors]}
                          >
                            {customization.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {customization.customization_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(customization.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {customization.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveCustomization(customization.id)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectCustomization(customization.id)}
                          className="gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {customization.status === 'applied' && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
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
  );
}