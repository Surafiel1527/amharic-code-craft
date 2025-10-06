import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

interface MissingPackage {
  name: string;
  detectedIn: string;
  suggested: boolean;
}

export function useAutoInstall(code: string, enabled: boolean = true) {
  const [missingPackages, setMissingPackages] = useState<MissingPackage[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (!enabled || !code) return;

    const detectMissingPackages = async () => {
      setIsScanning(true);
      try {
        // Extract import statements
        const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        
        const imports = new Set<string>();
        let match;

        while ((match = importRegex.exec(code)) !== null) {
          const pkg = match[1];
          if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
            const pkgName = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
            imports.add(pkgName);
          }
        }

        while ((match = requireRegex.exec(code)) !== null) {
          const pkg = match[1];
          if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
            const pkgName = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
            imports.add(pkgName);
          }
        }

        if (imports.size === 0) {
          setMissingPackages([]);
          return;
        }

        // Check which packages are missing
        const { data, error } = await supabase.functions.invoke('smart-dependency-detector', {
          body: {
            imports: Array.from(imports),
            code
          }
        });

        if (error) throw error;

        const missing: MissingPackage[] = (data.missing || []).map((pkg: any) => ({
          name: pkg.name,
          detectedIn: pkg.detectedIn || 'code',
          suggested: pkg.suggested || false
        }));

        setMissingPackages(missing);

        if (missing.length > 0) {
          toast.info(`Found ${missing.length} missing package(s)`, {
            description: "Click to auto-install",
            action: {
              label: "Install All",
              onClick: () => autoInstallAll(missing)
          }
        });
        }
      } catch (error) {
        logger.error('Error detecting packages', error);
      } finally {
        setIsScanning(false);
      }
    };

    const debounceTimer = setTimeout(detectMissingPackages, 1000);
    return () => clearTimeout(debounceTimer);
  }, [code, enabled]);

  const autoInstallAll = async (packages: MissingPackage[]) => {
    setIsInstalling(true);
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    try {
      for (const pkg of packages) {
        try {
          const { error } = await supabase.functions.invoke('real-package-installer', {
            body: {
              packageName: pkg.name,
              action: 'install',
              autoDetected: true
            }
          });

          if (error) throw error;
          results.success.push(pkg.name);
        } catch (error) {
          logger.error(`Failed to install ${pkg.name}`, error);
          results.failed.push(pkg.name);
        }
      }

      if (results.success.length > 0) {
        toast.success(`Auto-installed ${results.success.length} package(s)`, {
          description: results.success.join(', ')
        });
      }

      if (results.failed.length > 0) {
        toast.error(`Failed to install ${results.failed.length} package(s)`, {
          description: results.failed.join(', ')
        });
      }

      setMissingPackages([]);
    } catch (error) {
      logger.error('Auto-install error', error);
      toast.error("Failed to auto-install packages");
    } finally {
      setIsInstalling(false);
    }
  };

  const installPackage = async (packageName: string) => {
    setIsInstalling(true);
    try {
      const { error } = await supabase.functions.invoke('real-package-installer', {
        body: {
          packageName,
          action: 'install',
          autoDetected: true
        }
      });

      if (error) throw error;

      toast.success(`Installed ${packageName}`);
      setMissingPackages(prev => prev.filter(p => p.name !== packageName));
    } catch (error) {
      toast.error(`Failed to install ${packageName}`);
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    missingPackages,
    isScanning,
    isInstalling,
    autoInstallAll: () => autoInstallAll(missingPackages),
    installPackage
  };
}
