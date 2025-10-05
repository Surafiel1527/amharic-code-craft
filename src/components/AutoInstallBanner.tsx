import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Download, Loader2, X } from "lucide-react";
import { useState } from "react";

interface AutoInstallBannerProps {
  missingPackages: Array<{ name: string; detectedIn: string; suggested: boolean }>;
  isInstalling: boolean;
  onInstallAll: () => void;
  onInstallOne: (packageName: string) => void;
  onDismiss: () => void;
}

export function AutoInstallBanner({
  missingPackages,
  isInstalling,
  onInstallAll,
  onInstallOne,
  onDismiss
}: AutoInstallBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || missingPackages.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Package className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTitle className="mb-0">Missing Dependencies Detected</AlertTitle>
              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                {missingPackages.length}
              </Badge>
            </div>
            <AlertDescription>
              <div className="space-y-2">
                <p className="text-sm">
                  Auto-detected {missingPackages.length} missing package(s) from your code:
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingPackages.slice(0, 5).map((pkg) => (
                    <Badge
                      key={pkg.name}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-primary/20"
                      onClick={() => onInstallOne(pkg.name)}
                    >
                      {pkg.name}
                      {pkg.suggested && <span className="text-xs">✨</span>}
                    </Badge>
                  ))}
                  {missingPackages.length > 5 && (
                    <Badge variant="outline">
                      +{missingPackages.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </AlertDescription>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={onInstallAll}
                disabled={isInstalling}
                className="gap-2"
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Install All ({missingPackages.length})
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                disabled={isInstalling}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
