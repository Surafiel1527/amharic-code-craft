import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, Globe, Download } from "lucide-react";

export function LanguageCapabilities() {
  const capabilities = [
    {
      icon: "🌐",
      name: "Web Apps (React)",
      status: "live-preview",
      color: "blue",
      features: [
        "Live preview in browser",
        "Auto-install npm packages",
        "Full TypeScript support",
        "Instant updates"
      ]
    },
    {
      icon: "🐍",
      name: "Python Projects",
      status: "downloadable",
      color: "yellow",
      features: [
        "Flask/Django/FastAPI",
        "Pygame games",
        "Data science apps",
        "Complete with dependencies"
      ]
    },
    {
      icon: "📱",
      name: "Mobile Apps",
      status: "via-capacitor",
      color: "green",
      features: [
        "React → iOS/Android",
        "Native capabilities",
        "Cross-platform",
        "Single codebase"
      ]
    }
  ];

  const statusColors = {
    "live-preview": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    "downloadable": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    "via-capacitor": "bg-green-500/10 text-green-700 dark:text-green-300"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 className="h-5 w-5" />
          Multi-Language Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {capabilities.map((cap, idx) => (
          <div key={idx} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cap.icon}</span>
                <span className="font-semibold text-sm">{cap.name}</span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs ${statusColors[cap.status as keyof typeof statusColors]}`}
              >
                {cap.status === 'live-preview' && <Globe className="w-3 h-3 mr-1" />}
                {cap.status === 'downloadable' && <Download className="w-3 h-3 mr-1" />}
                {cap.status.replace(/-/g, ' ')}
              </Badge>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-8">
              {cap.features.map((feature, fidx) => (
                <li key={fidx}>• {feature}</li>
              ))}
            </ul>
          </div>
        ))}
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs space-y-2">
          <p className="font-semibold">💡 Example Requests:</p>
          <div className="space-y-1 text-muted-foreground">
            <p>• "Create a Flask API for a todo app" → Python project</p>
            <p>• "Build a React dashboard" → Live web preview</p>
            <p>• "Make a pygame snake game" → Python download</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
