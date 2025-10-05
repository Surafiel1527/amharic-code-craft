import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface DetectedDependency {
  name: string;
  category: string;
  installCommand: string;
  status: 'detected' | 'installing' | 'installed' | 'failed';
  reason?: string;
}

interface IntelligentPackageManagerProps {
  code: string;
  projectType?: string;
  autoInstall?: boolean;
  onPackagesInstalled?: (packages: string[]) => void;
}

export const IntelligentPackageManager = ({ 
  code, 
  projectType = 'react',
  autoInstall = true,
  onPackagesInstalled 
}: IntelligentPackageManagerProps) => {
  const [dependencies, setDependencies] = useState<DetectedDependency[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const detectDependencies = async () => {
    if (!code || code.trim().length === 0) return;

    setIsScanning(true);
    setProgress(10);

    try {
      const { data, error } = await supabase.functions.invoke('smart-dependency-detector', {
        body: { 
          code,
          language: 'javascript',
          appType: projectType 
        }
      });

      setProgress(50);

      if (error) throw error;

      const detected = data.dependencies || [];
      setDependencies(detected.map((dep: any) => ({
        name: dep.name,
        category: dep.category,
        installCommand: dep.installCommand,
        status: 'detected' as const,
        reason: dep.reason
      })));

      setProgress(75);

      // Auto-install if enabled
      if (autoInstall && detected.length > 0) {
        await installAllPackages(detected);
      }

      setProgress(100);
    } catch (error) {
      console.error('Dependency detection failed:', error);
      toast({
        title: "Detection Failed",
        description: error instanceof Error ? error.message : "Failed to detect dependencies",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const installAllPackages = async (packages: any[]) => {
    const installedPackages: string[] = [];

    for (const pkg of packages) {
      await installPackage(pkg, installedPackages);
    }

    if (installedPackages.length > 0 && onPackagesInstalled) {
      onPackagesInstalled(installedPackages);
    }
  };

  const installPackage = async (pkg: any, installedList: string[]) => {
    setDependencies(prev => 
      prev.map(d => d.name === pkg.name ? { ...d, status: 'installing' } : d)
    );

    try {
      const { data, error } = await supabase.functions.invoke('auto-install-dependency', {
        body: {
          packageName: pkg.name,
          autoInstall: true,
          projectContext: { type: projectType }
        }
      });

      if (error) throw error;

      if (data.success && data.shouldInstall) {
        setDependencies(prev => 
          prev.map(d => d.name === pkg.name ? { ...d, status: 'installed' } : d)
        );
        installedList.push(pkg.name);
        
        toast({
          title: "Package Installed",
          description: `${pkg.name} installed successfully`,
        });
      } else {
        setDependencies(prev => 
          prev.map(d => d.name === pkg.name ? { 
            ...d, 
            status: 'failed',
            reason: data.reason 
          } : d)
        );
      }
    } catch (error) {
      console.error(`Failed to install ${pkg.name}:`, error);
      setDependencies(prev => 
        prev.map(d => d.name === pkg.name ? { ...d, status: 'failed' } : d)
      );
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (code && code.length > 50) {
        detectDependencies();
      }
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [code]);

  if (dependencies.length === 0 && !isScanning) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-primary" />
          Intelligent Package Manager
          {isScanning && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress < 50 ? 'Scanning code...' : progress < 75 ? 'Analyzing dependencies...' : 'Installing packages...'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {dependencies.map((dep) => (
            <div 
              key={dep.name}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {dep.status === 'installing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {dep.status === 'installed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {dep.status === 'failed' && <AlertCircle className="h-4 w-4 text-destructive" />}
                {dep.status === 'detected' && <Download className="h-4 w-4 text-muted-foreground" />}
                
                <div>
                  <p className="font-medium">{dep.name}</p>
                  <p className="text-xs text-muted-foreground">{dep.category}</p>
                  {dep.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{dep.reason}</p>
                  )}
                </div>
              </div>

              <Badge variant={
                dep.status === 'installed' ? 'default' :
                dep.status === 'installing' ? 'secondary' :
                dep.status === 'failed' ? 'destructive' :
                'outline'
              }>
                {dep.status}
              </Badge>
            </div>
          ))}
        </div>

        {!autoInstall && dependencies.some(d => d.status === 'detected') && (
          <Button 
            onClick={() => installAllPackages(dependencies.filter(d => d.status === 'detected'))}
            className="w-full"
          >
            Install All Packages
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
