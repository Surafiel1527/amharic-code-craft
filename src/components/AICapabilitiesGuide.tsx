import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Image as ImageIcon, Code2, Lightbulb, Brain, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const AICapabilitiesGuide = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const capabilities = [
    {
      icon: <ImageIcon className="h-5 w-5" />,
      title: "Image Generation",
      description: "Create logos, mockups, and design assets",
      example: '"Generate a modern hero image for my website"',
      color: "text-pink-500"
    },
    {
      icon: <Code2 className="h-5 w-5" />,
      title: "Code Analysis",
      description: "Deep code review with quality scoring",
      example: '"Analyze my code for performance issues"',
      color: "text-blue-500"
    },
    {
      icon: <Lightbulb className="h-5 w-5" />,
      title: "Smart Suggestions",
      description: "Structured improvement recommendations",
      example: '"Suggest ways to improve my site\'s accessibility"',
      color: "text-yellow-500"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Context Memory",
      description: "Remembers full conversation history",
      example: "Ask follow-up questions naturally",
      color: "text-purple-500"
    },
    {
      icon: <Languages className="h-5 w-5" />,
      title: "Multilingual",
      description: "Seamless English & Amharic support",
      example: "ጥያቄዎን በማንኛውም ቋንቋ ያቅርቡ",
      color: "text-green-500"
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Proactive AI",
      description: "Anticipates needs and suggests solutions",
      example: "Get recommendations before you ask",
      color: "text-orange-500"
    }
  ];

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        variant="outline"
        className="w-full gap-2 border-primary/20 hover:border-primary/40"
      >
        <Sparkles className="h-4 w-4" />
        Discover AI Capabilities
      </Button>
    );
  }

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Advanced AI Capabilities
            </CardTitle>
            <CardDescription>
              Powered by Google Gemini 2.5 Pro
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsExpanded(false)}
            variant="ghost"
            size="sm"
          >
            Hide
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capabilities.map((capability, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-primary/10 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`${capability.color}`}>
                  {capability.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">
                    {capability.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {capability.description}
                  </p>
                  <div className="bg-muted/50 rounded px-2 py-1 text-xs italic">
                    {capability.example}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-xs text-muted-foreground">
            <strong>💡 Pro Tip:</strong> The AI autonomously uses these tools when needed. 
            Just ask naturally and watch the magic happen! Try asking to generate an image 
            or analyze some code to see it in action.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
