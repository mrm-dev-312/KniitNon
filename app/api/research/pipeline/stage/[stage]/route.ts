// Research Pipeline Stage Execution API
// /api/research/pipeline/stage/[stage] - Execute specific pipeline stages

import { NextRequest, NextResponse } from 'next/server';
import { 
  isResearchPipelineV2Enabled, 
  isFeatureEnabled 
} from '@/lib/research-engine/core/feature-flags';
import { 
  StageExecutionRequest, 
  StageExecutionResponse, 
  Stage1ExecutionRequest,
  Stage1ExecutionResponse,
  createErrorResponse, 
  createSuccessResponse, 
  API_ERROR_CODES 
} from '@/lib/research-engine/api/types';
import { StageNumber } from '@/lib/research-engine/core/types';
import { StageEngine } from '@/lib/research-engine/core/StageEngine';
import { Stage1CorpusBuilder } from '@/lib/research-engine/stages/stage1-builder';

/**
 * Execute a specific pipeline stage
 * POST /api/research/pipeline/stage/[stage]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { stage: string } }
) {
  try {
    // Feature flag validation
    if (!isResearchPipelineV2Enabled()) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.FEATURE_DISABLED,
          'Research Pipeline v2 is not enabled. Set RESEARCH_PIPELINE_V2=true to enable.'
        ),
        { status: 403 }
      );
    }

    // Parse and validate stage number
    const stageNum = parseInt(params.stage);
    if (isNaN(stageNum) || stageNum < 0 || stageNum > 5) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.STAGE_NOT_FOUND,
          `Invalid stage number: ${params.stage}. Must be 0-5.`
        ),
        { status: 400 }
      );
    }

    const stage = stageNum as StageNumber;

    // Parse request body
    let requestData: StageExecutionRequest;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          'Invalid JSON in request body'
        ),
        { status: 400 }
      );
    }

    // Execute stage based on stage number
    let result: StageExecutionResponse;
    
    switch (stage) {
      case 0:
        result = await executeStage0(requestData);
        break;
      case 1:
        result = await executeStage1(requestData as Stage1ExecutionRequest);
        break;
      case 2:
      case 3:
      case 4:
      case 5:
        // Stub implementations for future stages
        result = await executeStageStub(stage, requestData);
        break;
      default:
        return NextResponse.json(
          createErrorResponse(
            API_ERROR_CODES.STAGE_NOT_FOUND,
            `Stage ${stage} is not implemented yet`
          ),
          { status: 501 }
        );
    }

    return NextResponse.json(createSuccessResponse(result));

  } catch (error) {
    console.error('Stage execution error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Internal server error during stage execution',
        process.env.NODE_ENV === 'development' ? error : undefined
      ),
      { status: 500 }
    );
  }
}

/**
 * Get stage status and metadata
 * GET /api/research/pipeline/stage/[stage]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { stage: string } }
) {
  try {
    // Feature flag validation
    if (!isResearchPipelineV2Enabled()) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.FEATURE_DISABLED,
          'Research Pipeline v2 is not enabled'
        ),
        { status: 403 }
      );
    }

    // Parse stage number
    const stageNum = parseInt(params.stage);
    if (isNaN(stageNum) || stageNum < 0 || stageNum > 5) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.STAGE_NOT_FOUND,
          `Invalid stage number: ${params.stage}`
        ),
        { status: 400 }
      );
    }

    const stage = stageNum as StageNumber;

    // Get stage status information
    const stageInfo = {
      stage,
      name: getStageNames()[stage],
      implemented: stage <= 1, // Only stages 0-1 are fully implemented
      featureRequirements: getStageFeatureRequirements(stage),
      availableEndpoints: {
        execute: `/api/research/pipeline/stage/${stage}`,
        artifacts: `/api/research/pipeline/artifacts?stage=${stage}`,
        progress: `/api/research/pipeline/progress`,
      },
    };

    return NextResponse.json(createSuccessResponse(stageInfo));

  } catch (error) {
    console.error('Stage info error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Error retrieving stage information'
      ),
      { status: 500 }
    );
  }
}

/**
 * Execute Stage 0: Exploration & Scope
 */
async function executeStage0(request: StageExecutionRequest): Promise<StageExecutionResponse> {
  const startTime = Date.now();
  
  // Mock implementation for Stage 0
  // TODO: Implement actual Stage 0 prompt chain execution
  
  const mockArtifacts = [
    {
      id: `stage0-topic-${Date.now()}`,
      schemaId: 'stage0.topic_scope',
      data: {
        topic: request.context?.topic || 'Machine Learning in Healthcare',
        refined: true,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    },
  ];

  const mockGateResult = {
    stage: 0 as StageNumber,
    passed: true,
    failingRules: [],
    metrics: {
      topic_defined: 1,
      questions_count: 3,
      venue_selected: 1,
    },
    auto: false,
    timestamp: new Date().toISOString(),
  };

  return {
    stage: 0,
    status: 'completed',
    artifacts: mockArtifacts,
    gateResult: mockGateResult,
    metrics: {
      executionTime: Date.now() - startTime,
      promptCount: 4,
      errorCount: 0,
      artifactCount: mockArtifacts.length,
    },
  };
}

/**
 * Execute Stage 1: Corpus Build
 */
async function executeStage1(request: Stage1ExecutionRequest): Promise<Stage1ExecutionResponse> {
  const startTime = Date.now();

  // Check corpus source adapters feature
  if (!isFeatureEnabled('CORPUS_SOURCE_ADAPTERS')) {
    throw new Error('Corpus source adapters are not enabled. Set ENABLE_CORPUS_ADAPTERS=true.');
  }

  try {
    // Create corpus builder with configuration
    const corpusBuilder = new Stage1CorpusBuilder(request.corpusConfig);

    // Mock search strings if not provided
    const searchStrings = request.searchStrings || [
      { id: 'search-1', text: 'machine learning healthcare applications' },
      { id: 'search-2', text: 'AI medical diagnosis systems' },
      { id: 'search-3', text: 'deep learning clinical data analysis' },
    ];

    // Execute corpus building
    const corpusResult = await corpusBuilder.buildCorpus(searchStrings);
    const qualityMetrics = corpusBuilder.generateQualityMetrics(corpusResult);
    const gateCheck = corpusBuilder.checkGateCriteria(corpusResult);

    // Create artifacts from results
    const artifacts = [
      {
        id: `stage1-library-${Date.now()}`,
        schemaId: 'stage1.library_collection',
        data: corpusResult.library,
        timestamp: new Date().toISOString(),
      },
      {
        id: `stage1-sources-${Date.now()}`,
        schemaId: 'stage1.source_records',
        data: { sources: corpusResult.sources },
        timestamp: new Date().toISOString(),
      },
      {
        id: `stage1-searchlog-${Date.now()}`,
        schemaId: 'stage1.source_log',
        data: { entries: corpusResult.searchLog },
        timestamp: new Date().toISOString(),
      },
    ];

    const gateResult = {
      stage: 1 as StageNumber,
      passed: gateCheck.passed,
      failingRules: gateCheck.criteria
        .filter(c => !c.passed)
        .map(c => `${c.name}: ${c.actual} (required: ${c.required})`),
      metrics: {
        total_sources: qualityMetrics.totalSources,
        priority_a_count: qualityMetrics.priorityDistribution.A,
        priority_b_count: qualityMetrics.priorityDistribution.B,
        seminal_count: Math.round(qualityMetrics.seminalRatio * qualityMetrics.totalSources),
        doi_coverage: Math.round(qualityMetrics.doiCoverage * 100),
      },
      auto: false,
      timestamp: new Date().toISOString(),
    };

    const response: Stage1ExecutionResponse = {
      stage: 1,
      status: gateCheck.passed ? 'completed' : 'partial',
      artifacts,
      gateResult,
      metrics: {
        executionTime: Date.now() - startTime,
        promptCount: 0, // No prompts used in corpus building
        errorCount: corpusResult.metrics.errors,
        artifactCount: artifacts.length,
      },
      corpusResults: {
        sources: corpusResult.sources,
        searchLog: corpusResult.searchLog,
        library: corpusResult.library,
        qualityMetrics,
      },
    };

    return response;

  } catch (error) {
    throw new Error(`Stage 1 execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stub implementation for stages 2-5
 */
async function executeStageStub(stage: StageNumber, request: StageExecutionRequest): Promise<StageExecutionResponse> {
  const startTime = Date.now();

  return {
    stage,
    status: 'failed',
    artifacts: [],
    gateResult: {
      stage,
      passed: false,
      failingRules: ['Stage not yet implemented'],
      metrics: {},
      auto: false,
      timestamp: new Date().toISOString(),
    },
    metrics: {
      executionTime: Date.now() - startTime,
      promptCount: 0,
      errorCount: 1,
      artifactCount: 0,
    },
    issues: [
      {
        type: 'error',
        message: `Stage ${stage} is not yet implemented`,
        source: 'stage-executor',
      },
    ],
  };
}

/**
 * Helper functions
 */
function getStageNames(): Record<StageNumber, string> {
  return {
    0: 'Exploration & Scope',
    1: 'Corpus Build', 
    2: 'Triage & Appraisal',
    3: 'Synthesis & Theming',
    4: 'Argument & Outline',
    5: 'Drafting & Polish',
  };
}

function getStageFeatureRequirements(stage: StageNumber): string[] {
  const requirements: Record<StageNumber, string[]> = {
    0: ['RESEARCH_PIPELINE_V2', 'STAGE_PROMPT_CHAINS'],
    1: ['RESEARCH_PIPELINE_V2', 'CORPUS_SOURCE_ADAPTERS', 'ADVANCED_DEDUPLICATION'],
    2: ['RESEARCH_PIPELINE_V2', 'STAGE_PROMPT_CHAINS'],
    3: ['RESEARCH_PIPELINE_V2', 'STAGE_PROMPT_CHAINS'],
    4: ['RESEARCH_PIPELINE_V2', 'STAGE_PROMPT_CHAINS', 'ARTIFACT_EXPORTS'],
    5: ['RESEARCH_PIPELINE_V2', 'STAGE_PROMPT_CHAINS', 'ARTIFACT_EXPORTS'],
  };
  
  return requirements[stage] || ['RESEARCH_PIPELINE_V2'];
}
