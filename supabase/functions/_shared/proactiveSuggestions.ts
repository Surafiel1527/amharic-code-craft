/**
 * Proactive Suggestion Engine
 * Analyzes context and suggests helpful features automatically
 */

interface ProactiveSuggestion {
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

/**
 * Generate proactive suggestions based on project context
 */
export function generateProactiveSuggestions(
  existingFeatures: string[],
  recentRequest: string,
  conversationContext: any
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const requestLower = recentRequest.toLowerCase();
  const hasFeature = (feat: string) => existingFeatures.includes(feat);

  // Authentication-related suggestions
  if (hasFeature('authentication')) {
    if (!hasFeature('password-reset')) {
      suggestions.push({
        title: 'Add Password Reset',
        description: 'Let users reset forgotten passwords via email',
        reason: 'You have authentication - users will need password recovery',
        priority: 'high',
        category: 'authentication',
      });
    }

    if (!hasFeature('email-verification')) {
      suggestions.push({
        title: 'Add Email Verification',
        description: 'Verify user emails during signup for security',
        reason: 'Authentication is more secure with verified emails',
        priority: 'medium',
        category: 'authentication',
      });
    }

    if (!hasFeature('user-profiles')) {
      suggestions.push({
        title: 'Add User Profiles',
        description: 'Let users view and edit their profile information',
        reason: 'Users expect to manage their profile after signing up',
        priority: 'medium',
        category: 'user-management',
      });
    }
  }

  // Database-related suggestions
  if (hasFeature('database')) {
    if (!hasFeature('data-validation')) {
      suggestions.push({
        title: 'Add Data Validation',
        description: 'Validate data before saving to prevent errors',
        reason: 'Database operations need validation for data integrity',
        priority: 'high',
        category: 'data-management',
      });
    }

    if (!hasFeature('search')) {
      suggestions.push({
        title: 'Add Search Functionality',
        description: 'Let users search through their data easily',
        reason: 'Users need to find data quickly as your database grows',
        priority: 'medium',
        category: 'data-management',
      });
    }
  }

  // Forms-related suggestions
  if (hasFeature('forms')) {
    if (!hasFeature('form-validation')) {
      suggestions.push({
        title: 'Add Form Validation',
        description: 'Real-time validation to prevent invalid inputs',
        reason: 'Forms need validation for better user experience',
        priority: 'high',
        category: 'forms',
      });
    }

    if (!hasFeature('auto-save')) {
      suggestions.push({
        title: 'Add Auto-Save',
        description: 'Automatically save form progress to prevent data loss',
        reason: 'Users appreciate not losing their work on forms',
        priority: 'low',
        category: 'forms',
      });
    }
  }

  // Context-aware suggestions based on recent request
  if (requestLower.includes('todo') || requestLower.includes('task')) {
    if (!hasFeature('notifications')) {
      suggestions.push({
        title: 'Add Task Notifications',
        description: 'Notify users about upcoming or overdue tasks',
        reason: 'Task apps are more useful with reminders',
        priority: 'medium',
        category: 'notifications',
      });
    }

    if (!hasFeature('categories')) {
      suggestions.push({
        title: 'Add Task Categories',
        description: 'Organize tasks into different categories or projects',
        reason: 'Users need to organize tasks as the list grows',
        priority: 'medium',
        category: 'organization',
      });
    }
  }

  if (requestLower.includes('chat') || requestLower.includes('message')) {
    if (!hasFeature('realtime')) {
      suggestions.push({
        title: 'Add Real-time Updates',
        description: 'Show new messages instantly without refresh',
        reason: 'Chat apps need real-time functionality',
        priority: 'high',
        category: 'realtime',
      });
    }

    if (!hasFeature('file-upload')) {
      suggestions.push({
        title: 'Add File Sharing',
        description: 'Let users share images and files in chat',
        reason: 'Modern chat apps support file sharing',
        priority: 'medium',
        category: 'media',
      });
    }
  }

  // Analytics suggestions
  if (hasFeature('dashboard') && !hasFeature('analytics')) {
    suggestions.push({
      title: 'Add Analytics Tracking',
      description: 'Track user behavior and app usage metrics',
      reason: 'Dashboards are more valuable with analytics data',
      priority: 'medium',
      category: 'analytics',
    });
  }

  // Performance suggestions
  if (conversationContext?.fileCount > 20 && !hasFeature('lazy-loading')) {
    suggestions.push({
      title: 'Add Lazy Loading',
      description: 'Load components on-demand for faster initial load',
      reason: 'Your app has many files - lazy loading improves performance',
      priority: 'medium',
      category: 'performance',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

/**
 * Format suggestions for AI prompt
 */
export function formatSuggestionsForPrompt(suggestions: ProactiveSuggestion[]): string {
  if (suggestions.length === 0) return '';

  let prompt = '\n\n💡 PROACTIVE SUGGESTIONS (Optional improvements):\n\n';
  
  suggestions.forEach((suggestion, index) => {
    const priorityEmoji = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢';
    prompt += `${index + 1}. ${priorityEmoji} ${suggestion.title}\n`;
    prompt += `   ${suggestion.description}\n`;
    prompt += `   Why: ${suggestion.reason}\n\n`;
  });

  prompt += '📝 NOTE: Only suggest these if the user\'s request naturally fits. Don\'t force unrelated features.\n';

  return prompt;
}

/**
 * Format suggestions for user display
 */
export function formatSuggestionsForUser(suggestions: ProactiveSuggestion[]): string {
  if (suggestions.length === 0) return '';

  let message = '\n\n💡 **Suggested Improvements:**\n\n';
  
  suggestions.forEach((suggestion, index) => {
    const priorityEmoji = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢';
    message += `${index + 1}. ${priorityEmoji} **${suggestion.title}**\n`;
    message += `   ${suggestion.description}\n`;
    message += `   _${suggestion.reason}_\n\n`;
  });

  message += '_Let me know if you\'d like me to add any of these!_';

  return message;
}
