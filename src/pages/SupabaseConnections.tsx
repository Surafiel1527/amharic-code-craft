import { SupabaseConnectionsManager } from "@/components/SupabaseConnectionsManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SupabaseConnections() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Supabase Connections</h1>
            <p className="text-muted-foreground mt-1">
              Connect your Supabase projects to generate full-stack websites
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-2">How it works</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Connect your own Supabase project to have full control over your backend</li>
            <li>• The AI will generate code that connects to YOUR Supabase project</li>
            <li>• You'll have full access to your database, edge functions, and authentication</li>
            <li>• Manage everything directly from your Supabase dashboard</li>
          </ul>
          <div className="mt-4">
            <Button
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
            >
              Go to Supabase Dashboard <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </Card>

        {/* Connections Manager */}
        <SupabaseConnectionsManager />

        {/* Documentation */}
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Need help?</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Where to find your Supabase credentials:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to your Supabase project dashboard</li>
              <li>Click on Settings (gear icon) in the left sidebar</li>
              <li>Go to API section</li>
              <li>Copy the Project URL and anon public key</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
