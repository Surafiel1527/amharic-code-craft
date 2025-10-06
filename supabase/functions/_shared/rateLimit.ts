import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // Increased to 60 per minute
const MAX_REQUESTS_PER_HOUR = 1000; // 1000 per hour

export async function checkRateLimit(
  identifier: string,
  supabaseClient?: any
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const record = rateLimitStore[identifier];

  // Check in-memory rate limit
  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    
    // Log to database if client provided
    if (supabaseClient) {
      await logRateLimit(supabaseClient, identifier, 1, false);
    }
    
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    // Log blocked request
    if (supabaseClient) {
      await logRateLimit(supabaseClient, identifier, record.count, true);
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  
  // Log to database
  if (supabaseClient) {
    await logRateLimit(supabaseClient, identifier, record.count, false);
  }
  
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetTime: record.resetTime,
  };
}

async function logRateLimit(
  supabaseClient: any,
  identifier: string,
  count: number,
  blocked: boolean
) {
  try {
    const windowStart = new Date();
    const windowEnd = new Date(windowStart.getTime() + RATE_LIMIT_WINDOW);
    
    // Extract user_id and endpoint from identifier
    const [userId, endpoint] = identifier.split(':');
    
    await supabaseClient.from('rate_limit_logs').insert({
      user_id: userId !== 'anonymous' ? userId : null,
      endpoint: endpoint || identifier,
      requests_count: count,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      blocked
    });
  } catch (error) {
    // Don't fail the rate limit check if logging fails
    console.error('Failed to log rate limit:', error);
  }
}

export async function getRateLimitHeaders(identifier: string, supabaseClient?: any) {
  const result = await checkRateLimit(identifier, supabaseClient);
  const retryAfter = result.allowed ? 0 : Math.ceil((result.resetTime - Date.now()) / 1000);
  
  return {
    "X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    ...(retryAfter > 0 ? { "Retry-After": retryAfter.toString() } : {}),
  };
}
