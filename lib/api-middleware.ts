import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, withRateLimit } from './rate-limit';
import { withValidation, addSecurityHeaders, ValidationSchemas } from './api-validation';
import { ZodSchema } from 'zod';

/**
 * API middleware configuration
 */
export interface ApiMiddlewareConfig {
  rateLimit?: boolean;
  validation?: {
    body?: ZodSchema<any>;
    query?: ZodSchema<any>;
  };
  cors?: boolean;
  security?: boolean;
  auth?: boolean;
}

/**
 * Default middleware configuration
 */
const DEFAULT_CONFIG: ApiMiddlewareConfig = {
  rateLimit: true,
  cors: true,
  security: true,
  auth: false,
};

/**
 * Handle CORS preflight requests
 */
function handleCorsPreflightRequest(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return addSecurityHeaders(response);
  }
  return null;
}

/**
 * Apply authentication middleware
 */
async function applyAuthMiddleware(request: NextRequest): Promise<NextResponse | null> {
  // This would integrate with NextAuth.js or your authentication system
  // For now, we'll just check for a simple API key in development
  
  if (process.env.NODE_ENV === 'development') {
    return null; // Skip auth in development
  }
  
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  
  // Check for API key or Bearer token
  if (!authHeader && !apiKey) {
    return NextResponse.json(
      { error: 'Authentication required', message: 'Missing authorization header or API key' },
      { status: 401 }
    );
  }
  
  // Validate API key if provided
  if (apiKey && process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return NextResponse.json(
      { error: 'Invalid API key', message: 'The provided API key is invalid' },
      { status: 401 }
    );
  }
  
  // For JWT tokens, you would validate them here
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Validate JWT token with your auth provider
    // This is a placeholder implementation
    if (!token || token === 'invalid') {
      return NextResponse.json(
        { error: 'Invalid token', message: 'The provided token is invalid or expired' },
        { status: 401 }
      );
    }
  }
  
  return null;
}

/**
 * Create API middleware with configuration
 */
export function createApiMiddleware(config: ApiMiddlewareConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return function middleware<T extends (...args: any[]) => any>(handler: T): T {
    return (async (request: NextRequest, ...args: any[]) => {
      try {
        // Handle CORS preflight
        if (finalConfig.cors) {
          const corsResponse = handleCorsPreflightRequest(request);
          if (corsResponse) return corsResponse;
        }
        
        // Apply rate limiting
        if (finalConfig.rateLimit) {
          const rateLimitResponse = await applyRateLimit(request);
          if (rateLimitResponse) return rateLimitResponse;
        }
        
        // Apply authentication
        if (finalConfig.auth) {
          const authResponse = await applyAuthMiddleware(request);
          if (authResponse) return authResponse;
        }
        
        // Apply validation
        if (finalConfig.validation) {
          const validatedHandler = withValidation(
            handler,
            finalConfig.validation.body,
            finalConfig.validation.query
          );
          return validatedHandler(request, ...args);
        }
        
        // Execute the handler
        const response = await handler(request, ...args);
        
        // Apply security headers
        if (finalConfig.security && response instanceof NextResponse) {
          return addSecurityHeaders(response);
        }
        
        return response;
      } catch (error) {
        console.error('API middleware error:', error);
        
        const errorResponse = NextResponse.json(
          {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
            ...(process.env.NODE_ENV === 'development' && { 
              details: error instanceof Error ? error.message : String(error) 
            })
          },
          { status: 500 }
        );
        
        return finalConfig.security ? addSecurityHeaders(errorResponse) : errorResponse;
      }
    }) as T;
  };
}

/**
 * Preset middleware configurations for common use cases
 */
export const ApiMiddleware = {
  /**
   * Full middleware with rate limiting, validation, CORS, and security
   */
  full: (bodySchema?: ZodSchema<any>, querySchema?: ZodSchema<any>) =>
    createApiMiddleware({
      rateLimit: true,
      validation: { body: bodySchema, query: querySchema },
      cors: true,
      security: true,
      auth: false,
    }),
  
  /**
   * Secure middleware with authentication
   */
  secure: (bodySchema?: ZodSchema<any>, querySchema?: ZodSchema<any>) =>
    createApiMiddleware({
      rateLimit: true,
      validation: { body: bodySchema, query: querySchema },
      cors: true,
      security: true,
      auth: true,
    }),
  
  /**
   * Basic middleware with just validation and security
   */
  basic: (bodySchema?: ZodSchema<any>, querySchema?: ZodSchema<any>) =>
    createApiMiddleware({
      rateLimit: false,
      validation: { body: bodySchema, query: querySchema },
      cors: true,
      security: true,
      auth: false,
    }),
  
  /**
   * Public middleware with rate limiting and CORS only
   */
  public: createApiMiddleware({
    rateLimit: true,
    cors: true,
    security: true,
    auth: false,
  }),
  
  /**
   * Development middleware with minimal restrictions
   */
  dev: createApiMiddleware({
    rateLimit: false,
    cors: true,
    security: true,
    auth: false,
  }),
};

/**
 * Utility functions for common API patterns
 */
export const ApiUtils = {
  /**
   * Create a standardized API response
   */
  createResponse<T>(
    data: T,
    options: {
      status?: number;
      message?: string;
      metadata?: Record<string, any>;
    } = {}
  ): NextResponse {
    const { status = 200, message, metadata } = options;
    
    return NextResponse.json(
      {
        success: true,
        data,
        ...(message && { message }),
        ...(metadata && { metadata }),
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  },
  
  /**
   * Create a standardized error response
   */
  createErrorResponse(
    error: string,
    options: {
      status?: number;
      message?: string;
      details?: any;
    } = {}
  ): NextResponse {
    const { status = 400, message, details } = options;
    
    return NextResponse.json(
      {
        success: false,
        error,
        ...(message && { message }),
        ...(details && { details }),
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  },
  
  /**
   * Extract pagination from request
   */
  extractPagination(request: NextRequest): {
    page: number;
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
  } {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    const sortBy = url.searchParams.get('sortBy') || undefined;
    const sortOrder = (url.searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
    
    return {
      page,
      limit,
      offset: (page - 1) * limit,
      sortBy,
      sortOrder,
    };
  },
  
  /**
   * Create pagination metadata
   */
  createPaginationMetadata(
    page: number,
    limit: number,
    total: number
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  },
};

/**
 * Enhanced middleware with specific configurations for different endpoint types
 */
export const EndpointMiddleware = {
  // Research endpoints
  research: {
    nodes: ApiMiddleware.full(undefined, ValidationSchemas.search.query),
    outline: ApiMiddleware.full(ValidationSchemas.outline.body),
    conflicts: ApiMiddleware.full(ValidationSchemas.outline.body),
    summarize: ApiMiddleware.full(ValidationSchemas.outline.body),
    drillDown: ApiMiddleware.full(ValidationSchemas.outline.body),
    import: ApiMiddleware.full(ValidationSchemas.upload.body),
  },
  
  // Chat endpoints
  chat: ApiMiddleware.full(ValidationSchemas.chat.body),
  
  // Project management endpoints
  projects: {
    list: ApiMiddleware.full(undefined, ValidationSchemas.search.query),
    create: ApiMiddleware.full(ValidationSchemas.project.body),
    update: ApiMiddleware.full(ValidationSchemas.project.body),
    delete: ApiMiddleware.full(),
  },
  
  // Public endpoints
  public: ApiMiddleware.public,
  
  // Development endpoints
  dev: ApiMiddleware.dev,
};

export default ApiMiddleware;
