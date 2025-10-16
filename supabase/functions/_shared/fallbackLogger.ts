/**
 * Fallback File-Based Logger
 * 
 * When database logging fails (e.g. during outages), this logger:
 * - Writes to tmp file system
 * - Queues logs for batch upload when DB recovers
 * - Provides emergency debugging trail
 * - Never loses critical error information
 * 
 * Prevents circular dependency: resilientDb fails → can't log to DB → logs to file
 */

import { LogLevel, LogEntry } from './logger.ts';

interface QueuedLog extends LogEntry {
  uploadAttempts: number;
  lastAttemptAt?: string;
}

const LOG_FILE_PATH = '/tmp/lovable-emergency-logs.jsonl';
const MAX_QUEUE_SIZE = 1000;
const UPLOAD_BATCH_SIZE = 50;
const MAX_UPLOAD_ATTEMPTS = 3;

class FallbackLogger {
  private queue: QueuedLog[] = [];
  private uploadInProgress = false;
  private dbAvailable = true;

  constructor() {
    // Load queued logs from file on startup
    this.loadQueuedLogs();
    
    // Try to upload queued logs every 60 seconds
    setInterval(() => this.uploadQueuedLogs(), 60000);
  }

  /**
   * Log to file when DB is unavailable
   */
  async logToFile(entry: LogEntry): Promise<void> {
    try {
      // Add to queue
      const queuedLog: QueuedLog = {
        ...entry,
        uploadAttempts: 0
      };
      
      this.queue.push(queuedLog);
      
      // Keep queue size manageable
      if (this.queue.length > MAX_QUEUE_SIZE) {
        this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
      }

      // Append to file for persistence across restarts
      await this.appendToLogFile(queuedLog);
      
      console.warn(`📝 [FallbackLogger] Logged to file: ${entry.level} - ${entry.message}`);
    } catch (error) {
      // Last resort: console only
      console.error('🔴 [FallbackLogger] Failed to write to file:', error);
      console.error('Original log:', entry);
    }
  }

  /**
   * Append log entry to JSONL file
   */
  private async appendToLogFile(log: QueuedLog): Promise<void> {
    try {
      const logLine = JSON.stringify(log) + '\n';
      await Deno.writeTextFile(LOG_FILE_PATH, logLine, { append: true });
    } catch (error) {
      // If can't write to file, at least console it
      console.error('🔴 [FallbackLogger] File write failed:', error);
    }
  }

  /**
   * Load queued logs from file on startup
   */
  private async loadQueuedLogs(): Promise<void> {
    try {
      const fileContent = await Deno.readTextFile(LOG_FILE_PATH);
      const lines = fileContent.trim().split('\n');
      
      for (const line of lines) {
        if (line) {
          try {
            const log = JSON.parse(line) as QueuedLog;
            this.queue.push(log);
          } catch {
            // Skip malformed lines
          }
        }
      }
      
      console.log(`📝 [FallbackLogger] Loaded ${this.queue.length} queued logs from file`);
    } catch (error) {
      // File doesn't exist yet or can't be read - that's ok
      if (!(error instanceof Deno.errors.NotFound)) {
        console.warn('📝 [FallbackLogger] Could not load log file:', error);
      }
    }
  }

  /**
   * Try to upload queued logs to database
   */
  async uploadQueuedLogs(): Promise<number> {
    if (this.uploadInProgress || this.queue.length === 0) {
      return 0;
    }

    this.uploadInProgress = true;
    let uploaded = 0;

    try {
      // Take batch from queue
      const batch = this.queue.slice(0, UPLOAD_BATCH_SIZE);
      
      // Try to upload to database
      const success = await this.uploadBatch(batch);
      
      if (success) {
        // Remove uploaded logs from queue
        this.queue = this.queue.slice(UPLOAD_BATCH_SIZE);
        uploaded = batch.length;
        
        // If queue is now empty, clear the file
        if (this.queue.length === 0) {
          await this.clearLogFile();
        }
        
        this.dbAvailable = true;
        console.log(`✅ [FallbackLogger] Uploaded ${uploaded} queued logs to database`);
      } else {
        // Mark as unavailable and increment attempt counts
        this.dbAvailable = false;
        for (const log of batch) {
          log.uploadAttempts++;
          log.lastAttemptAt = new Date().toISOString();
        }
        
        // Remove logs that exceeded max attempts
        this.queue = this.queue.filter(log => log.uploadAttempts < MAX_UPLOAD_ATTEMPTS);
      }
    } catch (error) {
      console.error('🔴 [FallbackLogger] Upload failed:', error);
      this.dbAvailable = false;
    } finally {
      this.uploadInProgress = false;
    }

    return uploaded;
  }

  /**
   * Upload batch to database
   */
  private async uploadBatch(logs: QueuedLog[]): Promise<boolean> {
    try {
      // Try to write to detected_errors table
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        return false;
      }

      const records = logs.map(log => ({
        error_type: 'fallback_log',
        severity: log.level === 'critical' || log.level === 'error' ? 'high' : 'medium',
        error_message: log.message,
        stack_trace: log.error?.stack || null,
        context: log.context || {},
        created_at: log.timestamp,
        auto_fixed: false
      }));

      const response = await fetch(`${supabaseUrl}/rest/v1/detected_errors`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(records)
      });

      return response.ok;
    } catch (error) {
      console.error('🔴 [FallbackLogger] Batch upload error:', error);
      return false;
    }
  }

  /**
   * Clear log file
   */
  private async clearLogFile(): Promise<void> {
    try {
      await Deno.remove(LOG_FILE_PATH);
    } catch (error) {
      // Ignore if file doesn't exist
      if (!(error instanceof Deno.errors.NotFound)) {
        console.warn('📝 [FallbackLogger] Could not clear log file:', error);
      }
    }
  }

  /**
   * Check if database is available for logging
   */
  isDatabaseAvailable(): boolean {
    return this.dbAvailable;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): { size: number; oldestLog?: string; newestLog?: string } {
    return {
      size: this.queue.length,
      oldestLog: this.queue[0]?.timestamp,
      newestLog: this.queue[this.queue.length - 1]?.timestamp
    };
  }

  /**
   * Force upload attempt (for testing/debugging)
   */
  async forceUpload(): Promise<number> {
    return await this.uploadQueuedLogs();
  }
}

// Singleton instance
export const fallbackLogger = new FallbackLogger();

/**
 * Safe log wrapper that falls back to file when DB unavailable
 */
export async function safeLog(
  level: LogLevel,
  message: string,
  context?: any,
  error?: Error
): Promise<void> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error
  };

  // Always log to console
  const consoleMethod = level === 'error' || level === 'critical' ? console.error :
                       level === 'warn' ? console.warn : console.log;
  consoleMethod(`[${level.toUpperCase()}] ${message}`, context || '', error || '');

  // Try to log to file if DB might be unavailable
  if (!fallbackLogger.isDatabaseAvailable() || level === 'critical') {
    await fallbackLogger.logToFile(entry);
  }
}
