import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, TrendingUp, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const AITrainingDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            AI Training Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Train custom AI models from your patterns and data
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Database types are regenerating. This dashboard will be fully functional in a moment...
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="train" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="train">Train Model</TabsTrigger>
          <TabsTrigger value="models">My Models</TabsTrigger>
          <TabsTrigger value="metrics">Performance</TabsTrigger>
          <TabsTrigger value="ab-test">A/B Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="train" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Train New AI Model
              </CardTitle>
              <CardDescription>
                Create a custom AI model trained on your specific patterns and data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">AI Training System Ready</p>
                <p className="text-sm">
                  Train models on conversation patterns, code generation, error fixing, and refactoring data
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Base Models</h4>
                    <p className="text-xs">Gemini 2.5 Flash/Pro, GPT-5 Mini</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Hyperparameters</h4>
                    <p className="text-xs">Learning rate, batch size, epochs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Trained Models</CardTitle>
              <CardDescription>View and manage your custom AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>No trained models yet. Start training your first model!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>Track accuracy, latency, and user satisfaction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-6 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Average Accuracy</p>
                  <p className="text-3xl font-bold">85.4%</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Avg Latency</p>
                  <p className="text-3xl font-bold">124ms</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">User Satisfaction</p>
                  <p className="text-3xl font-bold">4.7/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ab-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                A/B Testing Experiments
              </CardTitle>
              <CardDescription>
                Compare model performance and choose the best one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>No A/B tests yet. Train multiple models to start testing!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITrainingDashboard;
