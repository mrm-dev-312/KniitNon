// Research Pipeline Progress Monitoring API
// /api/research/pipeline/progress - Monitor pipeline execution progress

import { NextRequest, NextResponse } from 'next/server';
import { 
  isResearchPipelineV2Enabled 
} from '@/lib/research-engine/core/feature-flags';
import { 
  ProgressRequest, 
  ProgressResponse, 
  createErrorResponse, 
  createSuccessResponse, 
  API_ERROR_CODES 
} from '@/lib/research-engine/api/types';
import { StageNumber } from '@/lib/research-engine/core/types';

// In-memory progress store (replace with database in production)
interface ProgressEntry {
  id: string;
  stage: StageNumber;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: string;
  endTime?: string;
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  estimatedCompletion?: string;
  metrics: {
    promptsExecuted: number;
    artifactsGenerated: number;
    errorsEncountered: number;
  };
  lastUpdate: string;
}

const progressStore: Map<string, ProgressEntry> = new Map();

/**
 * Get pipeline execution progress
 * GET /api/research/pipeline/progress?id=<execution_id>
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
    const executionId = searchParams.get('id');

    if (!executionId) {
      // Return all active progress entries
      const allProgress = Array.from(progressStore.values())
        .filter(entry => entry.status === 'running' || entry.status === 'paused')
        .map(entry => ({
          id: entry.id,
          stage: entry.stage,
          status: entry.status,
          progress: entry.progress,
          currentStep: entry.currentStep,
          totalSteps: entry.totalSteps,
          estimatedCompletion: entry.estimatedCompletion,
          lastUpdate: entry.lastUpdate,
        }));

      const response: ProgressResponse = {
        progressEntries: allProgress,
        totalActive: allProgress.length,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(createSuccessResponse(response));
    }

    // Get specific progress entry
    const progressEntry = progressStore.get(executionId);
    if (!progressEntry) {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.EXECUTION_NOT_FOUND,
          `Progress entry not found for execution ID: ${executionId}`
        ),
        { status: 404 }
      );
    }

    const response: ProgressResponse = {
      progressEntries: [progressEntry],
      totalActive: progressEntry.status === 'running' ? 1 : 0,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(createSuccessResponse(response));

  } catch (error) {
    console.error('Progress monitoring error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Error retrieving progress information'
      ),
      { status: 500 }
    );
  }
}

/**
 * Update pipeline execution progress
 * POST /api/research/pipeline/progress
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
    let requestData: ProgressRequest;
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

    const now = new Date().toISOString();

    if (requestData.action === 'start') {
      // Start tracking new execution
      const executionId = requestData.executionId || generateExecutionId();
      
      const progressEntry: ProgressEntry = {
        id: executionId,
        stage: requestData.stage,
        status: 'running',
        startTime: now,
        progress: 0,
        currentStep: requestData.currentStep,
        totalSteps: requestData.totalSteps,
        metrics: {
          promptsExecuted: 0,
          artifactsGenerated: 0,
          errorsEncountered: 0,
        },
        lastUpdate: now,
      };

      progressStore.set(executionId, progressEntry);

      return NextResponse.json(createSuccessResponse({
        executionId,
        status: 'started',
        timestamp: now,
      }));

    } else if (requestData.action === 'update') {
      // Update existing execution progress
      if (!requestData.executionId) {
        return NextResponse.json(
          createErrorResponse(
            API_ERROR_CODES.INVALID_REQUEST,
            'executionId is required for update action'
          ),
          { status: 400 }
        );
      }

      const progressEntry = progressStore.get(requestData.executionId);
      if (!progressEntry) {
        return NextResponse.json(
          createErrorResponse(
            API_ERROR_CODES.EXECUTION_NOT_FOUND,
            `Progress entry not found for execution ID: ${requestData.executionId}`
          ),
          { status: 404 }
        );
      }

      // Update progress
      if (requestData.progress !== undefined) {
        progressEntry.progress = Math.min(100, Math.max(0, requestData.progress));
      }
      if (requestData.currentStep !== undefined) {
        progressEntry.currentStep = requestData.currentStep;
      }
      if (requestData.estimatedCompletion !== undefined) {
        progressEntry.estimatedCompletion = requestData.estimatedCompletion;
      }
      if (requestData.metrics) {
        progressEntry.metrics = { ...progressEntry.metrics, ...requestData.metrics };
      }
      
      progressEntry.lastUpdate = now;

      return NextResponse.json(createSuccessResponse({
        executionId: requestData.executionId,
        status: 'updated',
        progress: progressEntry.progress,
        timestamp: now,
      }));

    } else if (requestData.action === 'complete' || requestData.action === 'fail') {
      // Complete or fail execution
      if (!requestData.executionId) {
        return NextResponse.json(
          createErrorResponse(
            API_ERROR_CODES.INVALID_REQUEST,
            'executionId is required for complete/fail action'
          ),
          { status: 400 }
        );
      }

      const progressEntry = progressStore.get(requestData.executionId);
      if (!progressEntry) {
        return NextResponse.json(
          createErrorResponse(
            API_ERROR_CODES.EXECUTION_NOT_FOUND,
            `Progress entry not found for execution ID: ${requestData.executionId}`
          ),
          { status: 404 }
        );
      }

      progressEntry.status = requestData.action === 'complete' ? 'completed' : 'failed';
      progressEntry.endTime = now;
      progressEntry.progress = requestData.action === 'complete' ? 100 : progressEntry.progress;
      progressEntry.lastUpdate = now;

      if (requestData.metrics) {
        progressEntry.metrics = { ...progressEntry.metrics, ...requestData.metrics };
      }

      return NextResponse.json(createSuccessResponse({
        executionId: requestData.executionId,
        status: progressEntry.status,
        duration: calculateDuration(progressEntry.startTime, now),
        timestamp: now,
      }));

    } else {
      return NextResponse.json(
        createErrorResponse(
          API_ERROR_CODES.INVALID_REQUEST,
          `Invalid action: ${requestData.action}. Must be 'start', 'update', 'complete', or 'fail'`
        ),
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Progress update error:', error);
    
    return NextResponse.json(
      createErrorResponse(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Error updating progress information'
      ),
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  
  const seconds = Math.floor(durationMs / 1000) % 60;
  const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Clean up completed/failed progress entries (run periodically)
 */
export function cleanupProgressEntries(maxAge: number = 24 * 60 * 60 * 1000) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - maxAge);
  
  for (const [id, entry] of progressStore.entries()) {
    const lastUpdate = new Date(entry.lastUpdate);
    if ((entry.status === 'completed' || entry.status === 'failed') && lastUpdate < cutoff) {
      progressStore.delete(id);
    }
  }
}
