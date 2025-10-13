/**
 * Enterprise Logging System
 * Structured, level-based logging with context and persistence
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  userId?: string;
  projectId?: string;
  conversationId?: string;
  jobId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  duration?: number;
}

class Logger {
  private context: LogContext = {};
  private minLevel: LogLevel = 'info';

  constructor(context?: LogContext) {
    if (context) {
      this.context = context;
    }
    
    // Set log level from environment
    const envLevel = Deno.env.get('LOG_LEVEL')?.toLowerCase() as LogLevel;
    if (envLevel) {
      this.minLevel = envLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const emoji = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🔴'
    }[level];

    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
    return `${emoji} ${level.toUpperCase()}${contextStr}: ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const fullContext = { ...this.context, ...context };
    const formatted = this.formatMessage(level, message, fullContext);

    // Console output
    const logFn = level === 'error' || level === 'critical' ? console.error : 
                  level === 'warn' ? console.warn : console.log;
    
    if (error) {
      logFn(formatted, error);
    } else {
      logFn(formatted);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  critical(message: string, context?: LogContext, error?: Error): void {
    this.log('critical', message, context, error);
  }

  // Performance timing helper
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory function
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}
