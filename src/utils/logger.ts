/**
 * Production-ready logger utility
 * Replaces all console.log/error/warn statements
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
      success: '✅'
    };

    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    
    return `${emoji[level]} [${timestamp}] ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      // Keep console in dev for debugging
      console.log(this.formatMessage('info', message, context));
    }
  }

  success(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('success', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    };

    if (this.isDevelopment) {
      console.error(this.formatMessage('error', message, errorContext));
    }

    // In production, send to error tracking service
    // This could integrate with Sentry, LogRocket, etc.
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context));
    }
  }
}

export const logger = new Logger();
