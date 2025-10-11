import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedFileTree } from "@/components/EnhancedFileTree";
import { SplitPaneEditor } from "@/components/SplitPaneEditor";
import { CodeEditor } from "@/components/CodeEditor";
import { MultiFileGenerator } from "@/components/MultiFileGenerator";
import { FileTemplatesLibrary } from "@/components/FileTemplatesLibrary";
import { ProjectVersionSelector } from "@/components/ProjectVersionSelector";
import { ConversationHistoryPanel } from "@/components/ConversationHistoryPanel";
import { ProjectPreviewGenerator } from "@/components/ProjectPreviewGenerator";
import { ProjectDownloader } from "@/components/ProjectDownloader";
import { DependencyGraph } from "@/components/DependencyGraph";
import { CodeMetrics } from "@/components/CodeMetrics";
import { IntelligentRefactoring } from "@/components/IntelligentRefactoring";
import { ProactiveAIAssistant } from "@/components/ProactiveAIAssistant";
import { PatternIntelligenceDashboard } from "@/components/PatternIntelligenceDashboard";
import { ReactComponentGenerator } from "@/components/ReactComponentGenerator";
import { TailwindUtilitiesBuilder } from "@/components/TailwindUtilitiesBuilder";
import { StateManagementHelper } from "@/components/StateManagementHelper";
import { AdvancedTestGenerator } from "@/components/AdvancedTestGenerator";
import { CICDPipelineBuilder } from "@/components/CICDPipelineBuilder";
import { APITestingSuite } from "@/components/APITestingSuite";
import { DeploymentManager } from "@/components/DeploymentManager";
import { CollaborativeCodeEditor } from "@/components/CollaborativeCodeEditor";
import { CodeReviewPanel } from "@/components/CodeReviewPanel";
import { TemplatesGallery } from "@/components/TemplatesGallery";
import { UsageAnalyticsDashboard } from "@/components/UsageAnalyticsDashboard";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { AICodeReview } from "@/components/AICodeReview";
import { SmartDebugger } from "@/components/SmartDebugger";
import { LanguageCapabilities } from "@/components/LanguageCapabilities";
import { toast } from "sonner";

interface EditorSectionProps {
  projectId: string;
  conversationId: string | null;
  projectFiles: any[];
  selectedFiles: string[];
  editorMode: 'single' | 'split';
  showMultiFileGen: boolean;
  setShowMultiFileGen: (show: boolean) => void;
  setProjectFiles: (files: any[]) => void;
  setSelectedFiles: (files: string[]) => void;
  handleSelectFile: (path: string, multiSelect?: boolean) => void;
  handleCreateFile: (path: string, type: 'file' | 'folder') => void;
  handleDeleteFile: (path: string) => void;
  handleRenameFile: (oldPath: string, newPath: string) => void;
  handleSaveFile: (content: string) => void;
  handleBulkDelete: (paths: string[]) => void;
  selectedVersionId: string | null;
  currentVersionNumber: number;
  setSelectedVersionId: (id: string | null) => void;
  setCurrentVersionNumber: (num: number) => void;
  projectTitle: string;
}

export function EditorSection({
  projectId,
  conversationId,
  projectFiles,
  selectedFiles,
  editorMode,
  showMultiFileGen,
  setShowMultiFileGen,
  setProjectFiles,
  handleSelectFile,
  handleCreateFile,
  handleDeleteFile,
  handleRenameFile,
  handleSaveFile,
  handleBulkDelete,
  selectedVersionId,
  currentVersionNumber,
  setSelectedVersionId,
  setCurrentVersionNumber,
  projectTitle
}: EditorSectionProps) {
  
  return (
    <>
      {showMultiFileGen && (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-background/95 p-4 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Multi-File Project Generator</h2>
              <button
                className="px-4 py-2"
                onClick={() => setShowMultiFileGen(false)}
              >
                Close
              </button>
            </div>
            <MultiFileGenerator
              projectId={projectId}
              conversationId={conversationId!}
              onFilesGenerated={() => {
                const loadFiles = async () => {
                  const { data } = await import("@/integrations/supabase/client").then(m => m.supabase
                    .from('project_files')
                    .select('*')
                    .eq('project_id', projectId));
                  if (data) setProjectFiles(data);
                };
                loadFiles();
                setShowMultiFileGen(false);
              }}
            />
          </div>
        </div>
      )}
      
      <div className="flex h-full">
        {/* File Tree */}
        <div className="w-64">
          <EnhancedFileTree
            files={projectFiles}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onBulkDelete={handleBulkDelete}
          />
        </div>

        {/* Code Editor or Split Pane */}
        <div className="flex-1 border-r">
          {editorMode === 'split' ? (
            <SplitPaneEditor
              files={projectFiles}
              onSave={(path, content) => handleSaveFile(content)}
              initialFile={selectedFiles[0] || null}
            />
          ) : (
            <CodeEditor
              filePath={selectedFiles[0] || null}
              initialContent={projectFiles.find(f => f.file_path === selectedFiles[0])?.file_content || ''}
              onSave={handleSaveFile}
            />
          )}
        </div>

        {/* Right Sidebar with all tools */}
        <div className="w-96">
          <Tabs defaultValue="templates">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="h-[calc(100vh-200px)]">
              <FileTemplatesLibrary
                onSelectTemplate={(template, fileName) => {
                  handleCreateFile(fileName, 'file');
                  toast.success(`Created ${fileName} from template`);
                }}
              />
            </TabsContent>

            <TabsContent value="metrics" className="h-[calc(100vh-200px)] overflow-auto">
              {selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0]) && (
                <CodeMetrics
                  code={projectFiles.find(f => f.file_path === selectedFiles[0])?.file_content || ''}
                  filePath={selectedFiles[0]}
                />
              )}
            </TabsContent>

            <TabsContent value="tools" className="h-[calc(100vh-200px)] overflow-auto p-4 space-y-4">
              {selectedFiles[0] && projectFiles.find(f => f.file_path === selectedFiles[0]) && (
                <IntelligentRefactoring
                  code={projectFiles.find(f => f.file_path === selectedFiles[0])?.file_content || ''}
                  filePath={selectedFiles[0]}
                  onApplySuggestion={(newCode) => handleSaveFile(newCode)}
                />
              )}
              <ProactiveAIAssistant projectId={projectId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
