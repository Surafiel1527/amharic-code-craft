import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MySQLCredentialsFormProps {
  onSuccess: () => void;
}

export function MySQLCredentialsForm({ onSuccess }: MySQLCredentialsFormProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState({
    connectionName: "",
    host: "",
    port: "3306",
    database: "",
    username: "",
    password: "",
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          provider: 'mysql',
          credentials,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success!",
          description: "MySQL credentials validated",
        });
        return true;
      } else {
        toast({
          title: "Validation Failed",
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
          provider: 'mysql',
          connectionName: credentials.connectionName,
          credentials,
          testStatus: 'success',
        }
      });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "MySQL credentials saved securely",
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
            <p className="font-semibold">Where to find MySQL credentials:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Your database hosting provider (AWS RDS, Google Cloud SQL, etc.)</li>
              <li>cPanel or hosting control panel</li>
              <li>Local: Usually localhost:3306</li>
              <li>Check your hosting provider's documentation</li>
            </ul>
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
          placeholder="Production MySQL"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="host">Host *</Label>
          <Input
            id="host"
            required
            value={credentials.host}
            onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
            placeholder="localhost or db.example.com"
          />
        </div>

        <div>
          <Label htmlFor="port">Port *</Label>
          <Input
            id="port"
            required
            value={credentials.port}
            onChange={(e) => setCredentials({ ...credentials, port: e.target.value })}
            placeholder="3306"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="database">Database Name *</Label>
        <Input
          id="database"
          required
          value={credentials.database}
          onChange={(e) => setCredentials({ ...credentials, database: e.target.value })}
          placeholder="myapp_db"
        />
      </div>

      <div>
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          required
          value={credentials.username}
          onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
          placeholder="root"
        />
      </div>

      <div>
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          required
          value={credentials.password}
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          placeholder="••••••••"
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