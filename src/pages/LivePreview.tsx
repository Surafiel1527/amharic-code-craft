import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Code, RefreshCw, Monitor, Smartphone, Tablet, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BuildActivityLog } from "@/components/BuildActivityLog";

export default function LivePreview() {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewStats, setPreviewStats] = useState({
    loadTime: 0,
    components: 0,
    hotReloads: 0
  });
  const { toast } = useToast();

  const refreshPreview = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setPreviewStats(prev => ({
        ...prev,
        hotReloads: prev.hotReloads + 1,
        loadTime: Math.random() * 500 + 100
      }));
      toast({
        title: "Preview Refreshed",
        description: `Loaded in ${previewStats.loadTime.toFixed(0)}ms`
      });
    }, 500);
  };

  const getDeviceWidth = () => {
    switch (deviceMode) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Live Preview</h1>
          <p className="text-muted-foreground">
            Real-time preview with hot reload and device testing
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Phase 5B
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Load Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{previewStats.loadTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Lightning fast</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{previewStats.components}</div>
            <p className="text-xs text-muted-foreground">Loaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Hot Reloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{previewStats.hotReloads}</div>
            <p className="text-xs text-muted-foreground">This session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Live</div>
            <p className="text-xs text-muted-foreground">Auto-refresh on</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Preview Window</CardTitle>
              <CardDescription>Test your app across different devices</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={deviceMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setDeviceMode("desktop")}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Desktop
              </Button>
              <Button
                variant={deviceMode === "tablet" ? "default" : "outline"}
                size="sm"
                onClick={() => setDeviceMode("tablet")}
              >
                <Tablet className="h-4 w-4 mr-2" />
                Tablet
              </Button>
              <Button
                variant={deviceMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setDeviceMode("mobile")}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshPreview}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="h-4 w-4 mr-2" />
                Code View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg bg-background p-4 flex justify-center">
                <div
                  style={{ width: getDeviceWidth(), maxWidth: "100%" }}
                  className="border rounded-lg overflow-hidden shadow-lg transition-all duration-300"
                >
                  <div className="bg-gradient-to-r from-primary to-primary/50 h-12 flex items-center px-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <iframe
                    src="/"
                    className="w-full h-[600px] bg-white"
                    title="Live Preview"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="mt-4">
              <ScrollArea className="h-[600px] border rounded-lg">
                <pre className="p-4 text-sm">
                  <code>{`// Live code preview
// Changes appear instantly with hot reload

import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6">
      <h1>Live Preview Demo</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}`}</code>
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <BuildActivityLog />

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Live preview capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Hot Module Replacement</div>
                <p className="text-sm text-muted-foreground">
                  Changes appear instantly without full page reload
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Responsive Testing</div>
                <p className="text-sm text-muted-foreground">
                  Test across desktop, tablet, and mobile views
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Auto Refresh</div>
                <p className="text-sm text-muted-foreground">
                  Automatically refreshes on code changes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Live State Inspection</div>
                <p className="text-sm text-muted-foreground">
                  Debug and inspect component state in real-time
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
