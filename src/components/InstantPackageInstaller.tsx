import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Zap, CheckCircle2, XCircle, Download, Copy } from "lucide-react";

interface PackageInfo {
  name: string;
  version: string;
  cdnUrl: string;
  importStatement: string;
  installMethod: 'cdn' | 'npm';
  estimatedSize: string;
}

interface InstallationResult {
  success: boolean;
  packages: PackageInfo[];
  totalPackages: number;
  installationTime: number;
  code: string;
  errors?: string[];
}

export default function InstantPackageInstaller() {
  const [code, setCode] = useState(`import React from 'react';
import axios from 'axios';
import lodash from 'lodash';

function MyComponent() {
  return <div>Hello World</div>;
}`);
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<InstallationResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleInstall = async () => {
    setInstalling(true);
    setProgress(0);
    setResult(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke('intelligent-package-installer', {
        body: { code, projectType: 'react' }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast.success(`Successfully installed ${data.totalPackages} packages in ${data.installationTime}ms!`);
      } else {
        toast.error(`Installation completed with errors`);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Installation error:', error);
      toast.error(error.message || 'Failed to install packages');
    } finally {
      setInstalling(false);
    }
  };

  const copyTransformedCode = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code);
      toast.success('Transformed code copied to clipboard!');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Instant Package Installer</h1>
          <p className="text-muted-foreground">
            Phase 1: Real-time CDN-based package installation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Code Input</CardTitle>
            <CardDescription>
              Paste your code and we'll automatically detect and install all dependencies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="font-mono text-sm min-h-[400px]"
            />
            
            <Button 
              onClick={handleInstall} 
              disabled={installing || !code}
              className="w-full"
              size="lg"
            >
              {installing ? (
                <>
                  <Package className="w-4 h-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Install Packages Instantly
                </>
              )}
            </Button>

            {installing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Detecting and installing packages...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Installation Results</CardTitle>
            <CardDescription>
              {result ? `Installed ${result.totalPackages} packages in ${result.installationTime}ms` : 'No results yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <Badge variant="default" className="bg-green-500">
                        Success
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <Badge variant="destructive">
                        Completed with errors
                      </Badge>
                    </>
                  )}
                </div>

                {/* Installed Packages */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Installed Packages</h3>
                  <ScrollArea className="h-[200px] rounded-md border p-3">
                    <div className="space-y-3">
                      {result.packages.map((pkg, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="font-mono text-sm font-medium truncate">
                                {pkg.name}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              v{pkg.version} • {pkg.estimatedSize} • {pkg.installMethod}
                            </div>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            CDN
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Errors */}
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-red-500">Errors</h3>
                    <ScrollArea className="h-[100px] rounded-md border p-3 bg-red-50 dark:bg-red-950/20">
                      {result.errors.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                          {error}
                        </p>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                {/* Transformed Code */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Transformed Code</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyTransformedCode}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px] rounded-md border">
                    <pre className="p-3 text-xs font-mono">
                      {result.code}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Download className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter code and click "Install Packages Instantly" to begin
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Phase 1 Implementation: CDN-Based Package Installation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">1</span>
                </div>
                <h4 className="font-semibold">Detect Dependencies</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically scans your code for import statements and required packages
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">2</span>
                </div>
                <h4 className="font-semibold">Instant CDN Installation</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Fetches packages from esm.sh CDN - no npm install needed!
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">3</span>
                </div>
                <h4 className="font-semibold">Transform Code</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Rewrites imports to use CDN URLs for instant browser execution
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
