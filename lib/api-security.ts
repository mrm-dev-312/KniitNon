import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const defaultRateLimit: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
};

const apiRateLimits: Record<string, RateLimitConfig> = {
  '/api/chat': {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  '/api/research/': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50, // 50 requests per 5 minutes
  },
  '/api/projects': {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
  },
};

function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [route, config] of Object.entries(apiRateLimits)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }
  return defaultRateLimit;
}

function isRateLimited(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now - userLimit.lastReset > config.windowMs) {
    // Reset the counter
    rateLimitMap.set(identifier, { count: 1, lastReset: now });
    return false;
  }

  if (userLimit.count >= config.maxRequests) {
    return true;
  }

  // Increment the counter
  userLimit.count++;
  return false;
}

export function withSecurity(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const pathname = req.nextUrl.pathname;

    // CORS headers
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Rate limiting
    const identifier = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
    const config = getRateLimitConfig(pathname);
    
    if (isRateLimited(identifier, config)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.windowMs / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(config.windowMs / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString(),
          }
        }
      );
    }

    try {
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export async function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return withSecurity(async (req: NextRequest): Promise<NextResponse> => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return await handler(req);
  });
}

// Helper function to validate request body with Zod
export function withValidation<T>(
  schema: any,
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const body = await req.json();
      const validatedData = schema.parse(body);
      return await handler(req, validatedData);
    } catch (error) {
      if (error instanceof Error && 'errors' in error) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid request data',
            details: (error as any).errors
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }
  };
}
