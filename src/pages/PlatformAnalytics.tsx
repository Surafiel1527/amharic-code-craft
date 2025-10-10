/**
 * Platform Analytics Page
 * User-facing analytics dashboard
 */

import { PlatformStorageAnalytics } from "@/components/PlatformStorageAnalytics";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PlatformAnalytics = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <PlatformStorageAnalytics />
      </div>
    </div>
  );
};

export default PlatformAnalytics;
