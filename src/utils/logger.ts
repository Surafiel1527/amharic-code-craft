/**
 * Enterprise Frontend Logger
 * Aligned with backend logger structure
 * Provides structured, level-based logging with context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  userId?: string;
  projectId?: string;
  conversationId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};
  private minLevel: LogLevel = 'info';
  private isDevelopment = import.meta.env.DEV;

  constructor(context?: LogContext) {
    if (context) {
      this.context = context;
    }
    
    // In production, set minimum level to 'warn'
    if (!this.isDevelopment) {
      this.minLevel = 'warn';
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
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🔴'
    }[level];

    const timestamp = new Date().toISOString();
    const fullContext = { ...this.context, ...context };
    const contextStr = Object.keys(fullContext).length > 0 
      ? ` [${Object.entries(fullContext).map(([k, v]) => `${k}=${v}`).join(', ')}]` 
      : '';
    
    return `${emoji} [${timestamp}] ${level.toUpperCase()}${contextStr}: ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, context);

    // Console output in development
    if (this.isDevelopment) {
      const logFn = level === 'error' || level === 'critical' ? console.error : 
                    level === 'warn' ? console.warn : console.log;
      
      if (error) {
        logFn(formatted, error);
      } else {
        logFn(formatted);
      }
    }

    // In production, send critical errors to monitoring service
    if (!this.isDevelopment && (level === 'error' || level === 'critical')) {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      this.sendToMonitoring(level, message, context, error);
    }
  }

  private async sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): Promise<void> {
    try {
      // This will be implemented when error monitoring is set up
      // For now, we'll use the unified-monitoring endpoint
      const response = await fetch('/api/monitoring/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          context: { ...this.context, ...context },
          error: error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : undefined,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        // Silently fail - don't let monitoring break the app
        console.warn('Failed to send log to monitoring');
      }
    } catch (err) {
      // Silently fail
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

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  // Performance timing helper
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory function for component-specific loggers
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}
