import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration per endpoint
const RATE_LIMITS = {
  '/api/chat': { requests: 50, window: '1 h' }, // Chat API - high frequency
  '/api/research/nodes': { requests: 100, window: '1 h' }, // Node fetching
  '/api/research/outline': { requests: 20, window: '1 h' }, // Outline generation
  '/api/research/summarize': { requests: 30, window: '1 h' }, // Summarization
  '/api/research/conflicts': { requests: 50, window: '1 h' }, // Conflict analysis
  '/api/research/drill-down': { requests: 50, window: '1 h' }, // Drill down
  '/api/research/import': { requests: 10, window: '1 h' }, // File import
  '/api/projects': { requests: 100, window: '1 h' }, // Project management
  default: { requests: 60, window: '1 h' } // Default rate limit
} as const;

// In-memory rate limiting for development/simple deployment
const inMemoryRateLimit = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  inMemoryRateLimit.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => inMemoryRateLimit.delete(key));
}, 60000); // Clean up every minute

/**
 * In-memory rate limiting fallback for development
 */
function checkInMemoryRateLimit(
  identifier: string, 
  limit: number, 
  windowMs: number
): { success: boolean; limit: number; remaining: number; reset: Date } {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / windowMs)}`;
  
  const current = inMemoryRateLimit.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > current.resetTime) {
    // Reset window
    current.count = 0;
    current.resetTime = now + windowMs;
  }
  
  const success = current.count < limit;
  if (success) {
    current.count++;
    inMemoryRateLimit.set(key, current);
  }
  
  return {
    success,
    limit,
    remaining: Math.max(0, limit - current.count),
    reset: new Date(current.resetTime)
  };
}

/**
 * Parse rate limit window string to milliseconds
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 3600000; // Default 1 hour
  
  const [, amount, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(amount) * multipliers[unit as keyof typeof multipliers];
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get authenticated user ID first
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT or session token
    // This would be implementation-specific
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
    request.headers.get('x-real-ip') || 
    request.ip || 
    'unknown';
  
  return `ip:${ip}`;
}

/**
 * Get rate limit configuration for a given path
 */
function getRateLimit(pathname: string) {
  // Find the most specific match
  const matches = Object.entries(RATE_LIMITS)
    .filter(([path]) => path !== 'default' && pathname.startsWith(path))
    .sort((a, b) => b[0].length - a[0].length); // Sort by specificity
  
  return matches.length > 0 ? matches[0][1] : RATE_LIMITS.default;
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  
  // Skip rate limiting for certain paths
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/static') || 
      pathname === '/favicon.ico') {
    return null;
  }
  
  const config = getRateLimit(pathname);
  const identifier = getClientIdentifier(request);
  const windowMs = parseWindow(config.window);
  
  let result;
  
  // Use in-memory rate limiting
  result = checkInMemoryRateLimit(identifier, config.requests, windowMs);
  
  // Add rate limit headers
  const response = result.success ? null : new NextResponse(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${config.requests} per ${config.window}`,
      retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000)
    }),
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': config.requests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toISOString(),
        'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()
      }
    }
  );
  
  // Add rate limit headers to successful responses too
  if (!response && result.success) {
    // We'll add this in the middleware
    (request as any).__rateLimitHeaders = {
      'X-RateLimit-Limit': config.requests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toISOString()
    };
  }
  
  return response;
}

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit<T extends (...args: any[]) => any>(handler: T): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const rateLimitResponse = await applyRateLimit(request);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    const response = await handler(request, ...args);
    
    // Add rate limit headers to successful responses
    const headers = (request as any).__rateLimitHeaders;
    if (headers && response instanceof NextResponse) {
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
    }
    
    return response;
  }) as T;
}
