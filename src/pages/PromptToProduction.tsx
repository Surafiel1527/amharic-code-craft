import { PromptToProductionDashboard } from "@/components/PromptToProductionDashboard";

const PromptToProduction = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Prompt to Production</h1>
        <p className="text-muted-foreground text-lg">
          Describe your app, and we'll generate, build, test, and deploy it automatically
        </p>
      </div>

      <PromptToProductionDashboard />
    </div>
  );
};

export default PromptToProduction;
