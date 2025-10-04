import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type DeviceSize = "mobile" | "tablet" | "desktop";

interface DevicePreviewProps {
  generatedCode: string;
}

export function DevicePreview({ generatedCode }: DevicePreviewProps) {
  const { t } = useLanguage();
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  
  const deviceSizes = {
    mobile: { width: "375px", icon: Smartphone, label: t("preview.mobile") },
    tablet: { width: "768px", icon: Tablet, label: t("preview.tablet") },
    desktop: { width: "100%", icon: Monitor, label: t("preview.desktop") },
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => {
          const { icon: Icon, label } = deviceSizes[size];
          return (
            <Button
              key={size}
              variant={deviceSize === size ? "default" : "outline"}
              size="sm"
              onClick={() => setDeviceSize(size)}
              className="gap-2"
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          );
        })}
      </div>

      <div className="relative rounded-lg border border-border bg-background/50 overflow-hidden h-[calc(100vh-450px)] flex items-start justify-center">
        {generatedCode ? (
          <div
            className={cn(
              "h-full transition-all duration-300 ease-in-out",
              deviceSize === "desktop" && "w-full",
              deviceSize === "tablet" && "max-w-[768px] border-x border-border",
              deviceSize === "mobile" && "max-w-[375px] border-x border-border"
            )}
            style={{
              width: deviceSizes[deviceSize].width,
            }}
          >
            <iframe
              srcDoc={generatedCode}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3 p-6">
              <div className="text-5xl opacity-20">🌐</div>
              <p className="text-sm">{t("chat.websiteAppears")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
