interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore[identifier];

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetTime: record.resetTime,
  };
}

export function getRateLimitHeaders(identifier: string) {
  const result = checkRateLimit(identifier);
  const retryAfter = result.allowed ? 0 : Math.ceil((result.resetTime - Date.now()) / 1000);
  
  return {
    "X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    ...(retryAfter > 0 ? { "Retry-After": retryAfter.toString() } : {}),
  };
}
