/**
 * Auto-Fix Integration for Mega Mind Orchestrator
 * Handles automatic error detection and fixing during code generation
 */

import { autoFixCode, type CodeFile, type AutoFixResult } from '../_shared/autoFixEngine.ts';

/**
 * Auto-fix generated code with retry logic and learning
 */
export async function autoFixGeneratedCode(
  files: Array<{ path: string; content: string; language?: string }>,
  platformSupabase: any,
  userId: string,
  broadcast: (event: string, data: any) => Promise<void>
): Promise<AutoFixResult> {
  
  console.log('🔧 Starting auto-fix for generated code...');

  // Convert to CodeFile format
  const codeFiles: CodeFile[] = files.map(f => ({
    path: f.path,
    content: f.content,
    language: detectLanguage(f.path, f.language)
  }));

  // Run auto-fix (max 3 attempts)
  const result = await autoFixCode(codeFiles, 3);

  // Log auto-fix results
  if (result.fixed) {
    await platformSupabase.from('build_events').insert({
      user_id: userId,
      event_type: 'auto_fix_success',
      status: 'success',
      title: `Auto-fixed ${result.fixedErrorTypes.length} error types`,
      details: {
        attempts: result.totalAttempts,
        fixedTypes: result.fixedErrorTypes,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      },
      motivation_message: `🎉 Platform automatically fixed ${result.fixedErrorTypes.join(', ')} errors!`
    });

    // Store successful fixes as patterns for future learning
    // CRITICAL FIX: Only store if we have valid original and fixed files
    if (result.originalFiles.length > 0 && result.fixedFiles.length > 0) {
      for (const attempt of result.attempts) {
        if (attempt.fixApplied) {
          // Store pattern using the first file (primary file that was fixed)
          await storeFixPattern(
            platformSupabase,
            attempt.errorType,
            attempt.errorDetails,
            result.originalFiles[0],
            result.fixedFiles[0]
          );
        }
      }
    }
  } else if (result.errors.length > 0) {
    // Log errors that couldn't be fixed - removed user_id as it doesn't exist in schema
    await platformSupabase.from('detected_errors').insert(
      result.errors.map(error => ({
        error_type: 'generation',
        error_message: error,
        severity: 'medium',
        status: 'pending',
        error_context: { // Fixed: use error_context not context
          fileCount: files.length,
          attempts: result.totalAttempts,
          userId: userId // Store userId in context instead
        }
      }))
    );
  }

  return result;
}

/**
 * Detect programming language from file path
 */
function detectLanguage(path: string, providedLanguage?: string): CodeFile['language'] {
  if (providedLanguage) {
    if (['typescript', 'javascript', 'html', 'css', 'json'].includes(providedLanguage)) {
      return providedLanguage as CodeFile['language'];
    }
  }

  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  
  return 'typescript'; // Default
}

/**
 * Store successful fix as a pattern for future learning
 */
async function storeFixPattern(
  supabase: any,
  errorType: string,
  errors: string[],
  originalFile: CodeFile,
  fixedFile: CodeFile
): Promise<void> {
  try {
    // CRITICAL FIX: Add null checks before accessing properties
    if (!originalFile || !fixedFile || !fixedFile.content) {
      console.warn('⚠️ Skipping pattern storage - invalid file data');
      return;
    }

    await supabase.from('universal_error_patterns').upsert({
      error_signature: errorType,
      error_category: errorType,
      error_pattern: errors[0]?.substring(0, 500) || 'Unknown',
      solution_code: fixedFile.content.substring(0, 2000), // Store first 2000 chars
      confidence_score: 0.75, // Start with 75% confidence
      success_count: 1,
      auto_fixable: true,
      learned_from: 'auto_fix_engine',
      metadata: {
        fileType: originalFile.language || 'unknown',
        errorCount: errors.length
      }
    }, { 
      onConflict: 'error_signature',
      // Update success count if pattern already exists
      ignoreDuplicates: false
    });

    console.log(`✅ Stored fix pattern for ${errorType}`);
  } catch (error) {
    console.error('Failed to store fix pattern:', error);
  }
}
