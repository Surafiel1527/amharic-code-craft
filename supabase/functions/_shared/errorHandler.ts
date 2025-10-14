/**
 * ENTERPRISE ERROR HANDLING
 * Type-safe error handling with proper classification
 */

import { logger } from './logger.ts';

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  statusCode: number;
  details?: Record<string, any>;
  retryable: boolean;
  originalError?: Error;
}

export class ValidationError extends Error implements AppError {
  type = ErrorType.VALIDATION;
  statusCode = 400;
  retryable = false;
  details?: Record<string, any>;
  originalError?: Error;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements AppError {
  type = ErrorType.AUTHENTICATION;
  statusCode = 401;
  retryable = false;
  originalError?: Error;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  type = ErrorType.AUTHORIZATION;
  statusCode = 403;
  retryable = false;
  originalError?: Error;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends Error implements AppError {
  type = ErrorType.RATE_LIMIT;
  statusCode = 429;
  retryable = true;
  retryAfter?: number;
  originalError?: Error;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class TimeoutError extends Error implements AppError {
  type = ErrorType.TIMEOUT;
  statusCode = 408;
  retryable = true;
  originalError?: Error;

  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Classify unknown errors into typed errors
 */
export function classifyError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: ErrorType.NETWORK,
        message: 'Network error occurred',
        statusCode: 503,
        retryable: true,
        originalError: error
      };
    }

    // Database errors
    if (error.message.includes('database') || error.message.includes('postgres')) {
      return {
        type: ErrorType.DATABASE,
        message: 'Database error occurred',
        statusCode: 500,
        retryable: false,
        originalError: error
      };
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return {
        type: ErrorType.TIMEOUT,
        message: 'Operation timed out',
        statusCode: 408,
        retryable: true,
        originalError: error
      };
    }

    // Generic error
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      statusCode: 500,
      retryable: false,
      originalError: error
    };
  }

  // Non-error object
  return {
    type: ErrorType.UNKNOWN,
    message: String(error),
    statusCode: 500,
    retryable: false
  };
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'statusCode' in error &&
    'retryable' in error
  );
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: AppError) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    onRetry
  } = options;

  let lastError: AppError | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const appError = classifyError(error);
      lastError = appError;

      if (!appError.retryable || attempt === maxAttempts) {
        logger.error(
          `Operation failed after ${attempt} attempts`,
          appError.originalError,
          { attempt, errorType: appError.type }
        );
        throw appError;
      }

      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      logger.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms`,
        { attempt, delay, errorType: appError.type }
      );

      if (onRetry) {
        onRetry(attempt, appError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wrap async function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}
