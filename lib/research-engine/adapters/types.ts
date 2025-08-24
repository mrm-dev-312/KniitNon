// CorpusSourceAdapter - Interface for external research source integrations
// Follows research-engine adapter architecture patterns

import { SourceRecord, SearchString, SourceLogEntry } from '../domain/stage1';

/**
 * Search query configuration for corpus source adapters
 */
export interface SearchQuery {
  /** The search terms/query string */
  query: string;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Year range filter [startYear, endYear] */
  yearRange?: [number, number];
  /** Subject categories to include */
  categories?: string[];
  /** Include preprints/working papers */
  includePreprints?: boolean;
  /** Sort order for results */
  sortBy?: 'relevance' | 'date' | 'citations';
}

/**
 * Search result from corpus source adapter
 */
export interface SearchResult {
  /** Sources found by the search */
  sources: SourceRecord[];
  /** Total number of available results (may be > sources.length due to pagination) */
  totalCount: number;
  /** Search execution metadata */
  metadata: {
    engine: string;
    query: string;
    executedAt: string; // ISO 8601
    duration: number; // milliseconds
    rateLimitRemaining?: number;
  };
  /** Any warnings or partial failure messages */
  warnings?: string[];
}

/**
 * Configuration for corpus source adapters
 */
export interface AdapterConfig {
  /** API key or authentication token */
  apiKey?: string;
  /** Base URL for the service */
  baseUrl?: string;
  /** Rate limit settings */
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit?: number;
  };
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom user agent string */
  userAgent?: string;
  /** Enable caching */
  caching?: {
    enabled: boolean;
    ttlMinutes?: number;
  };
}

/**
 * Base interface for all corpus source adapters
 * Provides contract for search operations with fallback patterns
 */
export interface CorpusSourceAdapter {
  /** Adapter name/identifier */
  readonly name: string;
  
  /** Check if adapter is properly configured and accessible */
  isAvailable(): Promise<boolean>;
  
  /**
   * Search for sources using the given query
   * Must handle rate limiting, errors, and return valid SourceRecord objects
   * 
   * @param query Search parameters
   * @returns Promise<SearchResult> - never throws, always returns partial results on error
   */
  search(query: SearchQuery): Promise<SearchResult>;
  
  /**
   * Enrich source metadata (optional - may be no-op for some adapters)
   * 
   * @param source Partial source record to enrich
   * @returns Promise<SourceRecord> - enriched source or original if enrichment fails
   */
  enrich?(source: Partial<SourceRecord>): Promise<SourceRecord>;
  
  /**
   * Get adapter health/status information
   */
  getStatus(): Promise<{
    healthy: boolean;
    rateLimitStatus?: {
      remaining: number;
      resetAt: string;
    };
    lastError?: string;
  }>;
}

/**
 * Factory for creating corpus source adapters
 */
export interface CorpusSourceAdapterFactory {
  create(name: string, config: AdapterConfig): CorpusSourceAdapter;
  listAvailable(): string[];
}

/**
 * Aggregated search across multiple adapters
 */
export interface MultiSourceSearchResult {
  /** Combined sources from all adapters */
  sources: SourceRecord[];
  /** Total count across all adapters */
  totalCount: number;
  /** Results broken down by adapter */
  byAdapter: Map<string, SearchResult>;
  /** Overall execution metadata */
  metadata: {
    adaptersUsed: string[];
    totalDuration: number;
    executedAt: string;
  };
  /** Warnings and errors from adapters */
  issues: Array<{
    adapter: string;
    type: 'warning' | 'error';
    message: string;
  }>;
}

/**
 * Multi-adapter corpus source manager
 */
export interface CorpusSourceManager {
  /** Register an adapter */
  addAdapter(adapter: CorpusSourceAdapter): void;
  
  /** Remove an adapter */
  removeAdapter(name: string): void;
  
  /** Get list of available adapters */
  getAdapters(): CorpusSourceAdapter[];
  
  /** Search across multiple adapters */
  search(query: SearchQuery, adapterNames?: string[]): Promise<MultiSourceSearchResult>;
  
  /** Check health of all adapters */
  checkHealth(): Promise<Map<string, boolean>>;
}

/**
 * Error types for adapter operations
 */
export class AdapterError extends Error {
  constructor(
    public adapterName: string,
    public operation: string,
    message: string,
    public cause?: Error
  ) {
    super(`${adapterName} ${operation}: ${message}`);
    this.name = 'AdapterError';
  }
}

export class RateLimitError extends AdapterError {
  constructor(
    adapterName: string, 
    public retryAfter: number // seconds
  ) {
    super(adapterName, 'rate_limit', `Rate limit exceeded, retry after ${retryAfter}s`);
    this.name = 'RateLimitError';
  }
}

export class ConfigurationError extends AdapterError {
  constructor(adapterName: string, message: string) {
    super(adapterName, 'configuration', message);
    this.name = 'ConfigurationError';
  }
}
