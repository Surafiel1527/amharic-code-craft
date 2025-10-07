import { UniversalChatInterface } from "@/components/UniversalChatInterface";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Code2, Database } from "lucide-react";

export default function OrchestrationTest() {
  const examplePrompts = [
    {
      title: "Contact Form Website",
      prompt: "Create a simple contact form website with HTML, CSS, and JavaScript. It should have fields for name, email, and message, and save the submissions to a database.",
      icon: Sparkles
    },
    {
      title: "Todo List App",
      prompt: "Build a todo list application with HTML, CSS, and JavaScript that allows users to add, complete, and delete tasks. Store tasks in a database with user authentication.",
      icon: Code2
    },
    {
      title: "Newsletter Signup",
      prompt: "Create a newsletter signup page with HTML, CSS, and JavaScript. Store email addresses in a database and show a success message after submission.",
      icon: Database
    }
  ];

  return (
    <div className="container mx-auto p-6 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">🤖 Full-Stack AI Orchestrator Test</h1>
          <p className="text-muted-foreground">
            Test the mega-mind orchestrator by providing a prompt. It will generate both frontend and backend automatically.
          </p>
        </div>

        {/* Example Prompts */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Start Examples</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {examplePrompts.map((example, index) => {
              const Icon = example.icon;
              return (
                <Card key={index} className="p-4 hover:border-primary transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">{example.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{example.prompt}</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder*="Type your message"]') as HTMLInputElement;
                        if (input) {
                          input.value = example.prompt;
                          input.focus();
                        }
                      }}
                    >
                      Use This Prompt
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Chat Interface */}
        <Card className="p-6">
          <UniversalChatInterface
            mode="panel"
            height="h-[600px]"
            showContext={false}
            showHeader={true}
            enableStreaming={true}
            placeholder="Describe the full-stack website you want to build..."
            welcomeMessage={
              <div className="text-center py-8">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
                <p className="text-lg font-semibold mb-2">Ready to build your full-stack website</p>
                <p className="text-sm text-muted-foreground">
                  Describe what you want and the AI will generate both frontend and backend
                </p>
              </div>
            }
          />
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-3">How it works:</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Type or use one of the example prompts above</li>
            <li>2. The orchestrator will analyze your request and detect what backend features are needed</li>
            <li>3. It will generate the frontend code (HTML/CSS/JavaScript)</li>
            <li>4. It will automatically create database tables, RLS policies, and any needed edge functions</li>
            <li>5. The generated files will appear in your project and the database will be updated</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
