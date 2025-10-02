import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Save, FileText, Layout } from "lucide-react";
import { toast } from "sonner";

interface ProjectInstructionsPanelProps {
  conversationId: string;
  onSave: (instructions: string, fileStructure: string) => void;
  initialInstructions?: string;
  initialFileStructure?: string;
}

export const ProjectInstructionsPanel = ({
  conversationId,
  onSave,
  initialInstructions = "",
  initialFileStructure = ""
}: ProjectInstructionsPanelProps) => {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [fileStructure, setFileStructure] = useState(initialFileStructure);

  const handleSave = () => {
    onSave(instructions, fileStructure);
    toast.success("Project instructions saved!");
  };

  const exampleInstructions = `Example Instructions:
- Use exactly 15 classes/functions
- Follow MVC architecture pattern
- Include error handling in all functions
- Use TypeScript strict mode
- Add JSDoc comments for all functions
- Implement responsive design for mobile
- Use semantic HTML5 elements`;

  const exampleFileStructure = `Example File Structure:
/src
  /components
    - Header.tsx
    - Footer.tsx
    - GameBoard.tsx
  /utils
    - helpers.ts
    - validators.ts
  /types
    - index.ts
  App.tsx
  main.tsx`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custom Project Instructions
          </CardTitle>
          <CardDescription>
            Define guidelines and requirements that the AI should follow when building your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Project Guidelines
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={exampleInstructions}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Specify coding standards, architecture patterns, number of classes, naming conventions, etc.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Layout className="h-4 w-4" />
              File Structure Requirements
            </label>
            <Textarea
              value={fileStructure}
              onChange={(e) => setFileStructure(e.target.value)}
              placeholder={exampleFileStructure}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Define the exact file and folder structure the AI should maintain
            </p>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Project Instructions
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>✅ The AI will follow your instructions when generating code</p>
          <p>✅ File structure will be maintained across all modifications</p>
          <p>✅ Guidelines persist across the entire conversation</p>
          <p>✅ You can update instructions at any time</p>
          <p className="text-primary font-medium mt-4">
            Example: "Use 15 classes", "Include ErrorBoundary.tsx in /components", 
            "Follow SOLID principles"
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
