import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Common validation schemas for API endpoints
 */

// Node validation
export const NodeSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().optional(),
  type: z.enum(['topic', 'subtopic', 'detail']),
  parentId: z.string().optional(),
  metadata: z.object({
    source: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    relationships: z.array(z.string()).optional(),
  }).optional(),
});

// Detail level validation
export const DetailLevelSchema = z.enum(['low', 'medium', 'high']);

// Pagination validation
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Search/filter validation
export const SearchFilterSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['topic', 'subtopic', 'detail']).optional(),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// Outline request validation
export const OutlineRequestSchema = z.object({
  nodeIds: z.array(z.string().min(1)).min(1, 'At least one node ID required').max(50, 'Too many nodes'),
  detailLevel: DetailLevelSchema,
  includeMetadata: z.boolean().default(false),
  includeRelationships: z.boolean().default(true),
});

// Project validation
export const ProjectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  nodes: z.array(NodeSchema).optional(),
  metadata: z.object({
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    version: z.string().optional(),
  }).optional(),
});

// Chat message validation
export const ChatMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
  context: z.object({
    selectedNodes: z.array(z.string()).optional(),
    currentProject: z.string().optional(),
  }).optional(),
});

// File upload validation
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  type: z.string().refine(
    (type) => ['text/plain', 'application/pdf', 'text/markdown', 'application/json'].includes(type),
    'Unsupported file type'
  ),
  content: z.string().optional(),
});

/**
 * Validation result types
 */
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    message: string;
    details: ZodError['issues'];
  };
};

/**
 * Validate request body against a schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          details: result.error.issues
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Invalid JSON in request body',
        details: []
      }
    };
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    const result = schema.safeParse(params);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: {
          message: 'Invalid query parameters',
          details: result.error.issues
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Failed to parse query parameters',
        details: []
      }
    };
  }
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  validation: ValidationResult<any>
): NextResponse {
  if (validation.success) {
    throw new Error('Cannot create error response for successful validation');
  }
  
  return NextResponse.json(
    {
      error: 'Validation Error',
      message: validation.error.message,
      details: validation.error.details.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    },
    { status: 400 }
  );
}

/**
 * Middleware wrapper for request validation
 */
export function withValidation<T extends (...args: any[]) => any>(
  handler: T,
  bodySchema?: ZodSchema<any>,
  querySchema?: ZodSchema<any>
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    // Validate query parameters if schema provided
    if (querySchema) {
      const queryValidation = validateQueryParams(request, querySchema);
      if (!queryValidation.success) {
        return createValidationErrorResponse(queryValidation);
      }
      // Attach validated query params to request
      (request as any).validatedQuery = queryValidation.data;
    }
    
    // Validate body if schema provided
    if (bodySchema) {
      const bodyValidation = await validateRequestBody(request, bodySchema);
      if (!bodyValidation.success) {
        return createValidationErrorResponse(bodyValidation);
      }
      // Attach validated body to request
      (request as any).validatedBody = bodyValidation.data;
    }
    
    return handler(request, ...args);
  }) as T;
}

/**
 * Common validation schemas for different endpoint types
 */
export const ValidationSchemas = {
  // Outline generation endpoints
  outline: { body: OutlineRequestSchema },
  
  // Node management endpoints
  nodes: { body: z.array(NodeSchema) },
  
  // Project management endpoints
  project: { body: ProjectSchema },
  
  // Chat endpoints
  chat: { body: ChatMessageSchema },
  
  // Search endpoints with pagination
  search: { query: PaginationSchema.merge(SearchFilterSchema) },
  
  // File upload endpoints
  upload: { body: FileUploadSchema },
} as const;

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validate and sanitize text content
 */
export function validateAndSanitizeText(
  text: string,
  maxLength: number = 10000
): { isValid: boolean; sanitized: string; error?: string } {
  if (!text || typeof text !== 'string') {
    return { isValid: false, sanitized: '', error: 'Text must be a non-empty string' };
  }
  
  if (text.length > maxLength) {
    return { isValid: false, sanitized: text, error: `Text exceeds maximum length of ${maxLength} characters` };
  }
  
  const sanitized = sanitizeInput(text);
  
  return { isValid: true, sanitized };
}

/**
 * Rate limiting and security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // API-specific headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  
  return response;
}
