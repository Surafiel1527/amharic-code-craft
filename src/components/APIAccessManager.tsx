import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Copy, Trash2, Activity, Code, BookOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

interface APIKey {
  id: string;
  key_name: string;
  api_key: string;
  usage_count: number;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function APIAccessManager() {
  const { t } = useLanguage();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newRateLimit, setNewRateLimit] = useState(100);
  const { toast } = useToast();

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setApiKeys(data || []);
    }
  };

  const generateAPIKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "lovable_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateAPIKey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login", variant: "destructive" });
      return;
    }

    const newKey = generateAPIKey();

    const { error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_name: newKeyName,
        api_key: newKey,
        rate_limit: newRateLimit
      });

    if (error) {
      toast({ title: "Error creating API key", variant: "destructive" });
    } else {
      toast({ title: "API key created successfully!" });
      setIsCreateDialogOpen(false);
      fetchAPIKeys();
      setNewKeyName("");
      setNewRateLimit(100);
    }
  };

  const handleDeleteKey = async (id: string) => {
    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting API key", variant: "destructive" });
    } else {
      toast({ title: "API key deleted" });
      fetchAPIKeys();
    }
  };

  const handleToggleKey = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating API key", variant: "destructive" });
    } else {
      toast({ title: isActive ? "API key disabled" : "API key enabled" });
      fetchAPIKeys();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("api.title")}</h2>
          <p className="text-muted-foreground">{t("api.subtitle")}</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("api.createAPIKey")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>Generate a new API key for programmatic access</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Key Name (e.g., Production API)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Rate Limit (requests per minute)"
                value={newRateLimit}
                onChange={(e) => setNewRateLimit(parseInt(e.target.value))}
              />
              <Button onClick={handleCreateAPIKey} className="w-full">
                <Key className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">{t("api.tabKeys")}</TabsTrigger>
          <TabsTrigger value="usage">{t("api.tabUsage")}</TabsTrigger>
          <TabsTrigger value="docs">{t("api.tabDocs")}</TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle>{t("api.keysTitle")}</CardTitle>
              <CardDescription>{t("api.keysSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("api.name")}</TableHead>
                    <TableHead>{t("api.apiKey")}</TableHead>
                    <TableHead>{t("api.usage")}</TableHead>
                    <TableHead>{t("api.rateLimit")}</TableHead>
                    <TableHead>{t("api.status")}</TableHead>
                    <TableHead>{t("api.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.key_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {key.api_key.substring(0, 20)}...
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(key.api_key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{key.usage_count}</TableCell>
                      <TableCell>{key.rate_limit}/min</TableCell>
                      <TableCell>
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? t("api.active") : t("api.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleKey(key.id, key.is_active)}
                          >
                            {key.is_active ? t("api.disable") : t("api.enable")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>{t("api.usageTitle")}</CardTitle>
              <CardDescription>{t("api.usageSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("api.totalRequests")}</p>
                        <p className="text-2xl font-bold">
                          {apiKeys.reduce((sum, key) => sum + key.usage_count, 0)}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("api.activeKeys")}</p>
                        <p className="text-2xl font-bold">
                          {apiKeys.filter(k => k.is_active).length}
                        </p>
                      </div>
                      <Key className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("api.rateLimit")}</p>
                        <p className="text-2xl font-bold">
                          {Math.max(...apiKeys.map(k => k.rate_limit), 0)}/min
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>{t("api.docsTitle")}</CardTitle>
              <CardDescription>{t("api.docsSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {t("api.authentication")}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("api.authDescription")}
                </p>
                <Textarea
                  readOnly
                  value={`Authorization: Bearer YOUR_API_KEY`}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  {t("api.exampleRequest")}
                </h3>
                <Textarea
                  readOnly
                  rows={10}
                  value={`curl -X POST https://api.lovable.dev/v1/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Create a modern landing page",
    "style": "minimal",
    "components": ["hero", "features", "cta"]
  }'`}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">{t("api.rateLimitsTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("api.rateLimitsDescription")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}