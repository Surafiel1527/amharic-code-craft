import { useState } from 'react';
import { SavedCredentialsList } from './SavedCredentialsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'other';

interface DatabaseCredentials {
  type: DatabaseType;
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  name: string;
}

export const DatabaseCredentialsManager = () => {
  const [credentials, setCredentials] = useState<DatabaseCredentials>({
    type: 'postgresql',
    host: '',
    port: '5432',
    username: '',
    password: '',
    database: '',
    name: 'My Database'
  });
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const defaultPorts: Record<DatabaseType, string> = {
    postgresql: '5432',
    mysql: '3306',
    mongodb: '27017',
    redis: '6379',
    other: ''
  };

  const handleTypeChange = (type: DatabaseType) => {
    setCredentials(prev => ({
      ...prev,
      type,
      port: defaultPorts[type]
    }));
  };

  const testConnection = async () => {
    setTestStatus('testing');
    
    try {
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          type: credentials.type,
          host: credentials.host,
          port: parseInt(credentials.port),
          username: credentials.username,
          password: credentials.password,
          database: credentials.database
        }
      });

      if (error) throw error;

      if (data.success) {
        setTestStatus('success');
        toast.success('✅ Connection successful!');
      } else {
        setTestStatus('error');
        toast.error('❌ Connection failed: ' + data.error);
      }
    } catch (error: any) {
      setTestStatus('error');
      toast.error('Connection test failed: ' + error.message);
    }
  };

  const saveCredentials = async () => {
    if (!credentials.host || !credentials.username || !credentials.password || !credentials.database) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('save-database-credentials', {
        body: {
          name: credentials.name,
          type: credentials.type,
          host: credentials.host,
          port: parseInt(credentials.port),
          username: credentials.username,
          password: credentials.password,
          database: credentials.database
        }
      });

      if (error) throw error;

      toast.success('🔒 Database credentials saved securely!');
      
      // Clear sensitive fields
      setCredentials({
        ...credentials,
        password: '',
        username: '',
        host: '',
        database: ''
      });
    } catch (error: any) {
      toast.error('Failed to save credentials: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <CardTitle>Database Credentials Manager</CardTitle>
        </div>
        <CardDescription>
          Securely store your database connection credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>🔒 Security Note:</strong> Your credentials are encrypted and stored as secure secrets. 
            They are never exposed in your codebase and can only be accessed by your backend functions.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              value={credentials.name}
              onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
              placeholder="e.g., Production Database"
            />
          </div>

          <div>
            <Label htmlFor="type">Database Type</Label>
            <Select value={credentials.type} onValueChange={(v: DatabaseType) => handleTypeChange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="mongodb">MongoDB</SelectItem>
                <SelectItem value="redis">Redis</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                value={credentials.host}
                onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
                placeholder="localhost or db.example.com"
              />
            </div>

            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                value={credentials.port}
                onChange={(e) => setCredentials({ ...credentials, port: e.target.value })}
                placeholder="5432"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="database">Database Name</Label>
            <Input
              id="database"
              value={credentials.database}
              onChange={(e) => setCredentials({ ...credentials, database: e.target.value })}
              placeholder="myapp_production"
            />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="db_user"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              variant="outline"
              disabled={testStatus === 'testing'}
              className="flex-1"
            >
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4 mr-2 text-red-500" />}
              Test Connection
            </Button>

            <Button
              onClick={saveCredentials}
              disabled={loading || testStatus !== 'success'}
              className="flex-1"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Credentials
            </Button>
          </div>
        </div>

        {/* Saved Credentials List */}
        <div className="mt-6">
          <SavedCredentialsList />
        </div>
      </CardContent>
    </Card>
  );
};
