// Stage 1 Corpus Building Integration with CorpusSourceAdapter
// Connects the StageEngine with external source adapters for corpus building

import { 
  CorpusSourceManager, 
  createCorpusSourceManager,
  SearchQuery 
} from '../adapters';
import { 
  SearchString, 
  SourceRecord, 
  LibraryCollection,
  SourceLogEntry 
} from '../domain/stage1';

/**
 * Configuration for Stage 1 corpus building
 */
export interface CorpusBuildingConfig {
  /** Source adapters to use */
  adapters?: string[];
  /** Maximum sources per search string */
  maxSourcesPerSearch?: number;
  /** Enable automatic deduplication */
  enableDeduplication?: boolean;
  /** Minimum source quality threshold */
  minPriority?: 'A' | 'B' | 'C';
  /** Year range for sources */
  yearRange?: [number, number];
  /** Include preprints/working papers */
  includePreprints?: boolean;
}

/**
 * Stage 1 corpus building result
 */
export interface CorpusBuildingResult {
  /** Collected source records */
  sources: SourceRecord[];
  /** Search execution log */
  searchLog: SourceLogEntry[];
  /** Deduplicated library collection */
  library: LibraryCollection;
  /** Execution metrics */
  metrics: {
    totalSearches: number;
    totalResults: number;
    deduplicatedResults: number;
    averageResultsPerSearch: number;
    adapterCoverage: Record<string, number>;
    executionTime: number;
    errors: number;
  };
}

/**
 * Stage 1 Corpus Builder - orchestrates source collection
 */
export class Stage1CorpusBuilder {
  private corpusManager: CorpusSourceManager;
  private config: Required<CorpusBuildingConfig>;

  constructor(
    config: CorpusBuildingConfig = {},
    corpusManager?: CorpusSourceManager
  ) {
    this.config = {
      adapters: ['arxiv', 'crossref'],
      maxSourcesPerSearch: 50,
      enableDeduplication: true,
      minPriority: 'C',
      yearRange: [2015, new Date().getFullYear()],
      includePreprints: true,
      ...config
    };

    this.corpusManager = corpusManager || createCorpusSourceManager({
      deduplication: {
        useDoi: true,
        useFuzzyTitle: true,
        titleThreshold: 0.85,
        useAuthorOverlap: true,
        authorThreshold: 0.7
      }
    });
  }

  /**
   * Execute Stage 1 corpus building from search strings
   */
  async buildCorpus(searchStrings: SearchString[]): Promise<CorpusBuildingResult> {
    const startTime = Date.now();
    const searchLog: SourceLogEntry[] = [];
    const allSources: SourceRecord[] = [];
    const adapterCoverage: Record<string, number> = {};
    let totalSearches = 0;
    let errors = 0;

    // Execute searches for each search string
    for (const searchString of searchStrings) {
      try {
        const searchResult = await this.executeSearch(searchString);
        
        // Log the search execution
        const logEntry: SourceLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          searchStringId: searchString.id || `search-${totalSearches}`,
          engine: 'multi-adapter',
          query: searchString.text,
          resultsCount: searchResult.sources.length,
          executedAt: new Date().toISOString(),
          status: 'success'
        };
        
        searchLog.push(logEntry);
        allSources.push(...searchResult.sources);
        totalSearches++;

        // Track adapter coverage
        for (const [adapter, result] of searchResult.byAdapter) {
          adapterCoverage[adapter] = (adapterCoverage[adapter] || 0) + result.sources.length;
        }

      } catch (error) {
        errors++;
        const logEntry: SourceLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          searchStringId: searchString.id || `search-${totalSearches}`,
          engine: 'multi-adapter',
          query: searchString.text,
          resultsCount: 0,
          executedAt: new Date().toISOString(),
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        };
        searchLog.push(logEntry);
        console.warn(`Search failed for "${searchString.text}":`, error);
      }
    }

    // Apply quality filtering
    const filteredSources = this.filterSourcesByQuality(allSources);
    
    // Create library collection (already deduplicated by corpus manager)
    const library: LibraryCollection = {
      sources: filteredSources,
      generatedAt: new Date().toISOString()
    };

    const executionTime = Date.now() - startTime;

    return {
      sources: filteredSources,
      searchLog,
      library,
      metrics: {
        totalSearches,
        totalResults: allSources.length,
        deduplicatedResults: filteredSources.length,
        averageResultsPerSearch: totalSearches > 0 ? allSources.length / totalSearches : 0,
        adapterCoverage,
        executionTime,
        errors
      }
    };
  }

  /**
   * Execute search for a single search string
   */
  private async executeSearch(searchString: SearchString) {
    const query: SearchQuery = {
      query: searchString.text,
      maxResults: this.config.maxSourcesPerSearch,
      yearRange: this.config.yearRange,
      includePreprints: this.config.includePreprints,
      sortBy: 'relevance'
    };

    return await this.corpusManager.search(query, this.config.adapters);
  }

  /**
   * Filter sources by quality criteria
   */
  private filterSourcesByQuality(sources: SourceRecord[]): SourceRecord[] {
    const priorityOrder = { 'A': 3, 'B': 2, 'C': 1 };
    const minPriorityValue = priorityOrder[this.config.minPriority];

    return sources
      .filter(source => priorityOrder[source.priority] >= minPriorityValue)
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * Enrich sources with additional metadata
   */
  async enrichSources(sources: SourceRecord[]): Promise<SourceRecord[]> {
    const enrichedSources = [];
    
    for (const source of sources) {
      try {
        // Try to enrich with CrossRef if DOI is available
        const crossrefAdapter = this.corpusManager.getAdapters()
          .find(adapter => adapter.name === 'crossref');
        
        if (crossrefAdapter?.enrich && source.doi) {
          const enriched = await crossrefAdapter.enrich(source);
          enrichedSources.push(enriched);
        } else {
          enrichedSources.push(source);
        }
      } catch (error) {
        console.warn(`Enrichment failed for source ${source.id}:`, error);
        enrichedSources.push(source);
      }
    }

    return enrichedSources;
  }

  /**
   * Generate corpus quality metrics
   */
  generateQualityMetrics(result: CorpusBuildingResult): {
    totalSources: number;
    priorityDistribution: Record<'A' | 'B' | 'C', number>;
    seminalRatio: number;
    doiCoverage: number;
    venueDiversity: number;
    yearSpread: { min: number; max: number; median: number };
  } {
    const sources = result.sources;
    const totalSources = sources.length;
    
    if (totalSources === 0) {
      return {
        totalSources: 0,
        priorityDistribution: { 'A': 0, 'B': 0, 'C': 0 },
        seminalRatio: 0,
        doiCoverage: 0,
        venueDiversity: 0,
        yearSpread: { min: 0, max: 0, median: 0 }
      };
    }

    // Priority distribution
    const priorityDistribution = sources.reduce((acc, source) => {
      acc[source.priority]++;
      return acc;
    }, { 'A': 0, 'B': 0, 'C': 0 });

    // Seminal ratio
    const seminalCount = sources.filter(s => s.is_seminal).length;
    const seminalRatio = seminalCount / totalSources;

    // DOI coverage
    const doiCount = sources.filter(s => s.doi).length;
    const doiCoverage = doiCount / totalSources;

    // Venue diversity (Simpson diversity index)
    const venueFrequency = sources.reduce((acc, source) => {
      const venue = source.venue || 'Unknown';
      acc[venue] = (acc[venue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const venueDiversity = this.calculateSimpsonDiversity(Object.values(venueFrequency));

    // Year spread
    const years = sources
      .map(s => s.year)
      .filter((year): year is number => year !== null && year !== undefined)
      .sort((a, b) => a - b);
    
    const yearSpread = {
      min: years[0] || 0,
      max: years[years.length - 1] || 0,
      median: years.length > 0 ? years[Math.floor(years.length / 2)] : 0
    };

    return {
      totalSources,
      priorityDistribution,
      seminalRatio,
      doiCoverage,
      venueDiversity,
      yearSpread
    };
  }

  /**
   * Calculate Simpson diversity index
   */
  private calculateSimpsonDiversity(frequencies: number[]): number {
    const total = frequencies.reduce((sum, freq) => sum + freq, 0);
    if (total === 0) return 0;
    
    const sumSquares = frequencies.reduce((sum, freq) => sum + (freq / total) ** 2, 0);
    return 1 - sumSquares;
  }

  /**
   * Check if corpus meets Stage 1 gate criteria
   */
  checkGateCriteria(result: CorpusBuildingResult): {
    passed: boolean;
    criteria: Array<{
      name: string;
      required: number | string;
      actual: number | string;
      passed: boolean;
    }>;
  } {
    const metrics = this.generateQualityMetrics(result);
    const highPrioritySources = metrics.priorityDistribution.A + metrics.priorityDistribution.B;
    const seminalSources = Math.round(metrics.seminalRatio * metrics.totalSources);

    const criteria = [
      {
        name: 'High Priority Sources (A/B)',
        required: 25,
        actual: highPrioritySources,
        passed: highPrioritySources >= 25
      },
      {
        name: 'Seminal Sources',
        required: 5,
        actual: seminalSources,
        passed: seminalSources >= 5
      },
      {
        name: 'DOI Coverage',
        required: '50%',
        actual: `${Math.round(metrics.doiCoverage * 100)}%`,
        passed: metrics.doiCoverage >= 0.5
      }
    ];

    const passed = criteria.every(c => c.passed);

    return { passed, criteria };
  }
}

/**
 * Factory function for Stage 1 corpus building
 */
export function createStage1CorpusBuilder(config?: CorpusBuildingConfig): Stage1CorpusBuilder {
  return new Stage1CorpusBuilder(config);
}
