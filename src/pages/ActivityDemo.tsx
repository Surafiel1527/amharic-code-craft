import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildActivityLog } from "@/components/BuildActivityLog";
import { buildEvents } from "@/lib/buildEventEmitter";
import { useToast } from "@/hooks/use-toast";
import { Package, FileCode, Database, Shield, Zap, Rocket } from "lucide-react";

export default function ActivityDemo() {
  const { toast } = useToast();

  const simulateEvents = async () => {
    toast({
      title: "Simulating Activity",
      description: "Watch the activity log below!",
    });

    // Simulate a sequence of build events
    await buildEvents.fileCreated("src/App.tsx", { language: "typescript", lines: 150 });
    
    setTimeout(() => {
      buildEvents.packageInstalled("react-query", "^5.0.0");
    }, 1000);

    setTimeout(() => {
      buildEvents.databaseReady(["users", "posts", "comments"]);
    }, 2000);

    setTimeout(() => {
      buildEvents.authSetup();
    }, 3000);

    setTimeout(() => {
      buildEvents.functionDeployed("user-authentication");
    }, 4000);

    setTimeout(() => {
      buildEvents.buildComplete(2345);
    }, 5000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Build Activity Demo</h1>
        <p className="text-muted-foreground">
          Replit-style activity logging with motivational messages
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Simulate Build Events</CardTitle>
            <CardDescription>
              Click buttons to see how different activities appear in the log
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => buildEvents.fileCreated("components/Header.tsx")}
              className="w-full justify-start"
              variant="outline"
            >
              <FileCode className="h-4 w-4 mr-2" />
              Create File
            </Button>

            <Button 
              onClick={() => buildEvents.packageInstalled("axios", "^1.6.0")}
              className="w-full justify-start"
              variant="outline"
            >
              <Package className="h-4 w-4 mr-2" />
              Install Package
            </Button>

            <Button 
              onClick={() => buildEvents.databaseReady(["products", "orders"])}
              className="w-full justify-start"
              variant="outline"
            >
              <Database className="h-4 w-4 mr-2" />
              Setup Database
            </Button>

            <Button 
              onClick={() => buildEvents.authSetup()}
              className="w-full justify-start"
              variant="outline"
            >
              <Shield className="h-4 w-4 mr-2" />
              Configure Auth
            </Button>

            <Button 
              onClick={() => buildEvents.functionDeployed("send-email")}
              className="w-full justify-start"
              variant="outline"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Deploy Function
            </Button>

            <Button 
              onClick={() => buildEvents.buildComplete(1234)}
              className="w-full justify-start"
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              Complete Build
            </Button>

            <div className="pt-4 border-t">
              <Button 
                onClick={simulateEvents}
                className="w-full"
                size="lg"
              >
                Run Full Simulation
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <BuildActivityLog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Understanding the activity logging system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">📊 Real-Time Updates</h3>
              <p className="text-sm text-muted-foreground">
                Events are stored in the database and broadcast via real-time subscriptions. 
                Every user sees their own activity instantly.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">✨ Motivational Messages</h3>
              <p className="text-sm text-muted-foreground">
                Each successful event comes with a randomized motivational message like 
                "Good news! Authentication complete" or "Package installed! Your project is getting more powerful 💪"
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">🎨 Visual Indicators</h3>
              <p className="text-sm text-muted-foreground">
                Different event types have unique icons and colors. Running events show spinners, 
                failed events are highlighted in red, and successful ones show green checkmarks.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">🔍 Expandable Details</h3>
              <p className="text-sm text-muted-foreground">
                Click the chevron to expand events and see detailed information like package versions, 
                file sizes, deployment URLs, and more.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">🔗 Integration Points</h3>
              <p className="text-sm text-muted-foreground">
                This system integrates with package manager, file operations, edge functions deployment, 
                database migrations, and build processes across the platform.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}