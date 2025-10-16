/**
 * UNIVERSAL MEGA MIND EDGE FUNCTION
 * Award-Winning Enterprise AI Development Platform
 * 
 * Single endpoint powered by:
 * - Meta-Cognitive Analyzer (AI determines strategy)
 * - Natural Communicator (AI generates all messages)
 * - Adaptive Executor (Dynamic execution)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UniversalMegaMind } from "../_shared/intelligence/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Broadcast AI-generated status updates to frontend
 */
async function broadcastStatus(
  supabase: any,
  channelId: string,
  message: string,
  status: string = 'thinking',
  metadata?: any
) {
  try {
    const channel = supabase.channel(`ai-status-${channelId}`);
    await channel.send({
      type: 'broadcast',
      event: 'status-update',
      payload: {
        status,
        message,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
    console.log(`📡 Broadcast sent: ${message}`);
  } catch (error) {
    console.error('Failed to broadcast status:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      request: userRequest,  // Frontend sends 'request', alias to 'userRequest'
      userId,
      conversationId,
      projectId: initialProjectId,  // ✅ FIX: Rename to avoid const reassignment
      awashContext  // ✨ FULL PLATFORM AWARENESS
    } = body;
    
    let projectId = initialProjectId;  // ✅ FIX: Use let so we can reassign when creating new project

    // ============================================
    // 🔒 ENTERPRISE SECURITY: PROJECT OWNERSHIP VALIDATION
    // ============================================
    if (projectId) {
      console.log('🔐 Validating project ownership:', { userId, projectId });
      
      // Validate user owns this project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, user_id, title')  // ✅ Fixed: was 'name', should be 'title'
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('❌ Project not found:', projectError);
        
        // Log security event
        await supabase.rpc('log_security_event', {
          p_user_id: userId,
          p_event_type: 'unauthorized_project_access',
          p_resource_type: 'project',
          p_resource_id: projectId,
          p_attempted_action: 'access',
          p_success: false,
          p_error_message: 'Project not found or access denied',
          p_metadata: { conversationId, endpoint: 'mega-mind' }
        });

        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized: Project not found or access denied',
            code: 'PROJECT_ACCESS_DENIED'
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (project.user_id !== userId) {
        console.error('❌ Project ownership validation failed:', {
          projectUserId: project.user_id,
          requestUserId: userId
        });

        // Log security event
        await supabase.rpc('log_security_event', {
          p_user_id: userId,
          p_event_type: 'unauthorized_project_access',
          p_resource_type: 'project',
          p_resource_id: projectId,
          p_attempted_action: 'access',
          p_success: false,
          p_error_message: 'User does not own this project',
          p_metadata: { 
            conversationId, 
            projectOwnerId: project.user_id,
            endpoint: 'mega-mind' 
          }
        });

        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized: You do not have access to this project',
            code: 'PROJECT_OWNERSHIP_DENIED'
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('✅ Project ownership validated:', project.title);  // ✅ Fixed: was name, should be title
      
      // Log successful access
      await supabase.rpc('log_security_event', {
        p_user_id: userId,
        p_event_type: 'project_access',
        p_resource_type: 'project',
        p_resource_id: projectId,
        p_attempted_action: 'access',
        p_success: true,
        p_metadata: { conversationId, projectName: project.title }  // ✅ Fixed: was name, should be title
      });
    }

    const channelId = projectId || conversationId;
    
    console.log('📊 Awash Context Received:', {
      hasContext: !!awashContext,
      totalFiles: awashContext?.workspace?.totalFiles || 0,
      framework: awashContext?.workspace?.framework || 'Unknown',
      hasBackend: awashContext?.workspace?.hasBackend || false,
      hasAuth: awashContext?.workspace?.hasAuth || false
    });

    // ============================================
    // 🧠 INTELLIGENT FILE OPERATIONS: Load existing files for AI context
    // ============================================
    let existingFiles: Record<string, string> = {};
    let fileOperations: any;
    
    if (projectId) {
      const { IntelligentFileOperations } = await import("../_shared/intelligentFileOperations.ts");
      fileOperations = new IntelligentFileOperations(supabase, projectId, userId);
      
      console.log('📂 Loading existing project files for AI context...');
      const projectContext = await fileOperations.loadProjectContext();
      existingFiles = projectContext.files;
      
      console.log('✅ Project context loaded:', {
        fileCount: projectContext.fileCount,
        totalLines: projectContext.totalLines,
        files: Object.keys(existingFiles)
      });
    }

    // Initialize Universal Mega Mind
    const megaMind = new UniversalMegaMind(supabase, lovableApiKey);
    
    // ✨ CRITICAL FIX: Wire up real-time status broadcasting
    const broadcastCallback = async (status: any) => {
      await broadcastStatus(
        supabase,
        channelId,
        status.message || status.status,
        status.status || 'thinking',
        status.metadata
      );
    };
    
    // Connect broadcast callback to executor for intermediate updates
    megaMind.setBroadcastCallback(broadcastCallback);

    console.log('🧠 Universal Mega Mind: Processing request', {
      userId,
      conversationId,
      projectId,
      requestLength: userRequest?.length,
      hasExistingFiles: Object.keys(existingFiles).length > 0
    });

    // Broadcast initial thinking message
    await broadcastStatus(
      supabase,
      channelId,
      "I'm analyzing your request and understanding your project... 🤔",
      'analyzing'
    );

    // Single unified processing - AI handles everything with full context
    const result = await megaMind.processRequest({
      userRequest,
      userId,
      conversationId,
      projectId,
      existingFiles,  // 🎯 AI now knows what already exists
      framework: awashContext?.workspace?.framework,
      context: awashContext  // ✨ Pass complete platform state
    });
    
    const analysis = result.analysis;
    
    // ============================================
    // 🎯 INTELLIGENT FILE OPERATIONS: AI-driven granular file management
    // ============================================
    console.log('🔍 Checking file operations conditions:', {
      success: result.success,
      hasOutput: !!result.output,
      hasFiles: !!result.output?.files,
      filesType: result.output?.files ? typeof result.output.files : 'undefined',
      filesIsArray: Array.isArray(result.output?.files),
      filesLength: result.output?.files?.length,
      projectId: !!projectId,
      hasFileOperations: !!fileOperations,
      filesSample: result.output?.files?.slice(0, 2)
    });
    
    // ============================================
    // 🆕 CREATE PROJECT IF NEEDED (New Generation Without Project)
    // ============================================
    if (result.success && result.output?.files && result.output.files.length > 0 && !projectId) {
      console.log('🆕 Creating new project for generated code...');
      
      try {
        // Create a new project for this generation
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            title: analysis.understanding.userGoal.slice(0, 100) || 'New Project',
            prompt: userRequest,  // ✅ FIX: Add required prompt field
            description: userRequest.slice(0, 500),
            html_code: JSON.stringify(result.output.files),
            framework: 'react'
          })
          .select()
          .single();
        
        if (projectError || !newProject) {
          console.error('❌ Failed to create project:', projectError);
        } else {
          projectId = newProject.id;
          console.log('✅ New project created:', { projectId, title: newProject.title });  // ✅ Fixed: was 'name', should be 'title'
          
          // Initialize file operations for the new project
          const { IntelligentFileOperations } = await import("../_shared/intelligentFileOperations.ts");
          fileOperations = new IntelligentFileOperations(supabase, projectId, userId);
          
          // Update conversation with project binding
          await supabase
            .from('conversations')
            .update({ project_id: projectId })
            .eq('id', conversationId);
        }
      } catch (createError) {
        console.error('❌ Error creating project:', createError);
      }
    }
    
    if (result.success && result.output?.files && projectId && fileOperations) {
      console.log('🤖 AI analyzing file operations...', {
        filesCount: result.output.files.length,
        projectId,
        filePaths: result.output.files.map((f: any) => f.path || 'NO_PATH')
      });
      
      try {
        // AI decides what operations to perform (create/edit/delete) and granularity (line/function/file)
        const operations = await fileOperations.analyzeOperations(
          userRequest,
          result.output,
          existingFiles
        );
        
        console.log('🎯 AI determined operations:', operations.map(op => ({
          type: op.type,
          path: op.path,
          granularity: op.granularity,
          reasoning: op.reasoning
        })));
        
        // Apply operations with version tracking for undo
        const applyResult = await fileOperations.applyOperations(
          operations,
          userRequest,
          conversationId
        );
        
        if (applyResult.success) {
          console.log('✅ Files intelligently applied with version tracking', {
            version: applyResult.version
          });
        } else {
          console.error('❌ Failed to apply file operations:', applyResult.error);
        }
      } catch (fileError) {
        console.error('❌ Error in intelligent file operations:', fileError);
      }
    } else {
      console.error('⚠️ Skipping file operations - conditions not met');
    }

    // ============================================
    // 🔒 POST-GENERATION VERIFICATION
    // ============================================
    if (result.success && result.output?.files && projectId) {
      console.log('🔍 Verifying files persisted to database...');
      try {
        const { data: projectFiles, error: verifyError } = await supabase
          .from('project_files')
          .select('file_path, content')
          .eq('project_id', projectId);
        
        if (verifyError) {
          console.error('❌ Verification query failed:', verifyError);
        } else if (!projectFiles || projectFiles.length === 0) {
          console.error('⚠️ WARNING: Files generated but NOT found in database!', {
            expectedFiles: result.output.files.length,
            foundFiles: 0,
            projectId
          });
          // Don't fail the request, but log for investigation
        } else {
          console.log('✅ Verification passed:', {
            filesInDB: projectFiles.length,
            filesGenerated: result.output.files.length,
            filesList: projectFiles.map(f => f.file_path)
          });
        }
      } catch (verifyErr) {
        console.error('❌ Verification error:', verifyErr);
      }
    }

    // ✅ ENTERPRISE: Save conversation to database for permanent persistence
    console.log('💾 Persisting conversation to database...');
    
    try {
      // 1. Save user message
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: userRequest,
          user_id: userId,
          metadata: {
            projectId,
            timestamp: new Date().toISOString()
          }
        });
      
      if (userMsgError) {
        console.error('❌ Failed to save user message:', userMsgError);
      } else {
        console.log('✅ User message saved to database');
      }

      // 2. Save AI response (MUST be AI-generated, no templates)
      if (!result.message) {
        console.error('❌ No AI message generated! This should never happen.');
      }
      
      const { error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: result.message,
          user_id: userId,
          metadata: {
            success: result.success,
            filesGenerated: result.filesGenerated?.length || 0,
            duration: result.duration,
            intent: analysis.understanding.userGoal,
            complexity: analysis.actionPlan.codeActions?.estimatedComplexity || 
                       (analysis.actionPlan.requiresExplanation ? 'explanation' : 'clarification'),
            confidence: analysis.meta.confidence,
            error: result.error ? {
              message: typeof result.error === 'string' ? result.error : result.error.message,
              type: 'generation_error'
            } : undefined,
            timestamp: new Date().toISOString()
          },
          generated_code: result.output ? JSON.stringify(result.output) : null
        });
      
      if (aiMsgError) {
        console.error('❌ Failed to save AI message:', aiMsgError);
      } else {
        console.log('✅ AI response saved to database');
      }
    } catch (dbError) {
      console.error('❌ Database persistence error:', dbError);
      // Don't fail the request if DB save fails - just log it
    }

    // Broadcast completion or error - MUST use AI-generated message only
    const finalStatus = result.success ? 'idle' : 'error';
    const errorArray = result.error 
      ? [typeof result.error === 'string' ? result.error : (result.error.message || 'Unknown error')]
      : undefined;
    
    const safeFilesGenerated = result.filesGenerated?.length || 0;
    
    // Critical: result.message MUST be AI-generated by the orchestrator
    if (!result.message) {
      console.error('🚨 CRITICAL: No AI completion message generated!');
    }
    
    await broadcastStatus(
      supabase,
      channelId,
      result.message || '⚠️ Process completed but no AI message was generated',
      finalStatus,
      {
        filesGenerated: safeFilesGenerated,
        duration: result.duration,
        errors: errorArray
      }
    );
    
    // ✅ Add delay to ensure broadcast delivery
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return unified response
    return new Response(
      JSON.stringify({
        success: result.success,
        projectId: projectId, // ← Return project ID so frontend knows about it
        analysis: {
          intent: analysis.understanding.userGoal,
          complexity: analysis.actionPlan.codeActions?.estimatedComplexity || 
                     (analysis.actionPlan.requiresExplanation ? 'explanation' : 'clarification'),
          confidence: analysis.meta.confidence
        },
        result: {
          message: result.message,
          output: result.output,
          filesGenerated: result.filesGenerated,
          duration: result.duration
        },
        error: result.error?.message
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[Universal Mega Mind] Error:', error);
    
    // Broadcast error with proper status
    try {
      const bodyClone = await req.clone().json();
      const { conversationId, projectId } = bodyClone;
      const channelId = projectId || conversationId;
      
      if (channelId) {
        await broadcastStatus(
          createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),
          channelId,
          error.message || 'An unexpected error occurred. Please try again.',
          'error',
          { errors: [error.message || 'Unknown error occurred'] }
        );
      }
    } catch {}
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
