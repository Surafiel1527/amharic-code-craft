import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MongoDBCredentialsFormProps {
  onSuccess: () => void;
}

export function MongoDBCredentialsForm({ onSuccess }: MongoDBCredentialsFormProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState({
    connectionName: "",
    connectionString: "",
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          provider: 'mongodb',
          credentials: {
            connectionString: credentials.connectionString,
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success!",
          description: "MongoDB connection configured successfully",
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
          provider: 'mongodb',
          connectionName: credentials.connectionName,
          credentials,
          testStatus: 'success',
        }
      });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "MongoDB credentials saved securely",
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
            <p className="font-semibold">How to get MongoDB connection string:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to <a href="https://cloud.mongodb.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">MongoDB Atlas <ExternalLink className="h-3 w-3" /></a></li>
              <li>Select your cluster or create a new one</li>
              <li>Click "Connect" → "Connect your application"</li>
              <li>Copy the connection string</li>
              <li>Replace &lt;password&gt; with your database password</li>
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
          placeholder="My MongoDB Atlas"
        />
      </div>

      <div>
        <Label htmlFor="connectionString">Connection String *</Label>
        <Input
          id="connectionString"
          type="password"
          required
          value={credentials.connectionString}
          onChange={(e) => setCredentials({ ...credentials, connectionString: e.target.value })}
          placeholder="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Make sure to replace &lt;password&gt; with your actual database password
        </p>
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