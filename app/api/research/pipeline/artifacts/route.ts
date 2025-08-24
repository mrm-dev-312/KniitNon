// Research Pipeline Artifact Management API
// /api/research/pipeline/artifacts - Manage pipeline artifacts

import { NextRequest, NextResponse } from 'next/server';
import { 
  isResearchPipelineV2Enabled 
} from '@/lib/research-engine/core/feature-flags';
import { 
  ArtifactSaveRequest, 
  ArtifactRetrievalRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  API_ERROR_CODES 
} from '@/lib/research-engine/api/types';
import { StageNumber } from '@/lib/research-engine/core/types';

// In-memory artifact store (replace with database in production)
interface StoredArtifact {
  id: string;
  stage: StageNumber;
  schemaId: string;
  data: any;
  metadata?: {
    source?: string;
    version?: string;
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

const artifactStore: Map<string, StoredArtifact> = new Map();

/**
 * Save a new artifact
 * POST /api/research/pipeline/artifacts
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    let requestData: ArtifactSaveRequest;
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

    // Validate required fields
    if (!requestData.stage || requestData.stage < 0 || requestData.stage > 5) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          'Invalid stage number. Must be 0-5.'
        ),
        { status: 400 }
      );
    }

    if (!requestData.schemaId) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          'schemaId is required'
        ),
        { status: 400 }
      );
    }

    if (!requestData.data) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          'data is required'
        ),
        { status: 400 }
      );
    }

    // Validate schema ID format
    if (!isValidSchemaId(requestData.schemaId, requestData.stage)) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.ARTIFACT_VALIDATION_FAILED,
          `Invalid schema ID for stage ${requestData.stage}: ${requestData.schemaId}`
        ),
        { status: 400 }
      );
    }

    // Generate artifact ID
    const artifactId = generateArtifactId(requestData.stage, requestData.schemaId);
    const now = new Date().toISOString();

    // Create artifact record
    const artifact: StoredArtifact = {
      id: artifactId,
      stage: requestData.stage,
      schemaId: requestData.schemaId,
      data: requestData.data,
      metadata: requestData.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Store artifact
    artifactStore.set(artifactId, artifact);

    return NextResponse.json(createSuccessResponse({
      artifactId,
      stage: requestData.stage,
      schemaId: requestData.schemaId,
      createdAt: now,
      size: JSON.stringify(requestData.data).length,
    }));

  } catch (error) {
    console.error('Artifact save error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.ARTIFACT_SAVE_FAILED,
        'Failed to save artifact'
      ),
      { status: 500 }
    );
  }
}

/**
 * Retrieve artifacts with optional filtering
 * GET /api/research/pipeline/artifacts?stage=1&schemaId=stage1.library
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const stageParam = searchParams.get('stage');
    const schemaIdsParam = searchParams.get('schemaIds');
    const includeMetadata = searchParams.get('includeMetadata') === 'true';
    const includeData = searchParams.get('includeData') !== 'false'; // default true
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    let stage: StageNumber | undefined;
    if (stageParam) {
      const stageNum = parseInt(stageParam);
      if (isNaN(stageNum) || stageNum < 0 || stageNum > 5) {
        return NextResponse.json(
          createErrorResponse(
            API_ERROR_CODES.INVALID_REQUEST,
            'Invalid stage number. Must be 0-5.'
          ),
          { status: 400 }
        );
      }
      stage = stageNum as StageNumber;
    }

    const schemaIds = schemaIdsParam ? schemaIdsParam.split(',') : undefined;

    // Filter artifacts
    let filteredArtifacts = Array.from(artifactStore.values());

    if (stage !== undefined) {
      filteredArtifacts = filteredArtifacts.filter(a => a.stage === stage);
    }

    if (schemaIds) {
      filteredArtifacts = filteredArtifacts.filter(a => schemaIds.includes(a.schemaId));
    }

    // Sort by creation date (newest first)
    filteredArtifacts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const total = filteredArtifacts.length;
    const paginatedArtifacts = filteredArtifacts.slice(offset, offset + limit);

    // Format response
    const artifacts = paginatedArtifacts.map(artifact => {
      const result: any = {
        id: artifact.id,
        stage: artifact.stage,
        schemaId: artifact.schemaId,
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
      };

      if (includeData) {
        result.data = artifact.data;
      }

      if (includeMetadata && artifact.metadata) {
        result.metadata = artifact.metadata;
      }

      return result;
    });

    return NextResponse.json(createSuccessResponse({
      artifacts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary: {
        totalArtifacts: total,
        stageDistribution: getStageDistribution(filteredArtifacts),
        schemaTypes: getSchemaTypes(filteredArtifacts),
      },
    }));

  } catch (error) {
    console.error('Artifact retrieval error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Error retrieving artifacts'
      ),
      { status: 500 }
    );
  }
}

/**
 * Update an existing artifact
 * PUT /api/research/pipeline/artifacts?id=<artifact_id>
 */
export async function PUT(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const artifactId = searchParams.get('id');

    if (!artifactId) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          'Artifact ID is required'
        ),
        { status: 400 }
      );
    }

    // Check if artifact exists
    const existingArtifact = artifactStore.get(artifactId);
    if (!existingArtifact) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.ARTIFACT_NOT_FOUND,
          `Artifact not found: ${artifactId}`
        ),
        { status: 404 }
      );
    }

    // Parse request body
    let updateData: Partial<ArtifactSaveRequest>;
    try {
      updateData = await request.json();
    } catch (error) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          'Invalid JSON in request body'
        ),
        { status: 400 }
      );
    }

    // Update artifact
    const updatedArtifact: StoredArtifact = {
      ...existingArtifact,
      ...(updateData.data && { data: updateData.data }),
      ...(updateData.metadata && { metadata: updateData.metadata }),
      updatedAt: new Date().toISOString(),
    };

    artifactStore.set(artifactId, updatedArtifact);

    return NextResponse.json(createSuccessResponse({
      artifactId,
      stage: updatedArtifact.stage,
      schemaId: updatedArtifact.schemaId,
      updatedAt: updatedArtifact.updatedAt,
    }));

  } catch (error) {
    console.error('Artifact update error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Error updating artifact'
      ),
      { status: 500 }
    );
  }
}

/**
 * Delete an artifact
 * DELETE /api/research/pipeline/artifacts?id=<artifact_id>
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const artifactId = searchParams.get('id');

    if (!artifactId) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          'Artifact ID is required'
        ),
        { status: 400 }
      );
    }

    // Check if artifact exists
    const existingArtifact = artifactStore.get(artifactId);
    if (!existingArtifact) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.ARTIFACT_NOT_FOUND,
          `Artifact not found: ${artifactId}`
        ),
        { status: 404 }
      );
    }

    // Delete artifact
    artifactStore.delete(artifactId);

    return NextResponse.json(createSuccessResponse({
      artifactId,
      deleted: true,
      deletedAt: new Date().toISOString(),
    }));

  } catch (error) {
    console.error('Artifact deletion error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Error deleting artifact'
      ),
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */
function generateArtifactId(stage: StageNumber, schemaId: string): string {
  return `artifact_${stage}_${schemaId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function isValidSchemaId(schemaId: string, stage: StageNumber): boolean {
  const validSchemas: Record<StageNumber, string[]> = {
    0: ['stage0.topic_scope', 'stage0.research_questions', 'stage0.venue_requirements'],
    1: ['stage1.library_collection', 'stage1.source_records', 'stage1.source_log', 'stage1.dedup_report'],
    2: ['stage2.triaged_sources', 'stage2.appraisal_scores', 'stage2.quality_metrics'],
    3: ['stage3.synthesis_themes', 'stage3.concept_map', 'stage3.evidence_chains'],
    4: ['stage4.argument_structure', 'stage4.outline', 'stage4.claim_evidence_map'],
    5: ['stage5.manuscript_draft', 'stage5.references', 'stage5.final_document'],
  };
  
  return validSchemas[stage]?.includes(schemaId) || false;
}

function getStageDistribution(artifacts: StoredArtifact[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  for (const artifact of artifacts) {
    const stageKey = `stage${artifact.stage}`;
    distribution[stageKey] = (distribution[stageKey] || 0) + 1;
  }
  
  return distribution;
}

function getSchemaTypes(artifacts: StoredArtifact[]): Record<string, number> {
  const types: Record<string, number> = {};
  
  for (const artifact of artifacts) {
    types[artifact.schemaId] = (types[artifact.schemaId] || 0) + 1;
  }
  
  return types;
}
