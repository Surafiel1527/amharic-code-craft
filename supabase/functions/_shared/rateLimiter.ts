/**
 * RATE LIMITER
 * Token bucket algorithm for rate limiting
 */

import { logger } from './logger.ts';

interface RateLimitConfig {
  tokensPerInterval: number;
  interval: number; // milliseconds
  maxTokens: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

/**
 * Check if request is allowed under rate limit
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: config.maxTokens - 1,
      lastRefill: now
    };
    buckets.set(key, bucket);
    return { allowed: true };
  }

  // Refill tokens based on time elapsed
  const timeSinceRefill = now - bucket.lastRefill;
  const tokensToAdd = (timeSinceRefill / config.interval) * config.tokensPerInterval;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  // Calculate retry-after in seconds
  const tokensNeeded = 1 - bucket.tokens;
  const retryAfter = Math.ceil((tokensNeeded / config.tokensPerInterval) * (config.interval / 1000));

  logger.warn('Rate limit exceeded', { key, retryAfter });

  return { 
    allowed: false, 
    retryAfter 
  };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
  logger.info('Rate limit reset', { key });
}

/**
 * Clean up old buckets (call periodically)
 */
export function cleanupOldBuckets(maxAge: number = 3600000): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info('Cleaned up old rate limit buckets', { count: cleaned });
  }
}
