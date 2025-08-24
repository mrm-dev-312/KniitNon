// Research Pipeline v2 API Middleware
// Provides feature flag validation and access control for pipeline endpoints

import { NextRequest, NextResponse } from 'next/server';
import { 
  isResearchPipelineV2Enabled,
  isFeatureEnabled,
  getFeatureFlags 
} from '@/lib/research-engine/core/feature-flags';
import { 
  createErrorResponse, 
  API_ERROR_CODES 
} from '@/lib/research-engine/api/types';

/**
 * Core middleware configuration
 */
export interface MiddlewareConfig {
  /** Required feature flags for this endpoint */
  requiredFeatures?: string[];
  /** Whether to check pipeline v2 access */
  requirePipelineV2?: boolean;
  /** Custom validation function */
  customValidator?: (request: NextRequest) => Promise<boolean>;
  /** Rate limiting configuration */
  rateLimiting?: {
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (request: NextRequest) => string;
  };
}

/**
 * Request context enhanced with middleware information
 */
export interface EnhancedRequest extends NextRequest {
  pipelineContext?: {
    featureFlags: ReturnType<typeof getFeatureFlags>;
    requestId: string;
    timestamp: string;
  };
}

/**
 * Main middleware function for Research Pipeline v2 endpoints
 */
export function withPipelineMiddleware(
  handler: (request: EnhancedRequest, context: any) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
) {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    const startTime = performance.now();
    const requestId = generateRequestId();
    
    try {
      // Core pipeline v2 check
      if (config.requirePipelineV2 !== false) {
        if (!isResearchPipelineV2Enabled()) {
          return NextResponse.json(
            createErrorResponse(
              API_ERROR_CODES.FEATURE_DISABLED,
              'Research Pipeline v2 is not enabled. Set RESEARCH_PIPELINE_V2=true to enable.',
              { requestId }
            ),
            { status: 403 }
          );
        }
      }

      // Required feature flags check
      if (config.requiredFeatures && config.requiredFeatures.length > 0) {
        const missingFeatures = config.requiredFeatures.filter(
          feature => {
            // Type-safe feature flag checking
            if (feature === 'CORPUS_SOURCE_ADAPTERS') {
              return !isFeatureEnabled('CORPUS_SOURCE_ADAPTERS');
            }
            if (feature === 'ADVANCED_DEDUPLICATION') {
              return !isFeatureEnabled('ADVANCED_DEDUPLICATION');
            }
            if (feature === 'STAGE_PROMPT_CHAINS') {
              return !isFeatureEnabled('STAGE_PROMPT_CHAINS');
            }
            if (feature === 'ARTIFACT_EXPORTS') {
              return !isFeatureEnabled('ARTIFACT_EXPORTS');
            }
            // Default to disabled for unknown features
            return true;
          }
        );
        
        if (missingFeatures.length > 0) {
          return NextResponse.json(
            createErrorResponse(
              API_ERROR_CODES.FEATURE_DISABLED,
              `Required features are not enabled: ${missingFeatures.join(', ')}`,
              { requestId, missingFeatures }
            ),
            { status: 403 }
          );
        }
      }

      // Custom validation
      if (config.customValidator) {
        const isValid = await config.customValidator(request);
        if (!isValid) {
          return NextResponse.json(
            createErrorResponse(
              API_ERROR_CODES.UNAUTHORIZED,
              'Custom validation failed',
              { requestId }
            ),
            { status: 401 }
          );
        }
      }

      // Rate limiting
      if (config.rateLimiting) {
        const rateLimitResult = await applyRateLimit(request, config.rateLimiting);
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            createErrorResponse(
              API_ERROR_CODES.INTERNAL_ERROR, // Could add RATE_LIMIT_EXCEEDED
              `Rate limit exceeded. Try again in ${rateLimitResult.resetTime}ms`,
              { 
                requestId,
                rateLimitInfo: rateLimitResult
              }
            ),
            { status: 429 }
          );
        }
      }

      // Enhance request with context
      const enhancedRequest = request as EnhancedRequest;
      enhancedRequest.pipelineContext = {
        featureFlags: getFeatureFlags(),
        requestId,
        timestamp: new Date().toISOString(),
      };

      // Execute handler
      const response = await handler(enhancedRequest, context);
      
      // Add performance headers
      const executionTime = performance.now() - startTime;
      response.headers.set('X-Pipeline-Request-ID', requestId);
      response.headers.set('X-Pipeline-Execution-Time', `${executionTime.toFixed(2)}ms`);
      response.headers.set('X-Pipeline-Version', 'v2');

      return response;

    } catch (error) {
      console.error(`Pipeline middleware error [${requestId}]:`, error);
      
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INTERNAL_ERROR,
          'Internal middleware error',
          { 
            requestId,
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
          }
        ),
        { status: 500 }
      );
    }
  };
}

/**
 * Specific middleware for stage execution endpoints
 */
export function withStageExecutionMiddleware(
  handler: (request: EnhancedRequest, context: any) => Promise<NextResponse>
) {
  return withPipelineMiddleware(handler, {
    requirePipelineV2: true,
    requiredFeatures: [], // Stage-specific features checked in handlers
    rateLimiting: {
      maxRequests: 10,
      windowMs: 60000, // 1 minute window
      keyGenerator: (req) => getClientIdentifier(req),
    },
  });
}

/**
 * Specific middleware for artifact management endpoints
 */
export function withArtifactMiddleware(
  handler: (request: EnhancedRequest, context: any) => Promise<NextResponse>
) {
  return withPipelineMiddleware(handler, {
    requirePipelineV2: true,
    rateLimiting: {
      maxRequests: 50,
      windowMs: 60000, // 1 minute window
    },
  });
}

/**
 * Specific middleware for progress monitoring endpoints
 */
export function withProgressMiddleware(
  handler: (request: EnhancedRequest, context: any) => Promise<NextResponse>
) {
  return withPipelineMiddleware(handler, {
    requirePipelineV2: true,
    rateLimiting: {
      maxRequests: 100,
      windowMs: 60000, // 1 minute window
    },
  });
}

/**
 * Rate limiting implementation
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

async function applyRateLimit(
  request: NextRequest, 
  config: NonNullable<MiddlewareConfig['rateLimiting']>
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}> {
  const key = config.keyGenerator ? 
    config.keyGenerator(request) : 
    getClientIdentifier(request);
    
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Clean up old entries
  cleanupRateLimitStore(windowStart);
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: config.windowMs,
      total: config.maxRequests,
    };
  } else {
    // Update existing window
    entry.count++;
    
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetTime = entry.resetTime - now;
    
    return {
      allowed,
      remaining,
      resetTime,
      total: config.maxRequests,
    };
  }
}

/**
 * Helper functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getClientIdentifier(request: NextRequest): string {
  // In production, use more sophisticated client identification
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
    request.headers.get('x-real-ip') || 'unknown';
  
  return `client_${ip}`;
}

function cleanupRateLimitStore(cutoffTime: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < cutoffTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Validation helpers
 */
export function validateStageNumber(stage: string): number | null {
  const stageNum = parseInt(stage);
  if (isNaN(stageNum) || stageNum < 0 || stageNum > 5) {
    return null;
  }
  return stageNum;
}

export function validateRequiredFields(
  data: any, 
  fields: string[]
): string[] {
  const missing: string[] = [];
  
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Error response helpers
 */
export function createValidationErrorResponse(
  message: string,
  details?: any
): NextResponse {
  return NextResponse.json(
    createErrorResponse(
      API_ERROR_CODES.INVALID_REQUEST,
      message,
      details
    ),
    { status: 400 }
  );
}

export function createFeatureDisabledResponse(
  feature: string,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    createErrorResponse(
      API_ERROR_CODES.FEATURE_DISABLED,
      `Feature not enabled: ${feature}`,
      { requestId, feature }
    ),
    { status: 403 }
  );
}
