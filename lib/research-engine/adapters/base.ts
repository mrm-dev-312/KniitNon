// Base implementation for CorpusSourceAdapter
// Provides common functionality and error handling patterns

import { 
  CorpusSourceAdapter, 
  SearchQuery, 
  SearchResult, 
  AdapterConfig,
  AdapterError,
  RateLimitError 
} from './types';
import { SourceRecord } from '../domain/stage1';

/**
 * Abstract base class for corpus source adapters
 * Implements common patterns for error handling, rate limiting, and caching
 */
export abstract class BaseCorpusSourceAdapter implements CorpusSourceAdapter {
  protected config: Required<AdapterConfig>;
  protected lastRequest: number = 0;
  protected cache = new Map<string, { result: SearchResult; expiry: number }>();

  constructor(
    public readonly name: string,
    config: AdapterConfig
  ) {
    // Provide sensible defaults
    this.config = {
      apiKey: '',
      baseUrl: '',
      rateLimit: { requestsPerMinute: 60, burstLimit: 10 },
      timeout: 30000, // 30 seconds
      userAgent: 'KniitNon-Research-Engine/1.0',
      caching: { enabled: true, ttlMinutes: 15 },
      ...config
    };
  }

  abstract isAvailable(): Promise<boolean>;
  protected abstract performSearch(query: SearchQuery): Promise<SearchResult>;

  /**
   * Search with rate limiting, caching, and error handling
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const cacheKey = this.getCacheKey(query);
    
    // Check cache first
    if (this.config.caching.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        return cached.result;
      }
    }

    try {
      // Apply rate limiting
      await this.enforceRateLimit();
      
      // Perform the actual search
      const result = await this.performSearch(query);
      
      // Cache successful results
      if (this.config.caching.enabled) {
        const ttl = this.config.caching.ttlMinutes! * 60 * 1000;
        this.cache.set(cacheKey, {
          result,
          expiry: Date.now() + ttl
        });
      }
      
      return result;
      
    } catch (error) {
      // Return partial results on error rather than throwing
      return this.handleSearchError(query, error);
    }
  }

  /**
   * Get adapter health status
   */
  async getStatus() {
    try {
      const available = await this.isAvailable();
      return {
        healthy: available,
        rateLimitStatus: this.getRateLimitStatus(),
        lastError: undefined
      };
    } catch (error) {
      return {
        healthy: false,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Default enrichment is no-op - override in specific adapters
   */
  async enrich(source: Partial<SourceRecord>): Promise<SourceRecord> {
    // Ensure required fields are present
    return {
      title: source.title || 'Unknown Title',
      priority: source.priority || 'C',
      doi: source.doi || null,
      authors: source.authors || [],
      venue: source.venue || null,
      year: source.year || null,
      url: source.url || null,
      pdf_available: source.pdf_available || false,
      is_seminal: source.is_seminal || false,
      addedAt: new Date().toISOString(),
      ...source
    };
  }

  /**
   * Generate cache key for search query
   */
  protected getCacheKey(query: SearchQuery): string {
    return `${this.name}:${JSON.stringify(query)}`;
  }

  /**
   * Enforce rate limiting between requests
   */
  protected async enforceRateLimit(): Promise<void> {
    const minInterval = 60000 / this.config.rateLimit.requestsPerMinute; // ms between requests
    const elapsed = Date.now() - this.lastRequest;
    
    if (elapsed < minInterval) {
      const waitTime = minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }

  /**
   * Get current rate limit status
   */
  protected getRateLimitStatus() {
    const minInterval = 60000 / this.config.rateLimit.requestsPerMinute;
    const elapsed = Date.now() - this.lastRequest;
    const canMakeRequest = elapsed >= minInterval;
    
    return {
      remaining: canMakeRequest ? this.config.rateLimit.requestsPerMinute : 0,
      resetAt: new Date(this.lastRequest + minInterval).toISOString()
    };
  }

  /**
   * Handle search errors by returning partial results
   */
  protected handleSearchError(query: SearchQuery, error: unknown): SearchResult {
    let message = 'Unknown error';
    
    if (error instanceof Error) {
      message = error.message;
    }
    
    console.warn(`${this.name} search failed:`, message);
    
    return {
      sources: [], // Empty results on error
      totalCount: 0,
      metadata: {
        engine: this.name,
        query: query.query,
        executedAt: new Date().toISOString(),
        duration: 0
      },
      warnings: [`Search failed: ${message}`]
    };
  }

  /**
   * Normalize a source record to ensure it matches our schema
   */
  protected normalizeSource(rawSource: any): SourceRecord {
    return {
      title: this.cleanString(rawSource.title) || 'Unknown Title',
      authors: Array.isArray(rawSource.authors) 
        ? rawSource.authors.map((a: any) => this.cleanString(a)).filter(Boolean)
        : [],
      doi: this.extractDOI(rawSource.doi || rawSource.url) || null,
      venue: this.cleanString(rawSource.venue || rawSource.journal) || null,
      year: this.extractYear(rawSource.year || rawSource.published) || null,
      url: this.isValidUrl(rawSource.url) ? rawSource.url : null,
      pdf_available: Boolean(rawSource.pdf_url || rawSource.pdf_available),
      is_seminal: Boolean(rawSource.is_seminal),
      priority: this.determinePriority(rawSource),
      addedAt: new Date().toISOString()
    };
  }

  /**
   * Clean and normalize string fields
   */
  protected cleanString(str: any): string | null {
    if (typeof str !== 'string') return null;
    return str.trim().replace(/\s+/g, ' ') || null;
  }

  /**
   * Extract DOI from various formats
   */
  protected extractDOI(input: any): string | null {
    if (typeof input !== 'string') return null;
    
    const doiRegex = /(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:)?(10\.\S+)/i;
    const match = input.match(doiRegex);
    return match ? match[1] : null;
  }

  /**
   * Extract year from various date formats
   */
  protected extractYear(input: any): number | null {
    if (typeof input === 'number') {
      return input >= 1900 && input <= 2100 ? input : null;
    }
    
    if (typeof input === 'string') {
      const yearMatch = input.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        return year >= 1900 && year <= 2100 ? year : null;
      }
    }
    
    return null;
  }

  /**
   * Validate URL format
   */
  protected isValidUrl(input: any): boolean {
    if (typeof input !== 'string') return false;
    
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determine source priority based on various signals
   * Override in specific adapters for better priority logic
   */
  protected determinePriority(rawSource: any): 'A' | 'B' | 'C' {
    // Simple heuristic - override in specific adapters
    if (rawSource.citation_count > 50) return 'A';
    if (rawSource.citation_count > 10) return 'B';
    return 'C';
  }

  /**
   * Create a standard HTTP request with timeout and error handling
   */
  protected async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          throw new RateLimitError(this.name, retryAfter);
        }
        
        throw new AdapterError(
          this.name, 
          'fetch', 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
      
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof AdapterError || error instanceof RateLimitError) {
        throw error;
      }
      
      throw new AdapterError(
        this.name,
        'fetch',
        error instanceof Error ? error.message : 'Network error'
      );
    }
  }
}
