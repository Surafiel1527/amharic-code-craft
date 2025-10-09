import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export interface BasePlanSection {
  title: string;
  icon?: LucideIcon;
  content: ReactNode;
}

export interface BasePlanViewerProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  complexity?: {
    value: number | string;
    color?: string;
  };
  alerts?: Array<{
    type: "default" | "destructive";
    icon: LucideIcon;
    title: string;
    description: string;
  }>;
  sections: BasePlanSection[];
  actions?: ReactNode;
  maxHeight?: string;
}

/**
 * BasePlanViewer - Shared base component for all plan viewers
 * Provides consistent structure, styling, and layout
 */
export function BasePlanViewer({
  title,
  subtitle,
  icon: TitleIcon,
  complexity,
  alerts = [],
  sections,
  actions,
  maxHeight = "600px"
}: BasePlanViewerProps) {
  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              {TitleIcon && <TitleIcon className="w-5 h-5 text-primary" />}
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {complexity && (
            <Badge variant="secondary" className={complexity.color}>
              {complexity.value}
            </Badge>
          )}
        </div>

        {/* Alerts */}
        {alerts.map((alert, idx) => {
          const AlertIcon = alert.icon;
          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                alert.type === "destructive"
                  ? "border-destructive/50 bg-destructive/10"
                  : "border-border bg-muted/50"
              }`}
            >
              <div className="flex gap-2">
                <AlertIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">{alert.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {alert.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Scrollable Content */}
      <ScrollArea className={`h-[${maxHeight}] pr-4`}>
        <div className="space-y-6">
          {sections.map((section, idx) => {
            const SectionIcon = section.icon;
            return (
              <div key={idx}>
                {section.title && (
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    {SectionIcon && <SectionIcon className="w-4 h-4" />}
                    {section.title}
                  </h4>
                )}
                {section.content}
                {idx < sections.length - 1 && <Separator className="mt-6" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {actions && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            {actions}
          </div>
        </>
      )}
    </Card>
  );
}
