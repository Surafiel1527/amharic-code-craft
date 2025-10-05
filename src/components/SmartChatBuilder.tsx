/**
 * SmartChatBuilder - Universal AI Chat Migration Wrapper
 * 
 * This wrapper maintains the exact same API as the original SmartChatBuilder
 * while using the Universal AI System underneath for consistent intelligence.
 * 
 * Production-ready migration wrapper with enterprise features integration.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, Settings, Activity, Save, LayoutDashboard, History as HistoryIcon, AlertCircle } from "lucide-react";
import { UniversalChatInterface } from "./UniversalChatInterface";
import { ProjectInstructionsPanel } from "./ProjectInstructionsPanel";
import { SelfHealingMonitor } from "./SelfHealingMonitor";
import { SnapshotManager } from "./SnapshotManager";
import { AICapabilitiesGuide } from "./AICapabilitiesGuide";
import { EnterpriseProjectDashboard } from "./EnterpriseProjectDashboard";
import { CollaborationIndicator } from "./CollaborationIndicator";
import { ProjectHistory } from "./ProjectHistory";
import { useErrorMonitor } from "@/hooks/useErrorMonitor";
import { useProactiveMonitoring } from "@/hooks/useProactiveMonitoring";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

interface SmartChatBuilderProps {
  onCodeGenerated?: (code: string) => void;
  currentCode?: string;
}

export const SmartChatBuilder = ({ onCodeGenerated, currentCode }: SmartChatBuilderProps) => {
  useErrorMonitor();
  const { healthStatus, issuesCount, isHealthy } = useProactiveMonitoring(60);
  const { t } = useLanguage();
  
  const [workingCode, setWorkingCode] = useState(currentCode || "");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [fileStructure, setFileStructure] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Create conversation on mount
  useEffect(() => {
    const createConversation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No authenticated user - skipping conversation creation');
          return;
        }

        const { data, error } = await supabase
          .from('conversations')
          .insert({ 
            title: 'Smart Code Builder Session',
            user_id: user.id 
          })
          .select('id')
          .single();
        
        if (!error && data) {
          setConversationId(data.id);
          console.log('📝 Created conversation:', data.id);
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    };
    
    createConversation();
  }, []);

  useEffect(() => {
    if (currentCode) {
      setWorkingCode(currentCode);
    }
  }, [currentCode]);

  const handleCodeUpdate = async (code: string, filePath: string) => {
    setWorkingCode(code);
    if (onCodeGenerated) {
      onCodeGenerated(code);
    }
  };

  const handleLoadProject = (project: any) => {
    setWorkingCode(project.html_code);
    setCurrentProjectId(project.id);
    if (onCodeGenerated) {
      onCodeGenerated(project.html_code);
    }
    setHistoryOpen(false);
    toast.success(`Project "${project.title}" loaded successfully`);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {t('aiCodeBuilder.enterpriseTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('aiCodeBuilder.enterpriseSubtitle')}
            </p>
            <div className="mt-2">
              <CollaborationIndicator />
            </div>
          </div>
          <div className="flex gap-2">
            <Sheet open={dashboardOpen} onOpenChange={setDashboardOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Enterprise Dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                <EnterpriseProjectDashboard />
              </SheetContent>
            </Sheet>

            <Sheet open={snapshotOpen} onOpenChange={setSnapshotOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Version Control">
                  <Save className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SnapshotManager />
              </SheetContent>
            </Sheet>
            
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Project History">
                  <HistoryIcon className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Project History</SheetTitle>
                  <SheetDescription>
                    Load previous projects to continue working on them
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <ProjectHistory onLoadProject={handleLoadProject} />
                </div>
              </SheetContent>
            </Sheet>
            
            <Sheet open={monitorOpen} onOpenChange={setMonitorOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Self-Healing Monitor">
                  <Activity className="h-4 w-4" />
                  {!isHealthy && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SelfHealingMonitor />
              </SheetContent>
            </Sheet>
            
            <Sheet open={showInstructions} onOpenChange={setShowInstructions}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Project Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Project Instructions</SheetTitle>
                  <SheetDescription>
                    Define custom guidelines and file structure for your project
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <ProjectInstructionsPanel
                    conversationId={conversationId || ''}
                    onSave={(instructions, structure) => {
                      setCustomInstructions(instructions);
                      setFileStructure(structure);
                      setShowInstructions(false);
                    }}
                    initialInstructions={customInstructions}
                    initialFileStructure={fileStructure}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {!isHealthy && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System health: {healthStatus} - {issuesCount} issue(s) detected.
              <Button 
                variant="link" 
                className="h-auto p-0 ml-2"
                onClick={() => setMonitorOpen(true)}
              >
                {t('aiCodeBuilder.viewDetails')}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <UniversalChatInterface
          mode="panel"
          height="h-full"
          conversationId={conversationId || undefined}
          projectId={currentProjectId || conversationId || undefined}
          selectedFiles={['current-project']}
          projectFiles={workingCode ? [{
            file_path: 'current-project',
            file_content: workingCode
          }] : []}
          onCodeApply={handleCodeUpdate}
          persistMessages={true}
          autoLearn={true}
          autoApply={true}
          showContext={false}
          showHeader={false}
          showFooter={true}
          placeholder={t('aiCodeBuilder.placeholder')}
          welcomeMessage={
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <div className="flex items-center justify-between">
                  <strong>🚀 {t('aiCodeBuilder.advancedTitle')}</strong>
                  <AICapabilitiesGuide />
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>✨ <strong>{t('aiCodeBuilder.createLabel')}</strong> {t('aiCodeBuilder.createExample')}</li>
                  <li>🗂️ <strong>{t('aiCodeBuilder.multiFileLabel')}</strong> {t('aiCodeBuilder.multiFileExample')}</li>
                  <li>🔧 <strong>{t('aiCodeBuilder.modifyLabel')}</strong> {t('aiCodeBuilder.modifyExample')}</li>
                  <li>🔨 <strong>{t('aiCodeBuilder.autoFixLabel')}</strong> {t('aiCodeBuilder.autoFixDescription')}</li>
                </ul>
                <div className="mt-3 p-2 bg-primary/5 rounded text-xs">
                  <strong>🧠 {t('aiCodeBuilder.smartMemory')}</strong> {t('aiCodeBuilder.smartMemoryDescription')} | 🛡️ {t('aiCodeBuilder.selfHealing')} | 📦 {t('aiCodeBuilder.versionControl')}
                </div>
              </AlertDescription>
            </Alert>
          }
        />
      </CardContent>
    </Card>
  );
};
