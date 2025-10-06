import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Search, Zap, Download, CheckCircle, AlertTriangle, Trash2, RefreshCw, Shield } from "lucide-react";
import { PackageSecurityDashboard } from "@/components/PackageSecurityDashboard";
import { PackageUpdateManager } from "@/components/PackageUpdateManager";
import { PackageAutomationDashboard } from "@/components/PackageAutomationDashboard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAutoInstall } from "@/hooks/useAutoInstall";
import { AutoInstallBanner } from "@/components/AutoInstallBanner";

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  status: "installed" | "available" | "installing";
  size?: string;
  lastUpdated?: string;
}

export default function PackageManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sampleCode, setSampleCode] = useState(`import React from 'react';
import axios from 'axios';
import lodash from 'lodash';
import moment from 'moment';

// Sample code to trigger auto-detection
`);
  const [packages, setPackages] = useState<PackageInfo[]>([
    {
      name: "react",
      version: "18.3.1",
      description: "A JavaScript library for building user interfaces",
      status: "installed",
      size: "452 KB",
      lastUpdated: "2 days ago"
    },
    {
      name: "typescript",
      version: "5.3.3",
      description: "TypeScript is a language for application-scale JavaScript",
      status: "installed",
      size: "12.1 MB",
      lastUpdated: "1 week ago"
    },
    {
      name: "tailwindcss",
      version: "3.4.0",
      description: "A utility-first CSS framework",
      status: "installed",
      size: "3.5 MB",
      lastUpdated: "3 days ago"
    }
  ]);
  const { toast } = useToast();

  // Auto-install hook
  const {
    missingPackages,
    isScanning,
    isInstalling,
    autoInstallAll,
    installPackage: autoInstallPackage
  } = useAutoInstall(sampleCode, true);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('real-package-installer', {
        body: {
          packageName: searchQuery,
          action: 'search'
        }
      });

      if (error) throw error;

      // Add search results to packages list
      const searchResults: PackageInfo[] = data.results.slice(0, 10).map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        status: "available" as const,
        lastUpdated: new Date(pkg.date).toLocaleDateString()
      }));

      setPackages(prev => [...prev.filter(p => p.status === 'installed'), ...searchResults]);
      
      toast({
        title: "Search Complete",
        description: `Found ${data.total} packages matching "${searchQuery}"`
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Could not search packages",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const installPackage = async (packageName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('real-package-installer', {
        body: {
          packageName,
          action: 'install'
        }
      });

      if (error) throw error;

      toast({
        title: "Package Installed",
        description: `${packageName}@${data.package.version} installed successfully`
      });

      // Update package status
      setPackages(prev => prev.map(pkg =>
        pkg.name === packageName ? { 
          ...pkg, 
          status: "installed" as const,
          version: data.package.version,
          size: `${(data.package.size / 1024).toFixed(1)} KB`
        } : pkg
      ));
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: `Could not install ${packageName}`,
        variant: "destructive"
      });
    }
  };

  const uninstallPackage = async (packageName: string) => {
    try {
      const { error } = await supabase.functions.invoke('real-package-installer', {
        body: {
          packageName,
          action: 'uninstall'
        }
      });

      if (error) throw error;
      
      toast({
        title: "Package Uninstalled",
        description: `${packageName} removed successfully`
      });

      setPackages(prev => prev.filter(pkg => pkg.name !== packageName));
    } catch (error) {
      toast({
        title: "Uninstall Failed",
        description: `Could not remove ${packageName}`,
        variant: "destructive"
      });
    }
  };

  const installedPackages = packages.filter(p => p.status === "installed");
  const availablePackages = packages.filter(p => p.status === "available");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Package Manager</h1>
          <p className="text-muted-foreground">
            Lightning-fast package installation and management
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Phase 5B
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Auto-Detection Demo</CardTitle>
          <CardDescription>
            Paste code with imports to auto-detect missing packages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full h-32 p-3 rounded-md border bg-background font-mono text-sm"
            value={sampleCode}
            onChange={(e) => setSampleCode(e.target.value)}
            placeholder="Paste code with imports here..."
          />
          {isScanning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Scanning for missing packages...
            </div>
          )}
          <AutoInstallBanner
            missingPackages={missingPackages}
            isInstalling={isInstalling}
            onInstallAll={autoInstallAll}
            onInstallOne={autoInstallPackage}
            onDismiss={() => {}}
          />
        </CardContent>
      </Card>

      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Installed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{installedPackages.length}</div>
            <p className="text-xs text-muted-foreground">Active packages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16.0 MB</div>
            <p className="text-xs text-muted-foreground">Node modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Install Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3s</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Packages</CardTitle>
          <CardDescription>Find and install npm packages instantly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search npm registry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Packages</CardTitle>
          <CardDescription>Manage your project dependencies</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="installed">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="automation">
                🤖 Automation
              </TabsTrigger>
              <TabsTrigger value="installed">
                Installed ({installedPackages.length})
              </TabsTrigger>
              <TabsTrigger value="available">
                Available ({availablePackages.length})
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="updates">
                Updates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="automation" className="space-y-4">
              <PackageAutomationDashboard />
            </TabsContent>

            <TabsContent value="installed" className="space-y-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {installedPackages.map((pkg) => (
                    <Card key={pkg.name}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold">{pkg.name}</div>
                                <Badge variant="outline">{pkg.version}</Badge>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {pkg.description}
                              </p>
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{pkg.size}</span>
                                <span>Updated {pkg.lastUpdated}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => uninstallPackage(pkg.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="available" className="space-y-4">
              <div className="text-center py-12 text-muted-foreground">
                Search for packages to see available options
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <PackageSecurityDashboard />
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              <PackageUpdateManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Fast package manager capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Lightning Fast</div>
                <p className="text-sm text-muted-foreground">
                  Parallel downloads and intelligent caching for speed
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Smart Detection</div>
                <p className="text-sm text-muted-foreground">
                  Automatically detects missing dependencies
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Version Management</div>
                <p className="text-sm text-muted-foreground">
                  Handle conflicts and update dependencies safely
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Security Scanning</div>
                <p className="text-sm text-muted-foreground">
                  Checks for vulnerabilities before installation
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
