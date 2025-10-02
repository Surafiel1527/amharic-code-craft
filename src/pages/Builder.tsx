import { SmartChatBuilder } from "@/components/SmartChatBuilder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AICapabilitiesGuide } from "@/components/AICapabilitiesGuide";

export default function Builder() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-primary" />
                AI Code Builder
              </h1>
              <p className="text-muted-foreground">
                Generate complete applications with AI-powered multi-file generation
              </p>
            </div>
          </div>
          <AICapabilitiesGuide />
        </div>

        {/* Main Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Smart Chat Builder</CardTitle>
            <CardDescription>
              Describe what you want to build, and the AI will generate complete, working code with proper file organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmartChatBuilder />
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🧠 Smart Memory</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>The AI remembers your entire project, even with 40+ functions. It maintains consistency across all changes.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🗂️ Multi-File</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Request complete features and get multiple organized files: components, hooks, types, and utilities.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🛡️ Self-Healing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Errors are automatically detected and fixed. The system learns from every fix to prevent future issues.</p>
            </CardContent>
          </Card>
        </div>

        {/* Example Prompts */}
        <Card>
          <CardHeader>
            <CardTitle>💡 Example Prompts</CardTitle>
            <CardDescription>Try these to see the AI in action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-muted rounded-lg">
              <strong>Authentication System:</strong> "Create a complete auth system with login, signup, password reset components, useAuth hook, auth types, and API utilities"
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong>Dashboard:</strong> "Build a dashboard with sidebar navigation, header, stats cards, and 3 different chart components"
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong>CRUD Feature:</strong> "Generate a todo app with TodoList, TodoItem, TodoForm components, useTodos hook, Todo types, and API functions"
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <strong>Social Features:</strong> "Create a social media feed with Post, Comment, Like components, usePost and useComments hooks, and API integration"
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
