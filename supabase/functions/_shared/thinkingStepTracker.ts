/**
 * Thinking Step Tracker - Centralized tracking for AI operations
 * Eliminates duplication across orchestrator, code-generator, and progressiveBuilder
 */

export class ThinkingStepTracker {
  private startTimes: Map<string, number> = new Map();
  private supabase: any;
  private jobId: string | null;
  private projectId: string | null;
  private conversationId: string | null;

  constructor(
    supabase: any,
    jobId: string | null,
    projectId: string | null,
    conversationId: string | null = null
  ) {
    this.supabase = supabase;
    this.jobId = jobId;
    this.projectId = projectId;
    this.conversationId = conversationId;
  }

  async trackStep(
    operation: string,
    detail: string,
    broadcast: Function,
    status: 'start' | 'complete' = 'start'
  ) {
    const timestamp = new Date().toISOString();

    if (status === 'start') {
      this.startTimes.set(operation, Date.now());
      await broadcast('thinking_step', {
        operation,
        detail,
        status: 'active',
        timestamp
      });

      // Save to DB with conversation_id for persistence
      if (this.jobId && this.projectId) {
        await this.supabase
          .from('thinking_steps')
          .insert({
            job_id: this.jobId,
            project_id: this.projectId,
            conversation_id: this.conversationId,
            operation,
            detail,
            status: 'active',
            timestamp
          })
          .catch((err: any) => console.warn('Failed to save thinking step:', err));
      }
    } else {
      const startTime = this.startTimes.get(operation) || Date.now();
      const duration = (Date.now() - startTime) / 1000; // seconds
      this.startTimes.delete(operation);

      await broadcast('thinking_step', {
        operation,
        detail,
        status: 'complete',
        duration,
        timestamp
      });

      // Save to DB with conversation_id
      if (this.jobId && this.projectId) {
        await this.supabase
          .from('thinking_steps')
          .insert({
            job_id: this.jobId,
            project_id: this.projectId,
            conversation_id: this.conversationId,
            operation,
            detail,
            status: 'complete',
            duration,
            timestamp
          })
          .catch((err: any) => console.warn('Failed to save thinking step:', err));
      }
    }
  }
}
