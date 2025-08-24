// Type Guards and Utility Functions for Research Engine Domain Model
// Runtime type checking and validation helpers

import type {
  TopicScope,
  ResearchQuestions,
  InclusionExclusionRules,
  SearchString,
  SourceRecord,
  LibraryCollection,
  ConversationTurn,
  GateEvaluation,
  ProgressSnapshot,
  StageNumber
} from '../domain';

/**
 * Type guard for StageNumber
 */
export function isStageNumber(value: unknown): value is StageNumber {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;
}

/**
 * Type guard for venue styles
 */
export function isVenueStyle(value: unknown): value is 'APA' | 'MLA' | 'IEEE' {
  return typeof value === 'string' && ['APA', 'MLA', 'IEEE'].includes(value);
}

/**
 * Type guard for priority levels
 */
export function isPriority(value: unknown): value is 'A' | 'B' | 'C' {
  return typeof value === 'string' && ['A', 'B', 'C'].includes(value);
}

/**
 * Type guard for conversation roles
 */
export function isConversationRole(value: unknown): value is 'user' | 'assistant' | 'system' {
  return typeof value === 'string' && ['user', 'assistant', 'system'].includes(value);
}

/**
 * Type guard for TopicScope
 */
export function isTopicScope(obj: unknown): obj is TopicScope {
  if (!obj || typeof obj !== 'object') return false;
  const ts = obj as any;
  
  return (
    typeof ts.topic_one_liner === 'string' &&
    ts.topic_one_liner.length >= 8 &&
    isVenueStyle(ts.venue_style) &&
    (ts.refined_questions === undefined || 
      (Array.isArray(ts.refined_questions) && 
       ts.refined_questions.length === 3 && 
       ts.refined_questions.every((q: any) => typeof q === 'string' && q.length >= 8))) &&
    (ts.inclusion_rules === undefined || 
      (Array.isArray(ts.inclusion_rules) && ts.inclusion_rules.every((r: any) => typeof r === 'string'))) &&
    (ts.exclusion_rules === undefined || 
      (Array.isArray(ts.exclusion_rules) && ts.exclusion_rules.every((r: any) => typeof r === 'string')))
  );
}

/**
 * Type guard for SearchString
 */
export function isSearchString(obj: unknown): obj is SearchString {
  if (!obj || typeof obj !== 'object') return false;
  const ss = obj as any;
  
  return (
    typeof ss.text === 'string' &&
    ss.text.length >= 3 &&
    (ss.id === undefined || typeof ss.id === 'string') &&
    (ss.rationale === undefined || typeof ss.rationale === 'string') &&
    (ss.enginesRun === undefined || (Array.isArray(ss.enginesRun) && ss.enginesRun.every((e: any) => typeof e === 'string'))) &&
    (ss.lastRunAt === undefined || ss.lastRunAt === null || typeof ss.lastRunAt === 'string') &&
    (ss.stageGenerated === undefined || ss.stageGenerated === null || ss.stageGenerated === 0 || ss.stageGenerated === 1)
  );
}

/**
 * Type guard for SourceRecord
 */
export function isSourceRecord(obj: unknown): obj is SourceRecord {
  if (!obj || typeof obj !== 'object') return false;
  const sr = obj as any;
  
  return (
    typeof sr.title === 'string' &&
    sr.title.length >= 5 &&
    isPriority(sr.priority) &&
    (sr.id === undefined || typeof sr.id === 'string') &&
    (sr.doi === undefined || sr.doi === null || (typeof sr.doi === 'string' && /^10\.\S+/.test(sr.doi))) &&
    (sr.authors === undefined || (Array.isArray(sr.authors) && sr.authors.every((a: any) => typeof a === 'string'))) &&
    (sr.venue === undefined || sr.venue === null || typeof sr.venue === 'string') &&
    (sr.year === undefined || sr.year === null || (typeof sr.year === 'number' && sr.year >= 1900 && sr.year <= 2100)) &&
    (sr.url === undefined || sr.url === null || typeof sr.url === 'string') &&
    (sr.pdf_available === undefined || typeof sr.pdf_available === 'boolean') &&
    (sr.is_seminal === undefined || typeof sr.is_seminal === 'boolean') &&
    (sr.addedAt === undefined || sr.addedAt === null || typeof sr.addedAt === 'string')
  );
}

/**
 * Type guard for ConversationTurn
 */
export function isConversationTurn(obj: unknown): obj is ConversationTurn {
  if (!obj || typeof obj !== 'object') return false;
  const ct = obj as any;
  
  return (
    typeof ct.id === 'string' &&
    isConversationRole(ct.role) &&
    typeof ct.content === 'string' &&
    typeof ct.ts === 'string'
  );
}

/**
 * Utility functions for creating domain objects
 */
export class DomainUtils {
  
  /**
   * Create a new ConversationTurn with current timestamp
   */
  static createConversationTurn(
    id: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): ConversationTurn {
    return {
      id,
      role,
      content,
      ts: new Date().toISOString()
    };
  }

  /**
   * Create a new SourceRecord with defaults
   */
  static createSourceRecord(
    title: string,
    priority: 'A' | 'B' | 'C',
    overrides: Partial<SourceRecord> = {}
  ): SourceRecord {
    return {
      title,
      priority,
      authors: [],
      pdf_available: false,
      is_seminal: false,
      addedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create a new SearchString with current timestamp
   */
  static createSearchString(
    text: string,
    rationale?: string,
    stageGenerated: 0 | 1 = 0
  ): SearchString {
    return {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      rationale,
      enginesRun: [],
      lastRunAt: null,
      stageGenerated
    };
  }

  /**
   * Create a new empty LibraryCollection
   */
  static createLibraryCollection(sources: SourceRecord[] = []): LibraryCollection {
    return {
      sources,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Check if a DOI is valid format
   */
  static isValidDOI(doi: string): boolean {
    return /^10\.\S+/.test(doi);
  }

  /**
   * Generate a unique ID with prefix
   */
  static generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if timestamp is valid ISO 8601
   */
  static isValidTimestamp(timestamp: string): boolean {
    return !isNaN(Date.parse(timestamp));
  }
}
