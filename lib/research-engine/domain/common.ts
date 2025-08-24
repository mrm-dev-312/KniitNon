// Common domain model interfaces for the Research Engine Pipeline
// These are shared across all stages

/**
 * Gate evaluation result for stage progression
 * Core entity from Research Engine Plan section 2
 */
export interface GateEvaluation {
  id: string;
  stage: 0 | 1 | 2 | 3 | 4 | 5;
  passed: boolean;
  metrics: Record<string, number>;
  evaluator: 'auto' | 'user';
  timestamp: string; // ISO 8601 timestamp
  failingRules?: string[];
}

/**
 * Progress snapshot for UI and monitoring
 * Core entity from Research Engine Plan section 2
 */
export interface ProgressSnapshot {
  id: string;
  stage: 0 | 1 | 2 | 3 | 4 | 5;
  percent_complete: number; // 0-100
  blocking_issues: string[];
  lastUpdated?: string; // ISO 8601 timestamp
}

/**
 * Common metadata for all artifacts
 */
export interface ArtifactMetadata {
  id: string;
  schemaId: string;
  stage: 0 | 1 | 2 | 3 | 4 | 5;
  version: number;
  createdAt: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp
  validatedAt?: string; // ISO 8601 timestamp
}

/**
 * Generic artifact wrapper for storage and validation
 */
export interface Artifact<T = unknown> {
  metadata: ArtifactMetadata;
  data: T;
}
