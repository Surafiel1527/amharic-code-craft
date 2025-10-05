import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VercelDeploymentManager } from "@/components/VercelDeploymentManager";
import { Rocket } from "lucide-react";

const Deploy = () => {
  // Mock project data - in real app, get from router params or context
  const [projectId] = useState("demo-project-id");
  const [projectName] = useState("My Awesome Project");

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-3xl">
            <Rocket className="h-8 w-8" />
            Deploy Your Project
          </CardTitle>
          <CardDescription className="text-lg">
            Deploy your application to production with one click via Vercel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>One-click deployment to Vercel</li>
                <li>Automatic SSL certificates</li>
                <li>Global CDN distribution</li>
                <li>Environment variables management</li>
                <li>Real-time deployment logs</li>
                <li>Deployment history tracking</li>
              </ul>
            </div>

            <VercelDeploymentManager 
              projectId={projectId} 
              projectName={projectName}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Deploy;