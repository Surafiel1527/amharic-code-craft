import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, Rocket, Brain, Zap, 
  Code2, Package, Image as ImageIcon, Wand2
} from "lucide-react";

export function PhaseCompletionDashboard() {
  const phases = [
    {
      number: 1,
      title: "Foundation & Multi-File Excellence",
      status: "complete",
      completion: 100,
      features: [
        "Hierarchical file tree with nested folders",
        "Smart search and bulk operations",
        "Auto-save every 3 seconds",
        "Split-pane editor (up to 4 files)",
        "Dependency graph visualization",
        "50+ file templates",
        "Code quality metrics",
        "ZIP export",
        "Syntax highlighting",
        "Auto package.json generation"
      ],
      icon: <Code2 className="w-6 h-6" />,
      color: "from-blue-500 to-cyan-500"
    },
    {
      number: 2,
      title: "Enhanced AI Intelligence",
      status: "complete",
      completion: 100,
      features: [
        "Conversation memory system with analytics",
        "Pro AI image generator (generate + edit)",
        "Style presets and batch generation",
        "Image history with regeneration",
        "Intelligent refactoring with visual diffs",
        "Proactive AI assistant (real-time analysis)",
        "Security vulnerability scanner",
        "Performance optimization hints",
        "Auto-fix for critical issues",
        "Pattern intelligence dashboard",
        "Model performance comparison",
        "Cross-project pattern learning",
        "AI success rate tracking",
        "Usage analytics and insights"
      ],
      icon: <Brain className="w-6 h-6" />,
      color: "from-purple-500 to-pink-500"
    },
    {
      number: 3,
      title: "Framework Support",
      status: "complete",
      completion: 100,
      features: [
        "React component generator with props",
        "TypeScript interface generation",
        "Component props validation",
        "Tailwind CSS utilities builder",
        "Color scheme generator",
        "Spacing & typography scales",
        "Animation presets",
        "State management helpers",
        "Context API generator",
        "Zustand store generator",
        "Custom hooks generator",
        "Framework-specific templates"
      ],
      icon: <Package className="w-6 h-6" />,
      color: "from-green-500 to-emerald-500"
    },
    {
      number: 4,
      title: "Testing, Deployment & Integration",
      status: "complete",
      completion: 100,
      features: [
        "Advanced test generator (Unit/Integration/E2E)",
        "Vitest, Jest, Playwright support",
        "Automatic mock generation",
        "Edge case coverage",
        "CI/CD pipeline builder",
        "GitHub Actions, GitLab CI, CircleCI",
        "API testing suite (Postman-like)",
        "HTTP methods (GET, POST, PUT, DELETE, PATCH)",
        "Deployment manager (Dev/Staging/Prod)",
        "One-click rollback"
      ],
      icon: <Zap className="w-6 h-6" />,
      color: "from-orange-500 to-red-500"
    },
    {
      number: 5,
      title: "Collaboration & Scale",
      status: "pending",
      completion: 0,
      features: [
        "Real-time collaborative editing",
        "Code review system",
        "Team workspaces",
        "Project templates gallery",
        "Version control integration",
        "Usage analytics",
        "Role-based permissions",
        "Performance monitoring"
      ],
      icon: <Rocket className="w-6 h-6" />,
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const stats = {
    totalFeatures: phases.reduce((sum, p) => sum + p.features.length, 0),
    completedFeatures: phases
      .filter(p => p.status === 'complete')
      .reduce((sum, p) => sum + p.features.length, 0),
    phasesCompleted: phases.filter(p => p.status === 'complete').length,
    totalPhases: phases.length
  };

  const overallProgress = (stats.phasesCompleted / stats.totalPhases) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Enterprise Development Platform
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Comprehensive AI-powered development environment with enterprise-grade features
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Platform Progress</h3>
              <p className="text-sm text-muted-foreground">
                {stats.phasesCompleted} of {stats.totalPhases} phases • {stats.completedFeatures} of {stats.totalFeatures} features
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{overallProgress.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>
      </Card>

      {/* Phase Cards */}
      <div className="space-y-4">
        {phases.map((phase) => (
          <Card 
            key={phase.number} 
            className={`p-6 transition-all ${
              phase.status === 'complete' ? 'border-green-500' : 'opacity-75'
            }`}
          >
            <div className="space-y-4">
              {/* Phase Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${phase.color} text-white`}>
                    {phase.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">
                        Phase {phase.number}: {phase.title}
                      </h3>
                      {phase.status === 'complete' ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {phase.features.length} features
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{phase.completion}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <Progress value={phase.completion} className="h-2" />

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {phase.features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                  >
                    {phase.status === 'complete' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />
                    )}
                    <span className={phase.status === 'complete' ? '' : 'text-muted-foreground'}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Next Steps */}
      <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-yellow-500/10">
        <div className="text-center space-y-3">
          <h3 className="text-xl font-bold">Ready for Phase 3? 🎨</h3>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Next up: Framework-specific support with React, Vue, and Svelte component generation,
            intelligent prop validation, and framework-optimized templates
          </p>
          <Button size="lg" className="mt-4">
            <Rocket className="w-4 h-4 mr-2" />
            Start Phase 3
          </Button>
        </div>
      </Card>
    </div>
  );
}
