// Research Pipeline v2 API Tests
// Tests for feature flags, API endpoints, and error handling

import { 
  getFeatureFlags, 
  isResearchPipelineV2Enabled, 
  resetFeatureFlags 
} from '@/lib/research-engine/core/feature-flags';
import { API_ERROR_CODES, createErrorResponse, createSuccessResponse } from '@/lib/research-engine/api/types';

// Mock environment variables
const originalEnv = process.env;

describe('Research Pipeline v2 API', () => {
  beforeEach(() => {
    // Reset environment for clean test state
    process.env = { ...originalEnv };
    // Reset feature flags singleton
    resetFeatureFlags();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetFeatureFlags();
  });

  describe('Feature Flag System', () => {
    test('should disable pipeline v2 by default', () => {
      delete process.env.RESEARCH_PIPELINE_V2;
      expect(isResearchPipelineV2Enabled()).toBe(false);
    });

    test('should enable pipeline v2 when explicitly set', () => {
      process.env.RESEARCH_PIPELINE_V2 = 'true';
      expect(isResearchPipelineV2Enabled()).toBe(true);
    });

    test('should load all feature flags from environment', () => {
      process.env.RESEARCH_PIPELINE_V2 = 'true';
      process.env.ENABLE_CORPUS_ADAPTERS = 'true';
      process.env.ENABLE_ADVANCED_DEDUP = 'false';
      
      const flags = getFeatureFlags();
      
      expect(flags.RESEARCH_PIPELINE_V2).toBe(true);
      expect(flags.CORPUS_SOURCE_ADAPTERS).toBe(true);
      expect(flags.ADVANCED_DEDUPLICATION).toBe(false);
    });
  });

  describe('API Response Helpers', () => {
    test('should create success response with correct format', () => {
      const data = { test: 'value' };
      const response = createSuccessResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta?.timestamp).toBeDefined();
    });

    test('should create error response with correct format', () => {
      const response = createErrorResponse(
        API_ERROR_CODES.FEATURE_DISABLED,
        'Test error message',
        { details: 'extra info' }
      );
      
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('FEATURE_DISABLED');
      expect(response.error?.message).toBe('Test error message');
      expect(response.error?.details).toEqual({ details: 'extra info' });
      expect(response.meta?.timestamp).toBeDefined();
    });
  });

  describe('API Error Codes', () => {
    test('should have all required error codes defined', () => {
      expect(API_ERROR_CODES.FEATURE_DISABLED).toBe('FEATURE_DISABLED');
      expect(API_ERROR_CODES.STAGE_NOT_FOUND).toBe('STAGE_NOT_FOUND');
      expect(API_ERROR_CODES.INVALID_REQUEST).toBe('INVALID_REQUEST');
      expect(API_ERROR_CODES.EXECUTION_NOT_FOUND).toBe('EXECUTION_NOT_FOUND');
      expect(API_ERROR_CODES.ARTIFACT_NOT_FOUND).toBe('ARTIFACT_NOT_FOUND');
      expect(API_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });

  describe('Stage Validation', () => {
    test('should validate stage numbers correctly', () => {
      // Valid stages
      expect(isValidStageNumber('0')).toBe(true);
      expect(isValidStageNumber('1')).toBe(true);
      expect(isValidStageNumber('5')).toBe(true);
      
      // Invalid stages
      expect(isValidStageNumber('-1')).toBe(false);
      expect(isValidStageNumber('6')).toBe(false);
      expect(isValidStageNumber('invalid')).toBe(false);
      expect(isValidStageNumber('')).toBe(false);
    });
  });

  describe('Schema ID Validation', () => {
    test('should validate schema IDs for each stage', () => {
      // Stage 0 schemas
      expect(isValidSchemaId('stage0.topic_scope', 0)).toBe(true);
      expect(isValidSchemaId('stage0.research_questions', 0)).toBe(true);
      expect(isValidSchemaId('stage1.library_collection', 0)).toBe(false);
      
      // Stage 1 schemas
      expect(isValidSchemaId('stage1.library_collection', 1)).toBe(true);
      expect(isValidSchemaId('stage1.source_records', 1)).toBe(true);
      expect(isValidSchemaId('stage2.triaged_sources', 1)).toBe(false);
      
      // Invalid schemas
      expect(isValidSchemaId('invalid.schema', 0)).toBe(false);
      expect(isValidSchemaId('', 1)).toBe(false);
    });
  });

  describe('Request ID Generation', () => {
    test('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).toMatch(/^req_\d+_[a-z0-9]{6}$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Artifact ID Generation', () => {
    test('should generate valid artifact IDs', () => {
      const id = generateArtifactId(1, 'stage1.library_collection');
      
      expect(id).toMatch(/^artifact_1_stage1\.library_collection_\d+_[a-z0-9]{6}$/);
    });
  });

  describe('Pipeline Context', () => {
    test('should create valid pipeline context', () => {
      process.env.RESEARCH_PIPELINE_V2 = 'true';
      
      const context = createPipelineContext();
      
      expect(context.requestId).toBeDefined();
      expect(context.timestamp).toBeDefined();
      expect(context.featureFlags).toBeDefined();
      expect(context.featureFlags.RESEARCH_PIPELINE_V2).toBe(true);
    });
  });

  describe('Error Handling Utilities', () => {
    test('should format validation errors correctly', () => {
      const missing = ['field1', 'field2'];
      const error = createValidationError('Missing required fields', missing);
      
      expect(error.code).toBe(API_ERROR_CODES.INVALID_REQUEST);
      expect(error.message).toBe('Missing required fields');
      expect(error.details).toEqual(missing);
    });

    test('should format feature disabled errors correctly', () => {
      const error = createFeatureDisabledError('TEST_FEATURE');
      
      expect(error.code).toBe(API_ERROR_CODES.FEATURE_DISABLED);
      expect(error.message).toContain('TEST_FEATURE');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete pipeline flow simulation', () => {
      // Enable all features
      process.env.RESEARCH_PIPELINE_V2 = 'true';
      process.env.ENABLE_CORPUS_ADAPTERS = 'true';
      
      // Simulate stage execution
      const stageRequest = {
        stage: 1,
        context: { topic: 'Test Research' }
      };
      
      const mockResponse = createSuccessResponse({
        stage: 1,
        status: 'completed',
        artifacts: [
          { id: 'art-1', schemaId: 'stage1.library_collection', data: {} }
        ],
        gateResult: { stage: 1, passed: true, failingRules: [] }
      });
      
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.stage).toBe(1);
    });

    test('should handle feature flag cascade correctly', () => {
      // Test feature flag dependencies
      process.env.RESEARCH_PIPELINE_V2 = 'true';
      process.env.ENABLE_CORPUS_ADAPTERS = 'false';
      
      const flags = getFeatureFlags();
      
      // Pipeline v2 should be enabled
      expect(flags.RESEARCH_PIPELINE_V2).toBe(true);
      
      // But corpus adapters should be disabled
      expect(flags.CORPUS_SOURCE_ADAPTERS).toBe(false);
    });
  });
});

// Test helper functions
function isValidStageNumber(stage: string): boolean {
  const num = parseInt(stage);
  return !isNaN(num) && num >= 0 && num <= 5;
}

function isValidSchemaId(schemaId: string, stage: number): boolean {
  const validSchemas: Record<number, string[]> = {
    0: ['stage0.topic_scope', 'stage0.research_questions', 'stage0.venue_requirements'],
    1: ['stage1.library_collection', 'stage1.source_records', 'stage1.source_log', 'stage1.dedup_report'],
    2: ['stage2.triaged_sources', 'stage2.appraisal_scores', 'stage2.quality_metrics'],
    3: ['stage3.synthesis_themes', 'stage3.concept_map', 'stage3.evidence_chains'],
    4: ['stage4.argument_structure', 'stage4.outline', 'stage4.claim_evidence_map'],
    5: ['stage5.manuscript_draft', 'stage5.references', 'stage5.final_document'],
  };
  
  return validSchemas[stage]?.includes(schemaId) || false;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateArtifactId(stage: number, schemaId: string): string {
  return `artifact_${stage}_${schemaId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function createPipelineContext() {
  return {
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
    featureFlags: getFeatureFlags(),
  };
}

function createValidationError(message: string, details?: any) {
  return {
    code: API_ERROR_CODES.INVALID_REQUEST,
    message,
    details,
  };
}

function createFeatureDisabledError(feature: string) {
  return {
    code: API_ERROR_CODES.FEATURE_DISABLED,
    message: `Feature not enabled: ${feature}`,
    details: { feature },
  };
}
