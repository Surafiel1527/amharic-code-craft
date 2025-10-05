import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SupabaseCredentialsFormProps {
  onSuccess: () => void;
}

export function SupabaseCredentialsForm({ onSuccess }: SupabaseCredentialsFormProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState({
    connectionName: "",
    url: "",
    anonKey: "",
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          provider: 'supabase',
          credentials: {
            url: credentials.url,
            anonKey: credentials.anonKey,
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success!",
          description: "Supabase connection test passed",
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
          provider: 'supabase',
          connectionName: credentials.connectionName,
          credentials,
          testStatus: 'success',
        }
      });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Supabase credentials saved securely",
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
            <p className="font-semibold">How to get Supabase credentials:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Supabase Dashboard <ExternalLink className="h-3 w-3" /></a></li>
              <li>Select your project or create a new one</li>
              <li>Go to Settings → API</li>
              <li>Copy "Project URL" and "anon public" key</li>
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
          placeholder="My Supabase Project"
        />
      </div>

      <div>
        <Label htmlFor="url">Project URL *</Label>
        <Input
          id="url"
          required
          value={credentials.url}
          onChange={(e) => setCredentials({ ...credentials, url: e.target.value })}
          placeholder="https://xxxxx.supabase.co"
        />
      </div>

      <div>
        <Label htmlFor="anonKey">Anon/Public Key *</Label>
        <Input
          id="anonKey"
          type="password"
          required
          value={credentials.anonKey}
          onChange={(e) => setCredentials({ ...credentials, anonKey: e.target.value })}
          placeholder="eyJh..."
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