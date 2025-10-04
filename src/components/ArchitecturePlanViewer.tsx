import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layers, FileCode, Zap } from "lucide-react";

interface ArchitecturePlan {
  architecture_overview: string;
  component_breakdown: any[];
  technology_stack: string[];
  file_structure: Record<string, any>;
  estimated_complexity: string;
  recommended_approach: string;
}

interface ArchitecturePlanViewerProps {
  plan: ArchitecturePlan;
}

const complexityColors: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  complex: "bg-red-500"
};

export function ArchitecturePlanViewer({ plan }: ArchitecturePlanViewerProps) {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Architecture Plan</h3>
          </div>
          <Badge variant="secondary" className="gap-1">
            <div className={`w-2 h-2 rounded-full ${complexityColors[plan.estimated_complexity] || complexityColors.medium}`} />
            {plan.estimated_complexity} complexity
          </Badge>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-4 pr-4">
            {/* Overview */}
            <div>
              <h4 className="text-sm font-medium mb-2">Overview</h4>
              <p className="text-sm text-muted-foreground">{plan.architecture_overview}</p>
            </div>

            {/* Components */}
            {plan.component_breakdown?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Components ({plan.component_breakdown.length})
                </h4>
                <div className="space-y-2">
                  {plan.component_breakdown.map((component: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card/50">
                      <div className="font-medium text-sm">{component.name || `Component ${idx + 1}`}</div>
                      {component.purpose && (
                        <p className="text-xs text-muted-foreground mt-1">{component.purpose}</p>
                      )}
                      {component.dependencies && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {component.dependencies.map((dep: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tech Stack */}
            {plan.technology_stack?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Technology Stack
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {plan.technology_stack.map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Approach */}
            {plan.recommended_approach && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recommended Approach</h4>
                <p className="text-sm text-muted-foreground">{plan.recommended_approach}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
