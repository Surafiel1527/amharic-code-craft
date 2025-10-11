import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAutoSave } from "@/hooks/useAutoSave";
import { WorkspaceLayout } from "./workspace/WorkspaceLayout";
import { EditorSection } from "./workspace/EditorSection";
import { PreviewSection } from "./workspace/PreviewSection";
import { LiveGenerationProgress } from "@/components/LiveGenerationProgress";

interface Project {
  id: string;
  title: string;
  html_code: string;
  prompt: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  framework?: 'react' | 'html' | 'vue';
}

export default function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showConversations, setShowConversations] = useState(false);
  
  // Multi-file system state
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [showMultiFileGen, setShowMultiFileGen] = useState(false);
  const [editorMode, setEditorMode] = useState<'single' | 'split'>('single');
  const [showMetrics, setShowMetrics] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Version management state
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(1);
  
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview' | 'code'>('preview');

  // Load all conversations for this project
  const loadConversations = async () => {
    if (!projectId || !user) return;
    
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (!error && data) {
      setConversations(data);
    }
  };

  // Create a new conversation
  const handleNewConversation = async () => {
    if (!projectId || !user || !project) return;
    
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        title: `New Chat - ${new Date().toLocaleDateString()}`,
        user_id: user.id,
        project_id: projectId
      })
      .select('id')
      .single();
    
    if (error) {
      toast.error("Failed to create conversation");
      return;
    }
    
    if (newConv) {
      setConversationId(newConv.id);
      await loadConversations();
      toast.success("New conversation started!");
    }
  };

  // Switch to a different conversation
  const handleConversationSelect = (id: string) => {
    setConversationId(id);
    setShowConversations(false);
  };

  // 🆕 AUTO-DIAGNOSIS: Check for failed jobs and run diagnosis automatically
  const checkAndRunDiagnosis = async (conversationId: string) => {
    if (!conversationId) return;
    
    try {
      // Check if there's a failed job for this conversation that hasn't been diagnosed
      const { data: failedJob } = await supabase
        .from('ai_generation_jobs')
        .select('id, status, diagnostic_run, error_message, input_data')
        .eq('conversation_id', conversationId)
        .eq('status', 'failed')
        .eq('diagnostic_run', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (failedJob) {
        console.log('🔍 Found failed job without diagnosis, triggering auto-diagnosis...', failedJob.id);
        
        // Show a toast to let user know we're analyzing
        toast.info("🔍 Analyzing what went wrong...", {
          duration: 3000
        });
        
        // Call the unified-healing-engine to run conversational diagnosis
        const { data: { user } } = await supabase.auth.getUser();
        const response = await supabase.functions.invoke('unified-healing-engine', {
          body: {
            operation: 'conversational_diagnosis',
            params: {
              jobId: failedJob.id,
              conversationId,
              errorMessage: failedJob.error_message,
              context: failedJob.input_data
            }
          }
        });
        
        if (response.error) {
          console.error('❌ Auto-diagnosis failed:', response.error);
          // Still show the conversation even if diagnosis fails
        } else {
          console.log('✅ Auto-diagnosis completed:', response.data);
          toast.success("✅ Analysis complete! Check the chat for details.");
        }
      }
    } catch (error) {
      console.error('Error in auto-diagnosis:', error);
      // Don't block workspace loading if diagnosis fails
    }
  };

  const handleRestoreVersion = async (htmlCode: string) => {
    if (!project) return;
    
    try {
      // Update local state
      setProject(prev => prev ? { ...prev, html_code: htmlCode } : null);
      
      // Save directly to database
      const { error } = await supabase
        .from('projects')
        .update({ 
          html_code: htmlCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;
      
      setShowVersionHistory(false);
      toast.success("✅ Version restored! Refreshing preview...");
      
      // Force reload the page to show restored version in preview
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Restore error:', error);
      toast.error("Failed to restore version");
    }
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please log in to access your workspace");
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Load project
  useEffect(() => {
    if (!projectId || !user) return;

    const loadProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast.error("Failed to load project");
        navigate("/");
        return;
      }

      // Cast to proper Project type with framework
      const typedProject: Project = {
        ...data,
        framework: (data.framework as 'react' | 'html' | 'vue') || 'react'
      };
      setProject(typedProject);
      
      // Create or load conversation
      let convId: string | undefined;
      
      // Try to get the first conversation for this project
      const { data: existingConvs } = await (supabase
        .from('conversations')
        .select('id') as any)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .limit(1);
      
      if (existingConvs && existingConvs.length > 0) {
        convId = existingConvs[0].id;
        
        // Check if conversation already has messages
        const { data: existingMsgs, count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId);
        
        // If no messages exist, add the original prompt
        if (count === 0 && data.prompt) {
          console.log('💬 Adding original prompt to existing conversation');
          await supabase.from('messages').insert([
            {
              conversation_id: convId,
              role: 'user',
              content: data.prompt,
              metadata: { isOriginalPrompt: true }
            },
            {
              conversation_id: convId,
              role: 'assistant',
              content: `✨ I've created your project: **${data.title}**\n\nYour website is ready! You can now make changes by describing what you want to update.`,
              generated_code: data.html_code,
              metadata: { isInitialGeneration: true }
            }
          ]);
        }
      }

      if (!convId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ 
            title: `Workspace: ${data.title}`,
            user_id: user.id,
            project_id: projectId
          })
          .select('id')
          .single();
        
        convId = newConv?.id;
        
        // Insert the original prompt as the first message
        if (convId && data.prompt) {
          console.log('💬 Adding original prompt to new conversation');
          await supabase.from('messages').insert([
            {
              conversation_id: convId,
              role: 'user',
              content: data.prompt,
              metadata: { isOriginalPrompt: true }
            },
            {
              conversation_id: convId,
              role: 'assistant',
              content: `✨ I've created your project: **${data.title}**\n\nYour website is ready! You can now make changes by describing what you want to update.`,
              generated_code: data.html_code,
              metadata: { isInitialGeneration: true }
            }
          ]);
        }
      }

      if (convId) {
        setConversationId(convId);
        
        // 🆕 AUTO-DIAGNOSIS: Check if there's a failed job that needs diagnosis
        await checkAndRunDiagnosis(convId);
      }
      
      // Load all conversations for this project
      loadConversations();
    };

    loadProject();

    // Subscribe to real-time updates for this project
    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          console.log('Project updated:', payload);
          const updatedProject = payload.new as Project;
          
          // Update project state with new data
          setProject(updatedProject);
          
          // Show notification if html_code was updated (generation completed)
          if (updatedProject.html_code && updatedProject.title && !updatedProject.title.includes('[Generating...]')) {
            toast.success('✅ Project generation completed!');
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user, navigate]);

  // Auto-scroll removed - handled by UniversalChatInterface

  // Load project files for multi-file mode
  useEffect(() => {
    if (!projectId) return;
    
    const loadProjectFiles = async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('file_path');

      if (!error && data) {
        setProjectFiles(data);
      }
    };

    loadProjectFiles();
  }, [projectId, project?.html_code]); // Reload when project code changes (e.g., after restore)

  const handleCreateFile = async (path: string, type: 'file' | 'folder') => {
    if (!projectId || !user) return;
    
    // Normalize path for root-level config files (like vercel.json)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    
    const { error } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        file_path: normalizedPath,
        file_content: type === 'file' ? '' : '', // Empty for new files
        file_type: normalizedPath.split('.').pop() || 'txt',
        created_by: user.id
      });

    if (error) {
      console.error('Create file error:', error);
      toast.error('Failed to create file');
      return;
    }

    toast.success(`Created ${normalizedPath}`);
    // Reload files
    const { data } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);
    
    if (data) setProjectFiles(data);
  };

  const handleDeleteFile = async (path: string) => {
    if (!projectId) return;
    
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('project_id', projectId)
      .eq('file_path', path);

    if (error) {
      toast.error('Failed to delete file');
      return;
    }

    toast.success('File deleted');
    setProjectFiles(prev => prev.filter(f => f.file_path !== path));
    setSelectedFiles(prev => prev.filter(p => p !== path));
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!projectId) return;
    
    const { error } = await supabase
      .from('project_files')
      .update({ file_path: newPath })
      .eq('project_id', projectId)
      .eq('file_path', oldPath);

    if (error) {
      toast.error('Failed to rename file');
      return;
    }

    toast.success('File renamed');
    setProjectFiles(prev => 
      prev.map(f => f.file_path === oldPath ? { ...f, file_path: newPath } : f)
    );
    setSelectedFiles(prev => prev.map(p => p === oldPath ? newPath : p));
  };

  const handleSaveFile = async (content: string) => {
    if (!projectId || selectedFiles.length === 0) return;
    
    const filePath = selectedFiles[0];
    
    // Check if file exists
    const existingFile = projectFiles.find(f => f.file_path === filePath);
    
    if (existingFile) {
      // Update existing file
      const { error } = await supabase
        .from('project_files')
        .update({ 
          file_content: content,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('file_path', filePath);

      if (error) {
        console.error('Save error:', error);
        toast.error('Failed to save file');
        return;
      }

      setProjectFiles(prev =>
        prev.map(f => f.file_path === filePath ? { ...f, file_content: content } : f)
      );
    } else {
      // Create new file if it doesn't exist
      const { error } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          file_path: filePath,
          file_content: content,
          file_type: filePath.split('.').pop() || 'txt',
          created_by: user?.id
        });

      if (error) {
        console.error('Create error:', error);
        toast.error('Failed to create file');
        return;
      }

      // Reload files to include the new one
      const { data } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);
      
      if (data) setProjectFiles(data);
    }
    
    if (!autoSaveEnabled) {
      toast.success('File saved');
    }
  };

  // Auto-save for project files
  useAutoSave(projectFiles, {
    delay: 3000,
    enabled: autoSaveEnabled && viewMode === 'multi',
    onSave: async (files) => {
      // Only auto-save modified files
      console.log('Auto-saving files...');
    }
  });

  const handleBulkDelete = async (paths: string[]) => {
    if (!projectId) return;
    
    for (const path of paths) {
      await handleDeleteFile(path);
    }
  };

  const handleSelectFile = (path: string, multiSelect?: boolean) => {
    if (multiSelect) {
      setSelectedFiles(prev => 
        prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
      );
    } else {
      setSelectedFiles([path]);
    }
  };

  const handleSave = async () => {
    if (!project) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          html_code: project.html_code,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;
      toast.success("Project saved successfully");
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCode = () => {
    if (!project) return;
    
    try {
      const blob = new Blob([project.html_code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Code downloaded successfully!");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download code");
    }
  };

  // handleSendMessage removed - now handled by UniversalChatInterface

  // Check if project is still generating (not just by title, but by actual job status)
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    if (!project) {
      setIsGenerating(false);
      return;
    }
    
    // Check if there's actually an active job
    const checkJobStatus = async () => {
      const { data: jobs } = await supabase
        .from('ai_generation_jobs')
        .select('status')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const latestJob = jobs?.[0];
      const activeStatuses = ['queued', 'generating'];
      const isActuallyGenerating = latestJob && activeStatuses.includes(latestJob.status);
      
      setIsGenerating(isActuallyGenerating);
    };
    
    checkJobStatus();
  }, [project]);
  
  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 🆕 ONLY show generating progress if actively generating, not if failed
  // This allows users to access workspace for failed projects to see diagnosis and fix
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background">
        <LiveGenerationProgress 
          projectId={project.id}
          onComplete={() => {
            // Reload project data when generation completes
            window.location.reload();
          }}
          onCancel={() => {
            // Navigate back to home on cancel
            navigate('/');
          }}
        />
      </div>
    );
  }

  return (
    <WorkspaceLayout
      viewMode={viewMode}
      setViewMode={setViewMode}
      editorMode={editorMode}
      setEditorMode={setEditorMode}
      autoSaveEnabled={autoSaveEnabled}
      setAutoSaveEnabled={setAutoSaveEnabled}
      isPreviewExpanded={isPreviewExpanded}
      setIsPreviewExpanded={setIsPreviewExpanded}
      showVersionHistory={showVersionHistory}
      setShowVersionHistory={setShowVersionHistory}
      showConversations={showConversations}
      setShowConversations={setShowConversations}
      showMultiFileGen={showMultiFileGen}
      setShowMultiFileGen={setShowMultiFileGen}
      project={project}
      conversationId={conversationId}
      conversations={conversations}
      isSaving={isSaving}
      handleSave={handleSave}
      handleRestoreVersion={handleRestoreVersion}
      handleConversationSelect={handleConversationSelect}
      handleNewConversation={handleNewConversation}
      loadConversations={loadConversations}
      mobileTab={mobileTab}
      setMobileTab={setMobileTab}
    >
      {viewMode === 'multi' ? (
        <EditorSection
          projectId={projectId!}
          conversationId={conversationId}
          projectFiles={projectFiles}
          selectedFiles={selectedFiles}
          editorMode={editorMode}
          showMultiFileGen={showMultiFileGen}
          setShowMultiFileGen={setShowMultiFileGen}
          setProjectFiles={setProjectFiles}
          setSelectedFiles={setSelectedFiles}
          handleSelectFile={handleSelectFile}
          handleCreateFile={handleCreateFile}
          handleDeleteFile={handleDeleteFile}
          handleRenameFile={handleRenameFile}
          handleSaveFile={handleSaveFile}
          handleBulkDelete={handleBulkDelete}
          selectedVersionId={selectedVersionId}
          currentVersionNumber={currentVersionNumber}
          setSelectedVersionId={setSelectedVersionId}
          setCurrentVersionNumber={setCurrentVersionNumber}
          projectTitle={project.title}
          mobileTab={mobileTab}
        />
      ) : (
        <PreviewSection
          projectId={projectId!}
          conversationId={conversationId}
          htmlCode={project.html_code}
          framework={project.framework || 'react'}
          mobileTab={mobileTab}
          projectTitle={project.title}
          selectedFiles={selectedFiles}
          onFileSelect={handleSelectFile}
        />
      )}
    </WorkspaceLayout>
  );
}
