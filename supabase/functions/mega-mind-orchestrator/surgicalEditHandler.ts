/**
 * Surgical Edit Handler
 * Handles precise line-level code modifications
 */

import { SurgicalEditor } from '../_shared/surgicalEditor.ts';
import { SurgicalPromptBuilder } from '../_shared/surgicalPromptBuilder.ts';
import { ResponseParser } from '../_shared/responseParser.ts';
import { buildRichContext } from '../_shared/contextBuilder.ts';
import { callAIWithFallback } from '../_shared/aiHelpers.ts';
import { ThinkingStepTracker } from '../_shared/thinkingStepTracker.ts';

export async function handleSurgicalEdit(ctx: {
  request: string;
  conversationId: string;
  userId: string;
  projectId: string;
  framework: string;
  platformSupabase: any;
  userSupabase: any;
  broadcast: (event: string, data: any) => Promise<void>;
  stepTracker: ThinkingStepTracker;
  updateJobProgress: (progress: number, currentStep: string, phaseName: string, phases?: any[]) => Promise<void>;
  startTime: number;
}): Promise<any> {
  
  const {
    request,
    conversationId,
    userId,
    projectId,
    framework,
    platformSupabase,
    userSupabase,
    broadcast,
    stepTracker,
    updateJobProgress,
    startTime
  } = ctx;

  // Step 1: Load current files
  await stepTracker.trackStep('load_files', 'Loading project files', broadcast, 'start');
  
  const { data: projectFiles } = await platformSupabase
    .from('project_files')
    .select('file_path, content')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (!projectFiles || projectFiles.length === 0) {
    throw new Error('No files found to modify');
  }

  const currentFiles: Record<string, string> = {};
  for (const file of projectFiles) {
    currentFiles[file.file_path] = file.content || '';
  }

  console.log(`📂 Loaded ${Object.keys(currentFiles).length} files for surgical editing`);
  await stepTracker.trackStep('load_files', `Loaded ${Object.keys(currentFiles).length} files`, broadcast, 'complete');
  await updateJobProgress(40, 'Files loaded', 'Analyzing Changes', []);

  // Step 2: Build rich context
  await stepTracker.trackStep('build_context', 'Building project context', broadcast, 'start');
  
  const richContext = await buildRichContext(
    platformSupabase,
    projectId,
    userId,
    currentFiles,
    conversationId
  );

  await stepTracker.trackStep('build_context', 'Context ready', broadcast, 'complete');
  await updateJobProgress(50, 'Context built', 'Analyzing Changes', []);

  // Step 3: Generate surgical prompt
  await broadcast('generation:surgical_analysis', {
    status: 'analyzing',
    message: '🔍 Identifying exact lines to modify...',
    progress: 55
  });

  const promptBuilder = new SurgicalPromptBuilder();
  const surgicalPrompt = promptBuilder.buildModificationPrompt(
    richContext,
    request,
    currentFiles
  );

  console.log('🎯 Generated surgical editing prompt');

  // Step 4: Call AI with surgical editing instructions
  await stepTracker.trackStep('ai_analysis', 'AI analyzing code locations', broadcast, 'start');
  
  const aiResponse = await callAIWithFallback(
    [{ role: 'user', content: surgicalPrompt }],
    {
      systemPrompt: 'You are a precision code editor. Always respond with valid JSON containing surgical edits.',
      preferredModel: 'google/gemini-2.5-pro', // Use Pro for precision
      temperature: 0.3 // Lower temperature for accuracy
    }
  );

  await stepTracker.trackStep('ai_analysis', 'Identified modifications', broadcast, 'complete');
  await updateJobProgress(70, 'Changes identified', 'Applying Changes', []);

  // Step 5: Parse surgical response
  const parser = new ResponseParser();
  const surgicalResponse = parser.parse(aiResponse.data.content, 'surgical');

  if ('edits' in surgicalResponse) {
    console.log(`🔧 AI generated ${surgicalResponse.edits.length} surgical edits`);

    // Step 6: Validate edits
    await stepTracker.trackStep('validate_edits', 'Validating line numbers', broadcast, 'start');
    
    const editor = new SurgicalEditor();
    const validationErrors = editor.validateEdits(surgicalResponse.edits, currentFiles);

    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      throw new Error(`Invalid edits: ${validationErrors.join('; ')}`);
    }

    await stepTracker.trackStep('validate_edits', 'All edits valid', broadcast, 'complete');
    await updateJobProgress(75, 'Edits validated', 'Applying Changes', []);

    // Step 7: Apply surgical edits
    await stepTracker.trackStep('apply_edits', `Applying ${surgicalResponse.edits.length} changes`, broadcast, 'start');
    await broadcast('generation:applying_edits', {
      status: 'applying',
      message: `✏️ Making ${surgicalResponse.edits.length} precise changes...`,
      progress: 80,
      edits: surgicalResponse.edits.map(e => ({
        file: e.file,
        action: e.action,
        description: e.description
      }))
    });

    const updatedFiles = await editor.applyEdits(currentFiles, surgicalResponse.edits);

    console.log(`✅ Applied ${surgicalResponse.edits.length} surgical edits`);
    await stepTracker.trackStep('apply_edits', 'Changes applied successfully', broadcast, 'complete');
    await updateJobProgress(85, 'Changes applied', 'Saving Project', []);

    // Step 8: Save updated files
    await stepTracker.trackStep('save_files', 'Saving changes to database', broadcast, 'start');
    
    for (const [filePath, content] of Object.entries(updatedFiles)) {
      // Only save files that were actually modified
      if (content !== currentFiles[filePath]) {
        const { error } = await platformSupabase
          .from('project_files')
          .upsert({
            project_id: projectId,
            file_path: filePath,
            content: content,
            language: filePath.split('.').pop() || 'typescript',
            file_size: new Blob([content]).size,
            last_modified_at: new Date().toISOString()
          }, {
            onConflict: 'project_id,file_path'
          });

        if (error) {
          console.error(`Error saving ${filePath}:`, error);
        } else {
          console.log(`✅ Saved ${filePath}`);
        }
      }
    }

    await stepTracker.trackStep('save_files', 'All changes saved', broadcast, 'complete');
    await updateJobProgress(90, 'Files saved', 'Finalizing', []);

    // Step 9: Generate enhanced diff summaries
    const diffSummary = editor.generateDiffSummary(surgicalResponse.edits);
    const beforeAfterPreview = generateBeforeAfterPreview(surgicalResponse.edits, currentFiles);
    const performanceMetrics = generatePerformanceMetrics(surgicalResponse.edits, startTime);
    
    // Create rich success message with all details
    const successMessage = `**✅ Surgical Edit Complete**

${surgicalResponse.messageToUser}

${beforeAfterPreview}

${performanceMetrics}

**Summary:**${diffSummary}`;
    
    // Save to chat permanently
    await platformSupabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: successMessage,
      metadata: {
        isSurgicalEdit: true,
        editCount: surgicalResponse.edits.length,
        filesModified: [...new Set(surgicalResponse.edits.map(e => e.file))].length,
        executionTimeMs: Date.now() - startTime,
        edits: surgicalResponse.edits.map(e => ({
          file: e.file,
          action: e.action,
          description: e.description,
          lines: e.startLine ? `${e.startLine}-${e.endLine}` : e.insertAfterLine !== undefined ? `after ${e.insertAfterLine}` : 'new file'
        }))
      }
    });

    // Broadcast completion
    await broadcast('generation:surgical_complete', {
      status: 'complete',
      message: '✅ Changes applied successfully',
      progress: 100,
      summary: successMessage,
      edits: surgicalResponse.edits,
      diffSummary
    });

    await updateJobProgress(100, 'Complete', 'Complete', []);

    // Log success metrics
    const endTime = Date.now();
    await platformSupabase.from('platform_generation_stats').insert({
      user_id: userId,
      project_id: projectId,
      generation_id: conversationId,
      framework,
      success: true,
      generation_time_ms: endTime - startTime,
      file_count: Object.keys(updatedFiles).length,
      metadata: {
        type: 'surgical_edit',
        edits_count: surgicalResponse.edits.length,
        files_modified: [...new Set(surgicalResponse.edits.map(e => e.file))].length
      }
    });

    return {
      success: true,
      type: 'surgical_edit',
      edits: surgicalResponse.edits,
      summary: successMessage,
      filesModified: [...new Set(surgicalResponse.edits.map(e => e.file))]
    };
  }

  throw new Error('Invalid surgical response format');
}

/**
 * Generate before/after preview for user
 */
function generateBeforeAfterPreview(edits: any[], currentFiles: Record<string, string>): string {
  const previews: string[] = [];
  
  // Group by file
  const editsByFile: Record<string, any[]> = {};
  for (const edit of edits) {
    if (!editsByFile[edit.file]) {
      editsByFile[edit.file] = [];
    }
    editsByFile[edit.file].push(edit);
  }
  
  for (const [filePath, fileEdits] of Object.entries(editsByFile)) {
    previews.push(`\n### 📝 ${filePath}`);
    
    for (const edit of fileEdits) {
      if (edit.action === 'create') {
        const lineCount = edit.content.split('\n').length;
        previews.push(`\n**Created new file** (${lineCount} lines)`);
        previews.push('```typescript');
        previews.push(edit.content.split('\n').slice(0, 10).join('\n'));
        if (lineCount > 10) {
          previews.push(`... (${lineCount - 10} more lines)`);
        }
        previews.push('```');
      } else if (edit.action === 'replace') {
        const currentContent = currentFiles[edit.file];
        if (currentContent) {
          const lines = currentContent.split('\n');
          const oldLines = lines.slice(edit.startLine - 1, edit.endLine);
          const newLines = edit.content.split('\n');
          
          previews.push(`\n**Lines ${edit.startLine}-${edit.endLine}:**`);
          previews.push('```diff');
          oldLines.forEach(line => previews.push(`- ${line}`));
          newLines.forEach(line => previews.push(`+ ${line}`));
          previews.push('```');
        }
      } else if (edit.action === 'insert') {
        previews.push(`\n**Inserted after line ${edit.insertAfterLine}:**`);
        previews.push('```typescript');
        previews.push(edit.content);
        previews.push('```');
      } else if (edit.action === 'delete') {
        previews.push(`\n**Deleted lines ${edit.startLine}-${edit.endLine}**`);
      }
    }
  }
  
  return previews.join('\n');
}

/**
 * Generate performance metrics
 */
function generatePerformanceMetrics(edits: any[], startTime: number): string {
  const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const filesModified = [...new Set(edits.map(e => e.file))].length;
  const totalEdits = edits.length;
  
  // Estimate time saved vs full regeneration (typically 15-30s)
  const estimatedFullGenTime = 20;
  const timeSaved = Math.max(0, estimatedFullGenTime - parseFloat(executionTime));
  const efficiency = ((timeSaved / estimatedFullGenTime) * 100).toFixed(0);
  
  return `
---
**⚡ Performance:**
- Modified ${filesModified} file${filesModified !== 1 ? 's' : ''} with ${totalEdits} precise edit${totalEdits !== 1 ? 's' : ''}
- Completed in ${executionTime}s
- ~${timeSaved.toFixed(1)}s faster than full regeneration (${efficiency}% more efficient)
---`;
}
