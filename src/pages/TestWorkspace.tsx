import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function TestWorkspace() {
  const [testQuery, setTestQuery] = useState("What files are in this workspace?");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runTest = async () => {
    setLoading(true);
    setResponse(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in first",
          variant: "destructive"
        });
        return;
      }

      console.log("🧪 Testing workspace awareness with query:", testQuery);

      // Call mega-mind function
      const { data, error } = await supabase.functions.invoke('mega-mind', {
        body: {
          request: testQuery,
          userId: user.id,
          conversationId: 'test-' + Date.now(),
          projectId: null, // No project context
          awashContext: {
            workspace: {
              totalFiles: 50,
              framework: 'react',
              hasBackend: true,
              hasAuth: true
            }
          }
        }
      });

      if (error) {
        console.error("❌ Error:", error);
        toast({
          title: "Test failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log("✅ Response received:", data);
      setResponse(data);

      toast({
        title: "Test complete",
        description: "Check the response below"
      });

    } catch (err: any) {
      console.error("❌ Test error:", err);
      toast({
        title: "Test failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Workspace Awareness Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Test Query
            </label>
            <Textarea
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Ask about the workspace..."
              rows={3}
            />
          </div>

          <Button 
            onClick={runTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Run Test"}
          </Button>

          {response && (
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">AI Response:</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p>{response.message || response.output}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Raw Response Data:</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>

              {response.analysis && (
                <div>
                  <h3 className="font-semibold mb-2">AI Analysis:</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(response.analysis, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
