import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Brain, 
  Zap, 
  GitBranch, 
  TrendingUp,
  Settings,
  Network,
  RefreshCw,
  Target
} from "lucide-react";

export const IntelligenceSystemDemo = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Demo 1: User Preferences Learning
  const demoPreferencesLearning = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please login first');
        return;
      }

      const sampleCode = `
function calculateTotal(items) {
  const total = items.reduce((sum, item) => {
    return sum + item.price;
  }, 0);
  return total;
}

const formatPrice = (price) => {
  return \`$\${price.toFixed(2)}\`;
};
      `.trim();

      const { data, error } = await supabase.functions.invoke('self-learning-engine', {
        body: {
          userId: userData.user.id,
          generatedCode: sampleCode,
          userFeedback: { satisfied: true }
        }
      });

      if (error) throw error;

      setResults({
        type: 'preferences',
        data: data.learnedPreferences
      });

      toast.success('Coding preferences learned! ');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo 2: Multi-Project Pattern Learning
  const demoMultiProjectLearning = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please login first');
        return;
      }

      // First, learn from sample code
      const sampleCode = `
const fetchUserData = async (userId) => {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error };
  }
};

const createUser = async (userData) => {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await response.json();
  } catch (error) {
    return { success: false, error };
  }
};
      `.trim();

      await supabase.functions.invoke('unified-learning', {
        body: {
          action: 'learn',
          userId: userData.user.id,
          generatedCode: sampleCode,
          context: 'API calls pattern',
          success: true
        }
      });

      // Then retrieve patterns
      const { data, error } = await supabase.functions.invoke('unified-learning', {
        body: {
          action: 'retrieve',
          userId: userData.user.id,
          minConfidence: 50
        }
      });

      if (error) throw error;

      setResults({
        type: 'patterns',
        data: data
      });

      toast.success(`Learned ${data.patterns.length} reusable patterns!`);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo 3: Iterative Refinement
  const demoIterativeRefinement = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please login first');
        return;
      }

      const messyCode = `
function process(x){var result=0;for(var i=0;i<x.length;i++){for(var j=0;j<x[i].length;j++){result+=x[i][j]}}return result}
const getData=()=>{var data=eval(localStorage.getItem('data'));document.write(data);return data}
      `.trim();

      const { data, error } = await supabase.functions.invoke('iterative-refine', {
        body: {
          generatedCode: messyCode,
          userRequest: 'Process nested array data',
          maxIterations: 3,
          targetQualityScore: 85,
          userId: userData.user.id
        }
      });

      if (error) throw error;

      setResults({
        type: 'refinement',
        data: data
      });

      toast.success(`Code refined through ${data.summary.totalIterations} iterations!`);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo 4: Component Awareness
  const demoComponentAwareness = async () => {
    setLoading(true);
    try {
      const sampleCode = `
import React, { useState } from 'react';
import { Button } from './Button';
import { UserCard } from './UserCard';

function UserList() {
  const [users, setUsers] = useState([]);
  
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
      <Button onClick={() => fetchUsers()}>Load Users</Button>
    </div>
  );
}

function UserCard({ user }) {
  return <div>{user.name}</div>;
}

function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}
      `.trim();

      const { data, error } = await supabase.functions.invoke('component-awareness', {
        body: {
          action: 'analyze',
          conversationId: 'demo-' + Date.now(),
          code: sampleCode
        }
      });

      if (error) throw error;

      setResults({
        type: 'components',
        data: data
      });

      toast.success(`Analyzed ${data.components.length} components!`);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <CardTitle>Advanced Intelligence System</CardTitle>
        </div>
        <CardDescription>
          Test the enhanced context memory and smarter code generation features
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="preferences" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preferences">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="patterns">
              <GitBranch className="w-4 h-4 mr-2" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="refinement">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refinement
            </TabsTrigger>
            <TabsTrigger value="components">
              <Network className="w-4 h-4 mr-2" />
              Components
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: User Preferences */}
          <TabsContent value="preferences" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Automatic Coding Style Learning</h3>
              <p className="text-sm text-muted-foreground">
                The system analyzes your generated code to learn your preferred coding style,
                naming conventions, and patterns. Future generations will automatically follow
                your style.
              </p>
            </div>

            <Button onClick={demoPreferencesLearning} disabled={loading} className="w-full">
              <Zap className="w-4 h-4 mr-2" />
              Learn My Preferences
            </Button>

            {results?.type === 'preferences' && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold">Learned Preferences:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Style:</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(results.data.style).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="mr-1">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Patterns:</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(results.data.patterns).map(([key, value]) => (
                        value && (
                          <Badge key={key} variant="secondary" className="mr-1">
                            {key}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                </div>
                <Badge className="mt-2">{results.data.confidence} confidence</Badge>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Multi-Project Patterns */}
          <TabsContent value="patterns" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Cross-Project Pattern Learning</h3>
              <p className="text-sm text-muted-foreground">
                The system learns reusable patterns from all your projects and intelligently
                applies them in new projects. Build faster by reusing what works.
              </p>
            </div>

            <Button onClick={demoMultiProjectLearning} disabled={loading} className="w-full">
              <GitBranch className="w-4 h-4 mr-2" />
              Learn & Retrieve Patterns
            </Button>

            {results?.type === 'patterns' && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Learned Patterns</h4>
                  <Badge>{results.data.patterns.length} patterns</Badge>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.data.patterns.slice(0, 5).map((pattern: any, idx: number) => (
                    <div key={idx} className="p-3 bg-background rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{pattern.pattern_name}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {pattern.pattern_type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Used {pattern.usage_count}x
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Progress value={pattern.success_rate} className="w-20 h-2" />
                        <span>{pattern.success_rate.toFixed(0)}% success</span>
                        <Badge className="text-xs">{pattern.confidence_score} confidence</Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {results.data.summary.byType && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {Object.entries(results.data.summary.byType).map(([type, count]) => (
                      <Badge key={type} variant="outline">
                        {type}: {String(count)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Iterative Refinement */}
          <TabsContent value="refinement" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Automatic Code Refinement</h3>
              <p className="text-sm text-muted-foreground">
                The system analyzes generated code quality and automatically refines it
                through multiple iterations until it reaches production-ready standards.
              </p>
            </div>

            <Button onClick={demoIterativeRefinement} disabled={loading} className="w-full">
              <TrendingUp className="w-4 h-4 mr-2" />
              Refine Code Quality
            </Button>

            {results?.type === 'refinement' && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Refinement Results</h4>
                  <Badge variant={results.data.summary.improvement > 0 ? 'default' : 'secondary'}>
                    +{results.data.summary.improvement} points
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Initial Score</span>
                    <div className="text-2xl font-bold">{results.data.summary.initialScore}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Final Score</span>
                    <div className="text-2xl font-bold text-green-600">
                      {results.data.summary.finalScore}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground block mb-2">
                    Iterations: {results.data.summary.totalIterations}
                  </span>
                  {results.data.iterations.map((iter: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">#{iter.iteration}</Badge>
                      <Progress value={(iter.qualityAfter / 100) * 100} className="flex-1 h-2" />
                      <span className="text-xs">{iter.qualityAfter}/100</span>
                    </div>
                  ))}
                </div>

                {results.data.finalAnalysis.issues.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Remaining Issues:</span>
                    <div className="mt-1 space-y-1">
                      {results.data.finalAnalysis.issues.map((issue: string, idx: number) => (
                        <div key={idx} className="text-xs text-yellow-600">• {issue}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Component Awareness */}
          <TabsContent value="components" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Intelligent Component Mapping</h3>
              <p className="text-sm text-muted-foreground">
                The system maps all component dependencies and relationships, enabling
                smart impact analysis before making changes.
              </p>
            </div>

            <Button onClick={demoComponentAwareness} disabled={loading} className="w-full">
              <Network className="w-4 h-4 mr-2" />
              Analyze Components
            </Button>

            {results?.type === 'components' && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Component Analysis</h4>
                  <Badge>{results.data.components.length} components</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-background rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {results.data.summary.byCriticality.high}
                    </div>
                    <div className="text-xs text-muted-foreground">High Critical</div>
                  </div>
                  <div className="text-center p-2 bg-background rounded">
                    <div className="text-2xl font-bold text-yellow-600">
                      {results.data.summary.byCriticality.medium}
                    </div>
                    <div className="text-xs text-muted-foreground">Medium</div>
                  </div>
                  <div className="text-center p-2 bg-background rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {results.data.summary.byCriticality.low}
                    </div>
                    <div className="text-xs text-muted-foreground">Low</div>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {results.data.components.map((comp: any, idx: number) => (
                    <div key={idx} className="p-2 bg-background rounded border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{comp.name}</span>
                        <div className="flex gap-1">
                          <Badge 
                            variant={comp.criticality === 'high' ? 'destructive' : 
                                   comp.criticality === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {comp.criticality}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            complexity: {comp.complexityScore}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Depends on: {comp.dependsOn.length > 0 ? comp.dependsOn.join(', ') : 'none'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t text-sm">
                  <span className="text-muted-foreground">Average Complexity:</span>{' '}
                  <span className="font-semibold">
                    {results.data.summary.avgComplexity.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};