import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedMegaMindHub } from "@/components/UnifiedMegaMindHub";
import { EnterpriseProjectDashboard } from "@/components/EnterpriseProjectDashboard";

export default function EnterpriseHub() {
  return (
    <Tabs defaultValue="unified" className="w-full">
      <div className="container mx-auto px-6 pt-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="unified">Unified Hub</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="unified">
        <UnifiedMegaMindHub />
      </TabsContent>
      
      <TabsContent value="detailed">
        <EnterpriseProjectDashboard />
      </TabsContent>
    </Tabs>
  );
}