import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Database, 
  Trash2, 
  Edit, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Clock,
  Activity,
  AlertTriangle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SavedCredential {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  status: 'active' | 'inactive' | 'error';
  lastChecked?: string;
  createdAt: string;
}

export const SavedCredentialsList = () => {
  const [credentials, setCredentials] = useState<SavedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-database-credentials');
      
      if (error) throw error;
      
      setCredentials(data?.credentials || []);
    } catch (error: any) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (id: string) => {
    setTestingId(id);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-database-health', {
        body: { credentialId: id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`✅ ${data.credential.name} is healthy!`);
        setCredentials(prev => prev.map(c => 
          c.id === id ? { ...c, status: 'active', lastChecked: new Date().toISOString() } : c
        ));
      } else {
        toast.error(`❌ Connection failed: ${data.error}`);
        setCredentials(prev => prev.map(c => 
          c.id === id ? { ...c, status: 'error', lastChecked: new Date().toISOString() } : c
        ));
      }
    } catch (error: any) {
      toast.error('Health check failed: ' + error.message);
    } finally {
      setTestingId(null);
    }
  };

  const deleteCredential = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-database-credentials', {
        body: { credentialId: id }
      });

      if (error) throw error;

      toast.success('Credential deleted successfully');
      setCredentials(prev => prev.filter(c => c.id !== id));
    } catch (error: any) {
      toast.error('Failed to delete credential: ' + error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Saved Database Connections
            </CardTitle>
            <CardDescription>
              Manage and monitor your database credentials
            </CardDescription>
          </div>
          <Button onClick={fetchCredentials} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No saved database credentials yet</p>
            <p className="text-sm">Add your first connection above</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">{credential.name}</h3>
                        <Badge variant="outline" className={getStatusColor(credential.status)}>
                          {getStatusIcon(credential.status)}
                          <span className="ml-1 capitalize">{credential.status}</span>
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {credential.type.toUpperCase()}
                          </Badge>
                          <span>{credential.host}:{credential.port}</span>
                        </div>
                        <p>Database: <span className="font-mono">{credential.database}</span></p>
                        <p>User: <span className="font-mono">{credential.username}</span></p>
                        {credential.lastChecked && (
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            Last checked: {new Date(credential.lastChecked).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => testConnection(credential.id)}
                        disabled={testingId === credential.id}
                      >
                        <RefreshCw className={`w-4 h-4 ${testingId === credential.id ? 'animate-spin' : ''}`} />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => window.location.href = `/database-manager/${credential.id}/monitor`}
                        title="View Monitoring Dashboard"
                      >
                        <Activity className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="outline">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Credential?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the credentials for "{credential.name}".
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCredential(credential.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
