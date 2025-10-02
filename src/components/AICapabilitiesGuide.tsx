import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { AISystemDocs } from "./AISystemDocs";

export const AICapabilitiesGuide = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="w-4 h-4" />
          View AI Capabilities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI System Documentation</DialogTitle>
          <DialogDescription>
            Learn about self-healing, multi-file generation, and version control
          </DialogDescription>
        </DialogHeader>
        <AISystemDocs />
      </DialogContent>
    </Dialog>
  );
};
