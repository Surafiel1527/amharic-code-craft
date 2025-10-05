import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FirebaseCredentialsForm } from "./database-forms/FirebaseCredentialsForm";
import { MongoDBCredentialsForm } from "./database-forms/MongoDBCredentialsForm";
import { SupabaseCredentialsForm } from "./database-forms/SupabaseCredentialsForm";
import { PostgreSQLCredentialsForm } from "./database-forms/PostgreSQLCredentialsForm";
import { MySQLCredentialsForm } from "./database-forms/MySQLCredentialsForm";
import { SavedCredentialsList } from "./SavedCredentialsList";

export function DatabaseCredentialsManager() {
  const [showNewConnection, setShowNewConnection] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCredentialsSaved = () => {
    setShowNewConnection(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Database Connections
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect your external databases with guided setup
          </p>
        </div>
        <Button onClick={() => setShowNewConnection(!showNewConnection)}>
          <Plus className="h-4 w-4 mr-2" />
          New Connection
        </Button>
      </div>

      {showNewConnection && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Database Connection</CardTitle>
            <CardDescription>
              Choose your database provider and follow the guided setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="firebase" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="firebase">Firebase</TabsTrigger>
                <TabsTrigger value="mongodb">MongoDB</TabsTrigger>
                <TabsTrigger value="supabase">Supabase</TabsTrigger>
                <TabsTrigger value="postgresql">PostgreSQL</TabsTrigger>
                <TabsTrigger value="mysql">MySQL</TabsTrigger>
              </TabsList>

              <TabsContent value="firebase">
                <FirebaseCredentialsForm onSuccess={handleCredentialsSaved} />
              </TabsContent>

              <TabsContent value="mongodb">
                <MongoDBCredentialsForm onSuccess={handleCredentialsSaved} />
              </TabsContent>

              <TabsContent value="supabase">
                <SupabaseCredentialsForm onSuccess={handleCredentialsSaved} />
              </TabsContent>

              <TabsContent value="postgresql">
                <PostgreSQLCredentialsForm onSuccess={handleCredentialsSaved} />
              </TabsContent>

              <TabsContent value="mysql">
                <MySQLCredentialsForm onSuccess={handleCredentialsSaved} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <SavedCredentialsList key={refreshTrigger} />
    </div>
  );
}
