import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export const OfflineIndicator = () => {
  const isOnline = useNetworkStatus();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true);
    } else {
      // Hide after 2 seconds when coming back online
      const timer = setTimeout(() => setShowIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showIndicator) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-right">
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className="px-4 py-2 gap-2 shadow-lg animate-fade-in"
      >
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            Back Online
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            You're Offline
          </>
        )}
      </Badge>
    </div>
  );
};