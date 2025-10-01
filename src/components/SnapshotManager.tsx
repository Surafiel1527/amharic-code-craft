import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Save, Download, Trash2, Camera, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface Snapshot {
  id: string;
  name: string;
  description: string | null;
  customizations: any;
  created_at: string;
}

interface SnapshotManagerProps {
  onPreview?: (snapshotId: string, snapshotName: string) => void;
}

export function SnapshotManager({ onPreview }: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    try {
      const { data, error } = await supabase
        .from('customization_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSnapshots(data || []);
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      toast.error('Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handleSaveSnapshot = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the snapshot');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('save-snapshot', {
        body: { name: name.trim(), description: description.trim() || null }
      });

      if (error) throw error;

      toast.success('Snapshot saved successfully');
      setName('');
      setDescription('');
      setIsDialogOpen(false);
      fetchSnapshots();
    } catch (error) {
      console.error('Error saving snapshot:', error);
      toast.error('Failed to save snapshot');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreSnapshot = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('restore-snapshot', {
        body: { snapshotId: id }
      });

      if (error) throw error;

      toast.success('Snapshot restored successfully');
      setRestoreId(null);
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      toast.error('Failed to restore snapshot');
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customization_snapshots')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Snapshot deleted successfully');
      setDeleteId(null);
      fetchSnapshots();
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      toast.error('Failed to delete snapshot');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Versions</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Saved Versions
              </CardTitle>
              <CardDescription>
                Save and restore complete dashboard configurations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Current State
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Dashboard State</DialogTitle>
                  <DialogDescription>
                    Create a named snapshot of your current dashboard configuration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Version Name *
                    </label>
                    <Input
                      id="name"
                      placeholder="e.g., Q4 Holiday Theme"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description (optional)
                    </label>
                    <Textarea
                      id="description"
                      placeholder="What's special about this configuration?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSnapshot} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Snapshot'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved versions yet. Save your current configuration to create your first snapshot!
            </p>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {snapshots.map((snapshot) => (
                  <Card key={snapshot.id} className="border-l-4 border-l-accent">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{snapshot.name}</h3>
                            <Badge variant="secondary">
                              {Array.isArray(snapshot.customizations) ? snapshot.customizations.length : 0} modifications
                            </Badge>
                          </div>
                          {snapshot.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {snapshot.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Saved {format(new Date(snapshot.created_at), 'PPp')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onPreview?.(snapshot.id, snapshot.name)}
                            title="Preview this version"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setRestoreId(snapshot.id)}
                            title="Restore this version"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(snapshot.id)}
                            title="Delete this version"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!restoreId} onOpenChange={(open) => !open && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore This Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current dashboard configuration with this saved version. Your current state will be lost unless you save it first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreId && handleRestoreSnapshot(restoreId)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete This Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this saved version. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteSnapshot(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}