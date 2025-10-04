import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Send, Code, AlertTriangle, CheckCircle2, Lightbulb, Settings, AlertCircle, Activity, Save, LayoutDashboard, History as HistoryIcon, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  action?: string;
  error?: boolean;
  orchestration?: {
    phases: string[];
    duration: number;
    qualityScore?: number;
  };
}

interface SmartChatBuilderProps {
  onCodeGenerated?: (code: string) => void;
  currentCode?: string;
}

export const SmartChatBuilder = ({ onCodeGenerated, currentCode }: SmartChatBuilderProps) => {
  // Error monitoring
  useErrorMonitor();
  const { healthStatus, issuesCount, isHealthy } = useProactiveMonitoring(60);
  const { t } = useLanguage();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("");
  const [progress, setProgress] = useState(0);
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create conversation and load persistent project on mount
  useEffect(() => {
    const createConversation = async () => {
      try {
        // Get current user
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
          .select('id, current_code')
          .single();
        
        if (!error && data) {
          setConversationId(data.id);
          console.log('📝 Created conversation:', data.id);
          
          // Load persistent project code if exists
          if (data.current_code) {
            console.log('✅ Loaded persistent project code');
            setWorkingCode(data.current_code);
            if (onCodeGenerated) {
              onCodeGenerated(data.current_code);
            }
          }
        } else if (error) {
          console.error('Failed to create conversation:', error);
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    };
    
    createConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (currentCode) {
      setWorkingCode(currentCode);
    }
  }, [currentCode]);

  const detectAction = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('create') || lower.includes('build') || lower.includes('make') || lower.includes('generate')) {
      return 'create';
    }
    if (lower.includes('add') || lower.includes('modify') || lower.includes('change') || lower.includes('update')) {
      return 'modify';
    }
    if (lower.includes('fix') || lower.includes('error') || lower.includes('bug') || lower.includes('broken')) {
      return 'fix';
    }
    return workingCode ? 'modify' : 'create';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      action: detectAction(input)
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Detect user intent
      const hasActiveProject = !!workingCode;
      const wantsNewProject = input.toLowerCase().match(/\b(create|build|make|generate|new)\b.*\b(project|app|website|game)\b/i) && 
                              !input.toLowerCase().match(/\b(update|modify|change|fix|add to|improve)\b/i);
      
      // Determine code context
      const codeToModify = wantsNewProject ? "" : workingCode;
      
      // Detect if this is a simple modification
      const isSimpleChange = hasActiveProject && 
                            !wantsNewProject && 
                            input.toLowerCase().match(/\b(change|update|modify|fix|adjust|set|make)\b.*\b(color|style|text|size|font|background)\b/i);
      
      let data, error;
      
      if (isSimpleChange) {
        // Fast path: Use smart-diff-update
        console.log('🚀 Using fast smart-diff-update on existing project');
        setCurrentPhase('Updating existing project');
        setProgress(50);
        
        const response = await supabase.functions.invoke('smart-diff-update', {
          body: {
            userRequest: input,
            currentCode: workingCode,
          }
        });
        
        data = response.data;
        error = response.error;
        setProgress(100);
      } else {
        // Full orchestration
        const isModification = hasActiveProject && !wantsNewProject;
        console.log('🚀 Using full Smart Orchestrator:', { 
          isModification,
          hasCode: !!codeToModify,
          wantsNew: wantsNewProject,
          action: userMessage.action
        });

        const phases = ['Planning', 'Analyzing', 'Generating', 'Refining', 'Learning'];
        let currentPhaseIdx = 0;
        
        const progressInterval = setInterval(() => {
          if (currentPhaseIdx < phases.length) {
            setCurrentPhase(phases[currentPhaseIdx]);
            setProgress((currentPhaseIdx + 1) * 20);
            currentPhaseIdx++;
          }
        }, 800);

        const response = await supabase.functions.invoke('smart-orchestrator', {
          body: {
            userRequest: input,
            conversationId,
            currentCode: codeToModify,
            autoRefine: true,
            autoLearn: true
          }
        });

        clearInterval(progressInterval);
        data = response.data;
        error = response.error;
        setProgress(100);
      }

      if (error) {
        console.error('❌ Error from orchestrator:', error);
        if (error.message?.includes('rate_limit') || error.message?.includes('429')) {
          toast.error("Too many requests. Please wait a moment.");
        } else if (error.message?.includes('payment_required') || error.message?.includes('402')) {
          toast.error("Credits needed. Please add credits to your workspace.");
        } else {
          toast.error("Failed to process request");
        }
        throw error;
      }

      console.log('✅ Complete:', { 
        isSimpleChange,
        success: data.success, 
        phases: data.phases?.length,
        hasCode: !!(data.finalCode || data.updatedCode)
      });

      const generatedCode = isSimpleChange ? data.updatedCode : data.finalCode;
      const content = isSimpleChange 
        ? (data.explanation || "Updated the code with your changes.")
        : (data.plan?.architecture_overview || "Generated code with smart optimization!");

      const assistantMessage: Message = {
        role: 'assistant',
        content,
        code: generatedCode,
        action: userMessage.action,
        orchestration: isSimpleChange ? {
          phases: ['smart-diff'],
          duration: data.processingTime || 1000,
          qualityScore: undefined
        } : {
          phases: data.phases?.map((p: any) => p.name) || [],
          duration: data.totalDuration || 0,
          qualityScore: data.qualityMetrics?.finalScore
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update working code if new code was generated
      if (generatedCode) {
        setWorkingCode(generatedCode);
        if (onCodeGenerated) {
          onCodeGenerated(generatedCode);
        }
        
        // Save persistent project code to conversation
        if (conversationId) {
          await supabase
            .from("conversations")
            .update({ 
              updated_at: new Date().toISOString(),
              current_code: generatedCode 
            })
            .eq("id", conversationId);
        }
        
        // Contextual success messages
        if (isSimpleChange) {
          toast.success("⚡ Updated instantly!");
        } else if (hasActiveProject && !wantsNewProject) {
          toast.success("🔧 Project updated!");
        } else {
          toast.success("✨ New project created!");
        }
      }

    } catch (error: any) {
      console.error('💥 Error in orchestrator:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "I encountered an error. Please try rephrasing your request or breaking it into smaller steps.",
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentPhase("");
      setProgress(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLoadProject = async (project: any) => {
    setWorkingCode(project.html_code);
    setCurrentProjectId(project.id);
    if (onCodeGenerated) {
      onCodeGenerated(project.html_code);
    }
    
    // Save to conversation for persistence
    if (conversationId) {
      await supabase
        .from("conversations")
        .update({ current_code: project.html_code })
        .eq("id", conversationId);
    }
    
    // Add system message to chat
    const systemMessage: Message = {
      role: 'assistant',
      content: `Loaded project: "${project.title}". You can now continue building on this project. What would you like to add or modify?`,
      code: project.html_code
    };
    setMessages(prev => [...prev, systemMessage]);
    setHistoryOpen(false);
    toast.success(`Project "${project.title}" loaded successfully`);
  };

  const handleStartFresh = async () => {
    setWorkingCode("");
    setMessages([]);
    
    // Clear persistent project code
    if (conversationId) {
      await supabase
        .from("conversations")
        .update({ current_code: null })
        .eq("id", conversationId);
    }
    
    toast.info("Starting fresh project");
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
                <EnterpriseProjectDashboard 
                  onCodeUpdate={(code) => {
                    setWorkingCode(code);
                    if (onCodeGenerated) onCodeGenerated(code);
                  }}
                />
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
        {/* Active Project Indicator */}
        {workingCode && (
          <div className="px-3 py-2 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground">Active Project ({(workingCode.length / 1000).toFixed(1)}KB)</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleStartFresh}
                className="h-7 text-xs"
              >
                Start Fresh
              </Button>
            </div>
          </div>
        )}
        
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
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
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {message.error ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : message.code ? (
                      <Code className="h-4 w-4 text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.error
                      ? 'bg-destructive/10 border border-destructive/20'
                      : 'bg-muted'
                  }`}
                >
                  {message.action && message.role === 'user' && (
                    <div className="text-xs opacity-75 mb-1">
                      Action: {message.action}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.code && (
                    <div className="mt-3 p-2 bg-background/50 rounded border space-y-2">
                      <div className="flex items-center gap-2">
                        <Code className="h-3 w-3" />
                        <span className="text-xs font-semibold">Generated Code</span>
                      </div>
                      <pre className="text-xs overflow-x-auto">
                        {message.code.substring(0, 200)}...
                      </pre>
                      {message.orchestration && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-2.5 w-2.5 mr-1" />
                            {message.orchestration.phases.length} phases
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(message.orchestration.duration / 1000).toFixed(1)}s
                          </Badge>
                          {message.orchestration.qualityScore && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                              Q: {message.orchestration.qualityScore}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3 min-w-[300px]">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Smart Orchestration</span>
                    </div>
                    {currentPhase && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>{currentPhase}...</span>
                      </div>
                    )}
                    <Progress value={progress} className="h-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={workingCode 
              ? "Modify your project or say 'create new' to start fresh..." 
              : "Describe what you want to build or change..."
            }
            disabled={isLoading}
            className="min-h-[60px]"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
