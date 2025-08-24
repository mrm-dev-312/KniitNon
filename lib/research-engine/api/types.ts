// Research Pipeline API Types
// TypeScript definitions for Research Engine v2 API endpoints

import { StageNumber, GateEvaluationResult } from '../core/types';
import { 
  SourceRecord, 
  SearchString, 
  LibraryCollection, 
  SourceLogEntry 
} from '../domain/stage1';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    featureFlags?: Record<string, boolean>;
  };
}

/**
 * Pipeline stage execution request
 */
export interface StageExecutionRequest {
  /** Context data for stage execution */
  context?: Record<string, any>;
  /** Configuration overrides */
  config?: {
    timeout?: number;
    retryCount?: number;
    validateSchema?: boolean;
  };
  /** Force re-execution even if cached results exist */
  forceRefresh?: boolean;
}

/**
 * Pipeline stage execution response
 */
export interface StageExecutionResponse {
  /** Stage number that was executed */
  stage: StageNumber;
  /** Execution status */
  status: 'completed' | 'failed' | 'partial' | 'timeout';
  /** Generated artifacts */
  artifacts: Array<{
    id: string;
    schemaId: string;
    data: any;
    timestamp: string;
  }>;
  /** Gate evaluation results */
  gateResult: GateEvaluationResult;
  /** Execution metrics */
  metrics: {
    executionTime: number;
    promptCount: number;
    errorCount: number;
    artifactCount: number;
  };
  /** Any errors or warnings */
  issues?: Array<{
    type: 'error' | 'warning';
    message: string;
    source?: string;
  }>;
}

/**
 * Progress tracking request
 */
export interface ProgressRequest {
  /** Action to perform */
  action: 'start' | 'update' | 'complete' | 'fail';
  /** Execution ID for tracking */
  executionId?: string;
  /** Stage being executed */
  stage?: StageNumber;
  /** Current progress percentage (0-100) */
  progress?: number;
  /** Current step description */
  currentStep?: string;
  /** Total number of steps */
  totalSteps?: number;
  /** Estimated completion time */
  estimatedCompletion?: string;
  /** Execution metrics */
  metrics?: {
    promptsExecuted?: number;
    artifactsGenerated?: number;
    errorsEncountered?: number;
  };
  /** Include detailed metrics in response */
  includeMetrics?: boolean;
  /** Include gate evaluation details */
  includeGates?: boolean;
  /** Include artifact summaries */
  includeArtifacts?: boolean;
}

/**
 * Progress tracking response
 */
export interface ProgressResponse {
  /** Progress entries */
  progressEntries?: Array<{
    id: string;
    stage: StageNumber;
    status: 'running' | 'completed' | 'failed' | 'paused';
    startTime: string;
    endTime?: string;
    progress: number;
    currentStep?: string;
    totalSteps?: number;
    estimatedCompletion?: string;
    lastUpdate: string;
  }>;
  /** Total active executions */
  totalActive?: number;
  /** Response timestamp */
  timestamp: string;
  /** Current pipeline state (legacy) */
  currentStage?: StageNumber;
  /** Overall completion percentage (legacy) */
  overallProgress?: number;
  /** Progress per stage (legacy) */
  stageProgress?: Array<{
    stage: StageNumber;
    status: 'not-started' | 'in-progress' | 'completed' | 'failed';
    progress: number; // 0-100
    gatesPassed: boolean;
    lastUpdated: string;
  }>;
  /** Gate evaluation summaries */
  gates?: Array<GateEvaluationResult>;
  /** Key metrics summary */
  metrics?: {
    totalArtifacts: number;
    totalSources: number;
    qualityScore: number;
    avgExecutionTime: number;
  };
  /** Blocking issues preventing advancement */
  blockingIssues?: Array<{
    stage: StageNumber;
    issue: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Artifact save request
 */
export interface ArtifactSaveRequest {
  /** Stage the artifact belongs to */
  stage: StageNumber;
  /** Schema identifier for validation */
  schemaId: string;
  /** Artifact data payload */
  data: any;
  /** Optional metadata */
  metadata?: {
    source?: string;
    version?: string;
    tags?: string[];
  };
}

/**
 * Artifact retrieval request
 */
export interface ArtifactRetrievalRequest {
  /** Stage to retrieve from */
  stage?: StageNumber;
  /** Specific schema types to retrieve */
  schemaIds?: string[];
  /** Include artifact metadata */
  includeMetadata?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Artifact retrieval response
 */
export interface ArtifactRetrievalResponse {
  artifacts: Array<{
    id: string;
    stage: StageNumber;
    schemaId: string;
    data: any;
    createdAt: string;
    updatedAt: string;
    metadata?: any;
  }>;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Stage 1 specific request types
 */
export interface Stage1ExecutionRequest extends StageExecutionRequest {
  /** Search strings to execute */
  searchStrings?: SearchString[];
  /** Corpus building configuration */
  corpusConfig?: {
    maxSourcesPerSearch?: number;
    minPriority?: 'A' | 'B' | 'C';
    yearRange?: [number, number];
    includePreprints?: boolean;
    adapters?: string[];
  };
}

/**
 * Stage 1 specific response types
 */
export interface Stage1ExecutionResponse extends StageExecutionResponse {
  /** Corpus building results */
  corpusResults?: {
    sources: SourceRecord[];
    searchLog: SourceLogEntry[];
    library: LibraryCollection;
    qualityMetrics: {
      totalSources: number;
      priorityDistribution: Record<'A' | 'B' | 'C', number>;
      seminalRatio: number;
      doiCoverage: number;
      venueDiversity: number;
    };
  };
}

/**
 * Feature flag status request
 */
export interface FeatureFlagRequest {
  /** Request detailed flag information */
  includeDetails?: boolean;
}

/**
 * Feature flag status response
 */
export interface FeatureFlagResponse {
  /** Main pipeline flag status */
  pipelineEnabled: boolean;
  /** Individual feature flags */
  flags: Record<string, boolean>;
  /** Environment validation results */
  validation?: {
    valid: boolean;
    issues: string[];
  };
  /** Feature dependencies */
  dependencies?: Record<string, string[]>;
}

/**
 * Error code constants for API responses
 */
export const API_ERROR_CODES = {
  // Feature flag errors
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  PIPELINE_V2_REQUIRED: 'PIPELINE_V2_REQUIRED',
  
  // Stage execution errors
  STAGE_NOT_FOUND: 'STAGE_NOT_FOUND',
  STAGE_CONFIG_MISSING: 'STAGE_CONFIG_MISSING',
  STAGE_EXECUTION_FAILED: 'STAGE_EXECUTION_FAILED',
  STAGE_TIMEOUT: 'STAGE_TIMEOUT',
  
  // Artifact errors
  ARTIFACT_NOT_FOUND: 'ARTIFACT_NOT_FOUND',
  ARTIFACT_VALIDATION_FAILED: 'ARTIFACT_VALIDATION_FAILED',
  ARTIFACT_SAVE_FAILED: 'ARTIFACT_SAVE_FAILED',
  
  // Gate evaluation errors
  GATE_CRITERIA_NOT_MET: 'GATE_CRITERIA_NOT_MET',
  GATE_EVALUATION_FAILED: 'GATE_EVALUATION_FAILED',
  
  // Progress & execution tracking errors
  EXECUTION_NOT_FOUND: 'EXECUTION_NOT_FOUND',
  PROGRESS_UPDATE_FAILED: 'PROGRESS_UPDATE_FAILED',
  
  // General errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

/**
 * Type guard for API responses
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiResponse<T> & { 
  success: false; 
  error: NonNullable<ApiResponse<T>['error']> 
} {
  return !response.success && !!response.error;
}

/**
 * Type guard for successful API responses
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { 
  success: true; 
  data: NonNullable<ApiResponse<T>['data']> 
} {
  return response.success && !!response.data;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: ApiErrorCode, 
  message: string, 
  details?: any
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T, 
  meta?: Partial<ApiResponse<T>['meta']>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}
