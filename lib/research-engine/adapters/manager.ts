// Multi-adapter corpus source manager
// Orchestrates searches across multiple source adapters with deduplication

import { 
  CorpusSourceManager, 
  CorpusSourceAdapter, 
  MultiSourceSearchResult, 
  SearchQuery 
} from './types';
import { CorpusDeduplicator, DeduplicationConfig } from './deduplicator';
import { ArXivAdapter } from './arxiv';
import { CrossRefAdapter } from './crossref';

/**
 * Configuration for corpus source manager
 */
export interface CorpusSourceManagerConfig {
  /** Deduplication settings */
  deduplication?: Partial<DeduplicationConfig>;
  /** Maximum concurrent adapter searches */
  maxConcurrent?: number;
  /** Timeout for individual adapter searches */
  searchTimeout?: number;
  /** Enable automatic fallback to other adapters on failure */
  enableFallback?: boolean;
}

/**
 * Multi-adapter corpus source manager implementation
 */
export class DefaultCorpusSourceManager implements CorpusSourceManager {
  private adapters = new Map<string, CorpusSourceAdapter>();
  private deduplicator: CorpusDeduplicator;
  private config: Required<CorpusSourceManagerConfig>;

  constructor(config: CorpusSourceManagerConfig = {}) {
    this.config = {
      deduplication: {},
      maxConcurrent: 3,
      searchTimeout: 30000,
      enableFallback: true,
      ...config
    };

    this.deduplicator = new CorpusDeduplicator(this.config.deduplication);

    // Initialize default adapters
    this.initializeDefaultAdapters();
  }

  private initializeDefaultAdapters() {
    // Add ArXiv adapter
    this.addAdapter(new ArXivAdapter({
      timeout: this.config.searchTimeout
    }));

    // Add CrossRef adapter  
    this.addAdapter(new CrossRefAdapter({
      timeout: this.config.searchTimeout
    }));
  }

  addAdapter(adapter: CorpusSourceAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  removeAdapter(name: string): void {
    this.adapters.delete(name);
  }

  getAdapters(): CorpusSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  async checkHealth(): Promise<Map<string, boolean>> {
    const healthResults = new Map<string, boolean>();
    
    const healthChecks = Array.from(this.adapters.values()).map(async adapter => {
      try {
        const healthy = await adapter.isAvailable();
        healthResults.set(adapter.name, healthy);
      } catch (error) {
        console.warn(`Health check failed for ${adapter.name}:`, error);
        healthResults.set(adapter.name, false);
      }
    });

    await Promise.all(healthChecks);
    return healthResults;
  }

  async search(query: SearchQuery, adapterNames?: string[]): Promise<MultiSourceSearchResult> {
    const startTime = Date.now();
    
    // Determine which adapters to use
    const adaptersToUse = this.selectAdapters(adapterNames);
    
    if (adaptersToUse.length === 0) {
      throw new Error('No adapters available for search');
    }

    // Execute searches across adapters
    const searchResults = await this.executeParallelSearches(adaptersToUse, query);
    
    // Combine and deduplicate results
    const combinedSources = searchResults.flatMap(result => result.sources);
    const deduplicationResult = this.deduplicator.deduplicate(combinedSources);
    
    const totalDuration = Date.now() - startTime;

    return {
      sources: deduplicationResult.deduplicated,
      totalCount: deduplicationResult.finalCount,
      byAdapter: new Map(
        searchResults.map(result => [result.metadata.engine, result])
      ),
      metadata: {
        adaptersUsed: searchResults.map(r => r.metadata.engine),
        totalDuration,
        executedAt: new Date().toISOString()
      },
      issues: this.collectIssues(searchResults)
    };
  }

  private selectAdapters(adapterNames?: string[]): CorpusSourceAdapter[] {
    if (adapterNames) {
      return adapterNames
        .map(name => this.adapters.get(name))
        .filter((adapter): adapter is CorpusSourceAdapter => adapter !== undefined);
    }
    
    return Array.from(this.adapters.values());
  }

  private async executeParallelSearches(
    adapters: CorpusSourceAdapter[], 
    query: SearchQuery
  ): Promise<import('./types').SearchResult[]> {
    const searchPromises = adapters.map(async adapter => {
      try {
        const result = await this.executeSearchWithTimeout(adapter, query);
        return result;
      } catch (error) {
        console.warn(`Search failed for adapter ${adapter.name}:`, error);
        
        // Return empty result with error info rather than failing completely
        return {
          sources: [],
          totalCount: 0,
          metadata: {
            engine: adapter.name,
            query: query.query,
            executedAt: new Date().toISOString(),
            duration: 0
          },
          warnings: [`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    });

    // Execute with concurrency limit
    const results = await this.executeWithConcurrencyLimit(searchPromises, this.config.maxConcurrent);
    
    // Filter out completely failed searches if fallback is enabled
    if (this.config.enableFallback) {
      return results.filter(result => result.sources.length > 0 || result.warnings);
    }
    
    return results;
  }

  private async executeSearchWithTimeout(
    adapter: CorpusSourceAdapter, 
    query: SearchQuery
  ): Promise<import('./types').SearchResult> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Search timeout for adapter ${adapter.name}`));
      }, this.config.searchTimeout);

      try {
        const result = await adapter.search(query);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async executeWithConcurrencyLimit<T>(
    promises: Promise<T>[], 
    limit: number
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit);
      const batchResults = await Promise.allSettled(batch);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn('Batch search failed:', result.reason);
        }
      }
    }
    
    return results;
  }

  private collectIssues(searchResults: import('./types').SearchResult[]): Array<{
    adapter: string;
    type: 'warning' | 'error';
    message: string;
  }> {
    const issues: Array<{
      adapter: string;
      type: 'warning' | 'error';
      message: string;
    }> = [];

    for (const result of searchResults) {
      if (result.warnings) {
        for (const warning of result.warnings) {
          issues.push({
            adapter: result.metadata.engine,
            type: 'warning',
            message: warning
          });
        }
      }

      // Add error issue for empty results (possible failures)
      if (result.sources.length === 0 && result.totalCount === 0) {
        issues.push({
          adapter: result.metadata.engine,
          type: 'error',
          message: 'No results returned - possible search failure'
        });
      }
    }

    return issues;
  }

  /**
   * Get search statistics across all adapters
   */
  async getSearchStats(): Promise<{
    adapters: Array<{
      name: string;
      healthy: boolean;
      lastError?: string;
    }>;
    totalSearches: number;
    cacheHitRate: number;
  }> {
    const health = await this.checkHealth();
    const adapters = [];

    for (const adapter of this.getAdapters()) {
      const status = await adapter.getStatus();
      adapters.push({
        name: adapter.name,
        healthy: health.get(adapter.name) || false,
        lastError: status.lastError
      });
    }

    return {
      adapters,
      totalSearches: 0, // Could be tracked if needed
      cacheHitRate: 0 // Could be tracked if needed
    };
  }

  /**
   * Clear all adapter caches
   */
  clearCaches(): void {
    // Implementation would depend on exposing cache clearing from base adapter
    console.log('Cache clearing requested for all adapters');
  }
}

/**
 * Factory function to create a configured corpus source manager
 */
export function createCorpusSourceManager(config?: CorpusSourceManagerConfig): CorpusSourceManager {
  return new DefaultCorpusSourceManager(config);
}

/**
 * Create a manager with only specific adapters
 */
export function createCustomCorpusSourceManager(
  adapters: CorpusSourceAdapter[],
  config?: CorpusSourceManagerConfig
): CorpusSourceManager {
  const manager = new DefaultCorpusSourceManager(config);
  
  // Remove default adapters
  for (const adapter of manager.getAdapters()) {
    manager.removeAdapter(adapter.name);
  }
  
  // Add specified adapters
  for (const adapter of adapters) {
    manager.addAdapter(adapter);
  }
  
  return manager;
}
