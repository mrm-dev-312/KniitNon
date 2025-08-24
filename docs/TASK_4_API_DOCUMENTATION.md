# Research Pipeline v2 API Documentation

This document provides comprehensive documentation for the Research Pipeline v2 API endpoints, implementation details, and usage examples.

## Overview

The Research Pipeline v2 API implements a stage-gated literature research system that converts research topics into submission-ready manuscripts through 6 distinct stages (0-5). The API provides endpoints for stage execution, progress monitoring, and artifact management.

## Feature Flag System

### Environment Configuration

The Research Pipeline v2 system is controlled by feature flags in the environment:

```bash
# Core pipeline control
RESEARCH_PIPELINE_V2=true          # Enable/disable pipeline v2 (default: false)

# Stage-specific features
ENABLE_CORPUS_ADAPTERS=true        # Enable corpus source adapters (default: false)
ENABLE_ADVANCED_DEDUP=true         # Enable advanced deduplication (default: false)
ENABLE_STAGE_PROMPT_CHAINS=true    # Enable stage prompt chains (default: false)
ENABLE_ARTIFACT_EXPORTS=true       # Enable artifact exports (default: false)
```

### Feature Flag API

Access feature flag status programmatically:

```typescript
import { 
  isResearchPipelineV2Enabled,
  isFeatureEnabled,
  getFeatureFlags 
} from '@/lib/research-engine/core/feature-flags';

// Check if pipeline v2 is enabled
if (isResearchPipelineV2Enabled()) {
  // Pipeline v2 functionality available
}

// Check specific features
if (isFeatureEnabled('CORPUS_SOURCE_ADAPTERS')) {
  // Corpus adapters available
}

// Get all flags
const flags = getFeatureFlags();
```

## API Endpoints

### Authentication & Access Control

All Research Pipeline v2 endpoints require the `RESEARCH_PIPELINE_V2` feature flag to be enabled. Additional stage-specific features may be required for certain operations.

**Common Error Responses:**
- `403 Forbidden` - Feature disabled or insufficient permissions
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### 1. Stage Execution API

Execute individual pipeline stages with proper gate evaluation and artifact generation.

#### Execute Stage
```http
POST /api/research/pipeline/stage/{stage}
```

**Path Parameters:**
- `stage` (number) - Stage number (0-5)

**Request Body:**
```typescript
{
  // Context for stage execution
  context?: {
    topic?: string;
    venue?: string;
    deadline?: string;
    [key: string]: any;
  };
  
  // Stage 1 specific (corpus building)
  corpusConfig?: {
    maxSourcesPerSearch?: number;
    minPriority?: 'A' | 'B' | 'C';
    yearRange?: [number, number];
    includePreprints?: boolean;
    adapters?: string[];
  };
  
  searchStrings?: Array<{
    id: string;
    text: string;
  }>;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    stage: number;
    status: 'completed' | 'failed' | 'partial' | 'timeout';
    artifacts: Array<{
      id: string;
      schemaId: string;
      data: any;
      timestamp: string;
    }>;
    gateResult: {
      stage: number;
      passed: boolean;
      failingRules: string[];
      metrics: Record<string, number>;
      auto: boolean;
      timestamp: string;
    };
    metrics: {
      executionTime: number;
      promptCount: number;
      errorCount: number;
      artifactCount: number;
    };
    issues?: Array<{
      type: 'error' | 'warning';
      message: string;
      source?: string;
    }>;
    
    // Stage 1 specific response
    corpusResults?: {
      sources: SourceRecord[];
      searchLog: SearchLogEntry[];
      library: LibraryCollection;
      qualityMetrics: QualityMetrics;
    };
  },
  timestamp: string
}
```

**Examples:**

Execute Stage 0 (Topic Exploration):
```bash
curl -X POST /api/research/pipeline/stage/0 \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "topic": "Machine Learning in Healthcare Diagnostics",
      "venue": "Nature Medicine",
      "deadline": "2024-12-01"
    }
  }'
```

Execute Stage 1 (Corpus Building):
```bash
curl -X POST /api/research/pipeline/stage/1 \
  -H "Content-Type: application/json" \
  -d '{
    "corpusConfig": {
      "maxSourcesPerSearch": 50,
      "yearRange": [2020, 2023],
      "adapters": ["arxiv", "crossref"]
    },
    "searchStrings": [
      {"id": "search-1", "text": "machine learning medical diagnosis"},
      {"id": "search-2", "text": "AI healthcare decision support"}
    ]
  }'
```

#### Get Stage Information
```http
GET /api/research/pipeline/stage/{stage}
```

**Response:**
```typescript
{
  success: true,
  data: {
    stage: number;
    name: string;
    implemented: boolean;
    featureRequirements: string[];
    availableEndpoints: {
      execute: string;
      artifacts: string;
      progress: string;
    };
  },
  timestamp: string
}
```

### 2. Progress Monitoring API

Track execution progress and monitor long-running pipeline operations.

#### Start Progress Tracking
```http
POST /api/research/pipeline/progress
```

**Request Body:**
```typescript
{
  action: 'start';
  stage: number;
  executionId?: string;
  totalSteps?: number;
  currentStep?: string;
}
```

#### Update Progress
```http
POST /api/research/pipeline/progress
```

**Request Body:**
```typescript
{
  action: 'update';
  executionId: string;
  progress?: number;  // 0-100
  currentStep?: string;
  estimatedCompletion?: string;
  metrics?: {
    promptsExecuted?: number;
    artifactsGenerated?: number;
    errorsEncountered?: number;
  };
}
```

#### Complete Execution
```http
POST /api/research/pipeline/progress
```

**Request Body:**
```typescript
{
  action: 'complete' | 'fail';
  executionId: string;
  metrics?: {
    promptsExecuted?: number;
    artifactsGenerated?: number;
    errorsEncountered?: number;
  };
}
```

#### Get Progress Status
```http
GET /api/research/pipeline/progress[?id=executionId]
```

**Response:**
```typescript
{
  success: true,
  data: {
    progressEntries: Array<{
      id: string;
      stage: number;
      status: 'running' | 'completed' | 'failed' | 'paused';
      startTime: string;
      endTime?: string;
      progress: number;
      currentStep?: string;
      totalSteps?: number;
      estimatedCompletion?: string;
      lastUpdate: string;
    }>;
    totalActive: number;
    timestamp: string;
  }
}
```

**Example:**
```bash
# Start tracking
curl -X POST /api/research/pipeline/progress \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "stage": 1,
    "totalSteps": 5,
    "currentStep": "Initializing corpus builder"
  }'

# Update progress
curl -X POST /api/research/pipeline/progress \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "executionId": "exec_123",
    "progress": 60,
    "currentStep": "Processing ArXiv results"
  }'

# Get status
curl /api/research/pipeline/progress?id=exec_123
```

### 3. Artifact Management API

Manage pipeline artifacts with schema validation and metadata support.

#### Save Artifact
```http
POST /api/research/pipeline/artifacts
```

**Request Body:**
```typescript
{
  stage: number;
  schemaId: string;
  data: any;
  metadata?: {
    source?: string;
    version?: string;
    tags?: string[];
  };
}
```

#### Retrieve Artifacts
```http
GET /api/research/pipeline/artifacts[?stage=1&schemaIds=stage1.library&includeData=true&limit=50&offset=0]
```

**Query Parameters:**
- `stage` (number, optional) - Filter by stage
- `schemaIds` (string, optional) - Comma-separated schema IDs to filter
- `includeData` (boolean, default: true) - Include artifact data
- `includeMetadata` (boolean, default: false) - Include metadata
- `limit` (number, default: 100, max: 1000) - Results per page
- `offset` (number, default: 0) - Pagination offset

**Response:**
```typescript
{
  success: true,
  data: {
    artifacts: Array<{
      id: string;
      stage: number;
      schemaId: string;
      data?: any;  // if includeData=true
      metadata?: object;  // if includeMetadata=true
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    summary: {
      totalArtifacts: number;
      stageDistribution: Record<string, number>;
      schemaTypes: Record<string, number>;
    };
  },
  timestamp: string
}
```

#### Update Artifact
```http
PUT /api/research/pipeline/artifacts?id={artifactId}
```

#### Delete Artifact
```http
DELETE /api/research/pipeline/artifacts?id={artifactId}
```

**Example:**
```bash
# Save artifact
curl -X POST /api/research/pipeline/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "stage": 1,
    "schemaId": "stage1.library_collection",
    "data": {
      "sources": [
        {"id": "src-1", "title": "AI in Medicine", "doi": "10.1234/example"}
      ]
    },
    "metadata": {
      "source": "arxiv_adapter",
      "version": "1.0"
    }
  }'

# Retrieve by stage
curl "/api/research/pipeline/artifacts?stage=1&includeMetadata=true"
```

## Schema Validation

### Valid Schema IDs by Stage

**Stage 0 (Exploration & Scope):**
- `stage0.topic_scope`
- `stage0.research_questions` 
- `stage0.venue_requirements`

**Stage 1 (Corpus Build):**
- `stage1.library_collection`
- `stage1.source_records`
- `stage1.source_log`
- `stage1.dedup_report`

**Stage 2 (Triage & Appraisal):**
- `stage2.triaged_sources`
- `stage2.appraisal_scores`
- `stage2.quality_metrics`

**Stage 3 (Synthesis & Theming):**
- `stage3.synthesis_themes`
- `stage3.concept_map`
- `stage3.evidence_chains`

**Stage 4 (Argument & Outline):**
- `stage4.argument_structure`
- `stage4.outline`
- `stage4.claim_evidence_map`

**Stage 5 (Drafting & Polish):**
- `stage5.manuscript_draft`
- `stage5.references`
- `stage5.final_document`

## Rate Limiting

Different endpoints have different rate limits:

- **Stage Execution**: 10 requests per minute per client
- **Artifact Management**: 50 requests per minute per client  
- **Progress Monitoring**: 100 requests per minute per client

Rate limit headers are included in responses:
- `X-Pipeline-Request-ID` - Unique request identifier
- `X-Pipeline-Execution-Time` - Request processing time
- `X-Pipeline-Version` - API version

## Error Handling

### Standard Error Response Format

```typescript
{
  success: false,
  error: {
    code: string;
    message: string;
    details?: any;
  },
  timestamp: string
}
```

### Error Codes

- `FEATURE_DISABLED` - Required features not enabled
- `STAGE_NOT_FOUND` - Invalid stage number
- `STAGE_EXECUTION_FAILED` - Stage execution error
- `ARTIFACT_NOT_FOUND` - Artifact not found
- `ARTIFACT_VALIDATION_FAILED` - Invalid artifact schema
- `EXECUTION_NOT_FOUND` - Progress tracking ID not found
- `INVALID_REQUEST` - Malformed request
- `INTERNAL_ERROR` - Server error

## Integration Examples

### Complete Pipeline Flow

```typescript
// 1. Check feature flags
if (!isResearchPipelineV2Enabled()) {
  throw new Error('Pipeline v2 not enabled');
}

// 2. Execute Stage 0
const stage0Result = await fetch('/api/research/pipeline/stage/0', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    context: {
      topic: 'AI in Healthcare',
      venue: 'Nature Medicine'
    }
  })
});

// 3. Check gate criteria
if (stage0Result.data.gateResult.passed) {
  // 4. Execute Stage 1
  const stage1Result = await fetch('/api/research/pipeline/stage/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      corpusConfig: { maxSourcesPerSearch: 100 },
      searchStrings: [
        { id: 'search-1', text: 'artificial intelligence healthcare' }
      ]
    })
  });
}
```

### Progress Monitoring Integration

```typescript
// Start progress tracking
const progressResponse = await fetch('/api/research/pipeline/progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'start',
    stage: 1,
    totalSteps: 5
  })
});

const { executionId } = progressResponse.data;

// Monitor progress
const interval = setInterval(async () => {
  const status = await fetch(`/api/research/pipeline/progress?id=${executionId}`);
  const progress = status.data.progressEntries[0];
  
  console.log(`Progress: ${progress.progress}% - ${progress.currentStep}`);
  
  if (progress.status === 'completed') {
    clearInterval(interval);
  }
}, 1000);
```

### Artifact Management Integration

```typescript
// Save artifacts after stage execution
const artifacts = stageResult.data.artifacts;

for (const artifact of artifacts) {
  await fetch('/api/research/pipeline/artifacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: artifact.stage,
      schemaId: artifact.schemaId,
      data: artifact.data,
      metadata: {
        source: 'stage_executor',
        version: '1.0'
      }
    })
  });
}

// Retrieve stage artifacts
const stageArtifacts = await fetch('/api/research/pipeline/artifacts?stage=1');
const library = stageArtifacts.data.artifacts
  .find(a => a.schemaId === 'stage1.library_collection');
```

## Security & Best Practices

1. **Feature Flag Validation**: Always check required feature flags before API calls
2. **Rate Limiting**: Implement client-side rate limiting to avoid 429 errors  
3. **Error Handling**: Handle all error responses gracefully
4. **Progress Monitoring**: Use progress tracking for long-running operations
5. **Artifact Cleanup**: Clean up unused artifacts periodically
6. **Schema Compliance**: Validate artifact schemas before saving
7. **Request Timeouts**: Set appropriate timeouts for API calls

## Troubleshooting

### Common Issues

**403 Forbidden - Feature Disabled**
```bash
# Check environment configuration
echo $RESEARCH_PIPELINE_V2
# Should return: true
```

**400 Bad Request - Invalid Stage**
- Ensure stage number is 0-5
- Check stage implementation status via GET endpoint

**429 Too Many Requests**
- Implement exponential backoff
- Check rate limits per endpoint type

**500 Internal Server Error**
- Check server logs for detailed error information
- Verify all required dependencies are available
- Ensure database connectivity for artifact storage

### Debug Mode

Enable detailed error information in development:
```bash
NODE_ENV=development
```

This includes stack traces and additional context in error responses.

---

**API Version**: v2  
**Last Updated**: Task #4 Implementation - Research Pipeline v2 API Endpoints  
**Support**: See GitHub issues for bug reports and feature requests
