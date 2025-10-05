import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FirebaseCredentialsFormProps {
  onSuccess: () => void;
}

export function FirebaseCredentialsForm({ onSuccess }: FirebaseCredentialsFormProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState({
    connectionName: "",
    projectId: "",
    apiKey: "",
    databaseURL: "",
    storageBucket: "",
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          provider: 'firebase',
          credentials: {
            projectId: credentials.projectId,
            apiKey: credentials.apiKey,
            databaseURL: credentials.databaseURL,
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success!",
          description: "Firebase connection test passed",
        });
        return true;
      } else {
        toast({
          title: "Connection Failed",
          description: data.message,
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await testConnection();
    if (!isValid) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-database-credentials', {
        body: {
          provider: 'firebase',
          connectionName: credentials.connectionName,
          credentials,
          testStatus: 'success',
        }
      });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Firebase credentials saved securely",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">How to get Firebase credentials:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="h-3 w-3" /></a></li>
              <li>Select your project or create a new one</li>
              <li>Click the gear icon → Project Settings</li>
              <li>Scroll down to "Your apps" section</li>
              <li>Copy the config values (apiKey, projectId, etc.)</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      <div>
        <Label htmlFor="connectionName">Connection Name *</Label>
        <Input
          id="connectionName"
          required
          value={credentials.connectionName}
          onChange={(e) => setCredentials({ ...credentials, connectionName: e.target.value })}
          placeholder="My Firebase Project"
        />
      </div>

      <div>
        <Label htmlFor="projectId">Project ID *</Label>
        <Input
          id="projectId"
          required
          value={credentials.projectId}
          onChange={(e) => setCredentials({ ...credentials, projectId: e.target.value })}
          placeholder="my-app-12345"
        />
      </div>

      <div>
        <Label htmlFor="apiKey">API Key *</Label>
        <Input
          id="apiKey"
          type="password"
          required
          value={credentials.apiKey}
          onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
          placeholder="AIza..."
        />
      </div>

      <div>
        <Label htmlFor="databaseURL">Database URL *</Label>
        <Input
          id="databaseURL"
          required
          value={credentials.databaseURL}
          onChange={(e) => setCredentials({ ...credentials, databaseURL: e.target.value })}
          placeholder="https://my-app-12345.firebaseio.com"
        />
      </div>

      <div>
        <Label htmlFor="storageBucket">Storage Bucket (Optional)</Label>
        <Input
          id="storageBucket"
          value={credentials.storageBucket}
          onChange={(e) => setCredentials({ ...credentials, storageBucket: e.target.value })}
          placeholder="my-app-12345.appspot.com"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={testConnection} disabled={testing}>
          {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Test Connection
        </Button>
        <Button type="submit" disabled={loading || testing}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Credentials
        </Button>
      </div>
    </form>
  );
}