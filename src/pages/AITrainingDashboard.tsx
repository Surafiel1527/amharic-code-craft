import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Database, TrendingUp, Target, Sparkles } from "lucide-react";

const AITrainingDashboard = () => {
  const [selectedDataset, setSelectedDataset] = useState("");
  const [modelName, setModelName] = useState("");
  const [baseModel, setBaseModel] = useState("google/gemini-2.5-flash");
  const queryClient = useQueryClient();

  // Fetch training datasets
  const { data: datasets } = useQuery({
    queryKey: ['training-datasets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_training_datasets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch model versions
  const { data: models } = useQuery({
    queryKey: ['model-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_versions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch performance metrics
  const { data: metrics } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_performance_metrics')
        .select('*')
        .order('measured_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch A/B tests
  const { data: abTests } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_ab_tests')
        .select('*')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Train model mutation
  const trainModel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('train-ai-model', {
        body: {
          datasetId: selectedDataset,
          modelName,
          baseModel,
          hyperparameters: {
            learning_rate: 0.001,
            batch_size: 32,
            epochs: 10
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Model training started successfully!');
      queryClient.invalidateQueries({ queryKey: ['model-versions'] });
      setSelectedDataset("");
      setModelName("");
    },
    onError: (error: Error) => {
      toast.error(`Training failed: ${error.message}`);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'training': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  placeholder="e.g., My Custom Code Assistant"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataset">Training Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets?.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id}>
                        {dataset.dataset_name} ({dataset.dataset_type}) - {dataset.size_mb}MB
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-model">Base Model</Label>
                <Select value={baseModel} onValueChange={setBaseModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => trainModel.mutate()} 
                disabled={!selectedDataset || !modelName || trainModel.isPending}
                className="w-full"
              >
                {trainModel.isPending ? 'Training...' : 'Start Training'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4">
            {models?.map((model) => (
              <Card key={model.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{model.model_name}</CardTitle>
                    <Badge className={getStatusColor(model.training_status)}>
                      {model.training_status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Version {model.version} • Base: {model.base_model}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {model.training_status === 'training' && (
                    <Progress value={45} className="mb-4" />
                  )}
                  {model.accuracy_score && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Accuracy</p>
                        <p className="text-2xl font-bold">{(model.accuracy_score * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Loss</p>
                        <p className="text-2xl font-bold">{model.loss_value?.toFixed(4)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{metric.metric_type.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Sample size: {metric.sample_size}
                      </p>
                    </div>
                    <div className="text-2xl font-bold">
                      {metric.metric_value.toFixed(3)}
                    </div>
                  </div>
                ))}
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
              {abTests && abTests.length > 0 ? (
                <div className="space-y-4">
                  {abTests.map((test) => (
                    <div key={test.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{test.test_name}</h3>
                        <Badge>{test.status}</Badge>
                      </div>
                      <Progress value={test.traffic_split} className="mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Traffic Split: {test.traffic_split}% / {100 - test.traffic_split}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No A/B tests yet. Train multiple models to start testing!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITrainingDashboard;