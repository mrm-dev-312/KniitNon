// Stage 1: Corpus Build - Domain Model Interfaces
// These interfaces match the corresponding JSON schemas in /schemas/

/**
 * Individual search string with metadata
 * Maps to: search-string.schema.json
 */
export interface SearchString {
  id?: string;
  text: string;
  rationale?: string;
  enginesRun?: string[];
  lastRunAt?: string | null; // ISO 8601 timestamp
  stageGenerated?: 0 | 1 | null; // Which stage generated this search string
}

/**
 * Source record with bibliographic metadata
 * Maps to: source-record.schema.json
 */
export interface SourceRecord {
  id?: string;
  doi?: string | null; // DOI pattern: "^10\\.\\S+"
  title: string;
  authors?: string[];
  venue?: string | null;
  year?: number | null; // 1900-2100 range
  url?: string | null; // Valid URI format
  pdf_available?: boolean;
  is_seminal?: boolean; // Flagged as seminal/foundational work
  priority: 'A' | 'B' | 'C'; // Priority classification
  addedAt?: string | null; // ISO 8601 timestamp
}

/**
 * Collection of deduplicated sources
 * Maps to: library-collection.schema.json
 */
export interface LibraryCollection {
  sources: SourceRecord[];
  generatedAt?: string | null; // ISO 8601 timestamp
}

/**
 * Source log entry for tracking corpus building activities
 * Additional entity for Stage 1 pipeline tracking
 */
export interface SourceLogEntry {
  id: string;
  searchStringId: string;
  engine: string;
  query: string;
  resultsCount: number;
  executedAt: string; // ISO 8601 timestamp
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
}

// Stage 1 gate evaluation types
export type Stage1Artifacts = {
  searchStrings?: SearchString[];
  sourceRecords?: SourceRecord[];
  libraryCollection?: LibraryCollection;
  sourceLog?: SourceLogEntry[];
};
