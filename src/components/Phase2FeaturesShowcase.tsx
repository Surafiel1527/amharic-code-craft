import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, Image as ImageIcon, Wand2, MessageSquare, 
  Sparkles, Code2, TrendingUp, Zap
} from "lucide-react";

export function Phase2FeaturesShowcase() {
  const features = [
    {
      icon: <Brain className="w-5 h-5" />,
      title: "Conversation Memory",
      description: "AI learns from your patterns and preferences across sessions",
      badge: "Smart",
      color: "from-purple-500/10 to-blue-500/10"
    },
    {
      icon: <ImageIcon className="w-5 h-5" />,
      title: "AI Image Generation",
      description: "Generate images with Nano Banana (Gemini 2.5 Flash Image)",
      badge: "Creative",
      color: "from-pink-500/10 to-purple-500/10"
    },
    {
      icon: <Wand2 className="w-5 h-5" />,
      title: "Intelligent Refactoring",
      description: "AI-powered code improvements with visual diffs",
      badge: "Powerful",
      color: "from-blue-500/10 to-cyan-500/10"
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Context-Aware Chat",
      description: "Full conversation history for better AI responses",
      badge: "Contextual",
      color: "from-green-500/10 to-emerald-500/10"
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Pattern Learning",
      description: "Automatically learns successful coding patterns",
      badge: "Adaptive",
      color: "from-yellow-500/10 to-orange-500/10"
    },
    {
      icon: <Code2 className="w-5 h-5" />,
      title: "Code Quality Analysis",
      description: "Deep insights into maintainability and complexity",
      badge: "Analytical",
      color: "from-indigo-500/10 to-purple-500/10"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Cross-Project Insights",
      description: "Learn from patterns across all your projects",
      badge: "Insightful",
      color: "from-teal-500/10 to-green-500/10"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Real-time Suggestions",
      description: "Get instant refactoring suggestions as you code",
      badge: "Fast",
      color: "from-orange-500/10 to-red-500/10"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold mb-2">
          Phase 2: Enhanced AI Intelligence Complete! 🚀
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Advanced AI capabilities that learn, adapt, and enhance your development workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, idx) => (
          <Card 
            key={idx} 
            className={`p-4 hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br ${feature.color}`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="p-2 bg-background rounded-lg">
                  {feature.icon}
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {feature.badge}
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-blue-600">4</div>
            <h4 className="font-semibold text-sm">AI Models</h4>
            <p className="text-xs text-muted-foreground">
              Gemini 2.5 Pro, Flash, Flash Lite, and Image Preview
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-purple-600">∞</div>
            <h4 className="font-semibold text-sm">Learning Capacity</h4>
            <p className="text-xs text-muted-foreground">
              Unlimited pattern storage and cross-project insights
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-green-600">100%</div>
            <h4 className="font-semibold text-sm">Context Aware</h4>
            <p className="text-xs text-muted-foreground">
              Full conversation history for intelligent responses
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <div className="text-center space-y-3">
          <h3 className="text-xl font-semibold">What's Next in Phase 3?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-background rounded-lg">
              <div className="font-medium mb-1">🎨 Framework Support</div>
              <p className="text-xs text-muted-foreground">
                React, Vue, Svelte component generation
              </p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <div className="font-medium mb-1">🔧 Developer Tools</div>
              <p className="text-xs text-muted-foreground">
                Docs, tests, API helpers, deployments
              </p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <div className="font-medium mb-1">⚡ Performance</div>
              <p className="text-xs text-muted-foreground">
                Build optimization and bundling
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
