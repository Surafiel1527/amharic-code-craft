import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileCode2, FolderTree, Search, Save, GitBranch, 
  FileStack, Layout, BarChart3, Package, Download 
} from "lucide-react";

export function Phase1FeaturesShowcase() {
  const features = [
    {
      icon: <FolderTree className="w-5 h-5" />,
      title: "Hierarchical File Tree",
      description: "Nested folder structure with visual indicators",
      badge: "Enterprise"
    },
    {
      icon: <Search className="w-5 h-5" />,
      title: "Smart Search",
      description: "Instant file search with filters",
      badge: "Fast"
    },
    {
      icon: <Save className="w-5 h-5" />,
      title: "Auto-Save",
      description: "Never lose your work - saves every 3 seconds",
      badge: "Reliable"
    },
    {
      icon: <GitBranch className="w-5 h-5" />,
      title: "Dependency Graph",
      description: "Visualize imports, exports, and circular dependencies",
      badge: "Insight"
    },
    {
      icon: <FileStack className="w-5 h-5" />,
      title: "File Templates",
      description: "50+ ready-to-use templates for React, utilities, and more",
      badge: "Productive"
    },
    {
      icon: <Layout className="w-5 h-5" />,
      title: "Split-Pane Editor",
      description: "View and edit up to 4 files simultaneously",
      badge: "Efficient"
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Code Metrics",
      description: "Quality score, complexity, and maintainability analysis",
      badge: "Quality"
    },
    {
      icon: <Package className="w-5 h-5" />,
      title: "Auto package.json",
      description: "Smart dependency detection and package.json generation",
      badge: "Smart"
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "ZIP Export",
      description: "Export entire project as downloadable ZIP",
      badge: "Portable"
    },
    {
      icon: <FileCode2 className="w-5 h-5" />,
      title: "Syntax Highlighting",
      description: "Beautiful code highlighting with Prism.js",
      badge: "Beautiful"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Phase 1: Foundation Complete! 🎉</h2>
        <p className="text-muted-foreground">
          Enterprise-grade multi-file development environment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {features.map((feature, idx) => (
          <Card key={idx} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {feature.badge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="text-center space-y-2">
          <h3 className="font-semibold">What's Next?</h3>
          <p className="text-sm text-muted-foreground">
            Phase 2: Enhanced AI Intelligence with conversation memory, image generation, and advanced refactoring
          </p>
        </div>
      </Card>
    </div>
  );
}
