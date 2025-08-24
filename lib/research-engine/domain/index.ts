// Research Engine Domain Model - Main Exports
// Centralized exports for all domain interfaces and types

// Common domain types
export type {
  GateEvaluation,
  ProgressSnapshot,
  ArtifactMetadata,
  Artifact
} from './common';

// Stage 0: Exploration & Scope
export type {
  TopicScope,
  ResearchQuestions,
  InclusionExclusionRules,
  ConversationTurn,
  Stage0Artifacts
} from './stage0';

// Stage 1: Corpus Build
export type {
  SearchString,
  SourceRecord,
  LibraryCollection,
  SourceLogEntry,
  Stage1Artifacts
} from './stage1';

// Re-export stage number type from core types
export type { StageNumber } from '../core/types';

// Import for internal use
import type { Stage0Artifacts } from './stage0';
import type { Stage1Artifacts } from './stage1';

// Utility type for all stage artifacts
export type StageArtifacts = Stage0Artifacts | Stage1Artifacts;

// Schema identifier mapping
export const SCHEMA_IDS = {
  // Stage 0
  TOPIC_SCOPE: 'topic-scope.schema.json',
  RESEARCH_QUESTIONS: 'research-questions.schema.json',
  INCLUSION_RULES: 'inclusion-rules.schema.json',
  
  // Stage 1
  SEARCH_STRING: 'search-string.schema.json',
  SOURCE_RECORD: 'source-record.schema.json',
  LIBRARY_COLLECTION: 'library-collection.schema.json',
  
  // Common
  GATE_EVALUATION: 'gate-evaluation.schema.json',
  PROGRESS_SNAPSHOT: 'progress-snapshot.schema.json'
} as const;

export type SchemaId = typeof SCHEMA_IDS[keyof typeof SCHEMA_IDS];
