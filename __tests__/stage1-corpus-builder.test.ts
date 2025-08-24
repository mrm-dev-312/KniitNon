// Stage 1 Corpus Building Tests
// Tests for the Stage1CorpusBuilder integration with CorpusSourceAdapter system

import { Stage1CorpusBuilder, CorpusBuildingConfig } from '../lib/research-engine/stages/stage1-builder';
import { 
  CorpusSourceManager, 
  SearchQuery,
  MultiSourceSearchResult,
  CorpusSourceAdapter,
  SearchResult
} from '../lib/research-engine/adapters';
import { SearchString, SourceRecord } from '../lib/research-engine/domain/stage1';

// Mock implementations
class TestCorpusSourceManager implements CorpusSourceManager {
  private mockResults: SourceRecord[] = [];
  private adapters: CorpusSourceAdapter[] = [];

  setMockResults(results: SourceRecord[]) {
    this.mockResults = results;
  }

  addAdapter(adapter: CorpusSourceAdapter): void {
    this.adapters.push(adapter);
  }

  removeAdapter(name: string): void {
    this.adapters = this.adapters.filter(a => a.name !== name);
  }

  getAdapters(): CorpusSourceAdapter[] {
    return this.adapters;
  }

  async search(query: SearchQuery, adapterNames?: string[]): Promise<MultiSourceSearchResult> {
    // Simulate search results
    const sources = this.mockResults.slice(0, query.maxResults || 50);
    
    return {
      sources,
      totalCount: sources.length,
      byAdapter: new Map([
        ['arxiv', { 
          sources: sources.filter((_, i) => i % 2 === 0), 
          totalCount: Math.floor(sources.length / 2),
          metadata: {
            engine: 'arxiv',
            query: query.query,
            executedAt: new Date().toISOString(),
            duration: 100
          }
        }],
        ['crossref', { 
          sources: sources.filter((_, i) => i % 2 === 1), 
          totalCount: Math.ceil(sources.length / 2),
          metadata: {
            engine: 'crossref',
            query: query.query,
            executedAt: new Date().toISOString(),
            duration: 150
          }
        }]
      ]),
      metadata: {
        adaptersUsed: adapterNames || ['arxiv', 'crossref'],
        totalDuration: 250,
        executedAt: new Date().toISOString()
      },
      issues: []
    };
  }

  async checkHealth(): Promise<Map<string, boolean>> {
    return new Map([
      ['arxiv', true],
      ['crossref', true]
    ]);
  }
}

// Test data factory
function createMockSourceRecord(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: `source-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Research Paper',
    authors: ['Test Author'],
    year: 2023,
    venue: 'Test Conference',
    doi: '10.1000/test.doi',
    url: 'https://example.com/paper',
    priority: 'B',
    is_seminal: false,
    citation_count: 10,
    source_type: 'journal_article',
    metadata: {},
    ...overrides
  };
}

function createMockSearchString(text: string, id?: string): SearchString {
  return {
    id: id || `search-${Math.random().toString(36).substr(2, 9)}`,
    text
  };
}

describe('Stage1CorpusBuilder', () => {
  let corpusBuilder: Stage1CorpusBuilder;
  let mockCorpusManager: TestCorpusSourceManager;

  beforeEach(() => {
    mockCorpusManager = new TestCorpusSourceManager();
    
    // Add mock adapters
    mockCorpusManager.addAdapter({
      name: 'arxiv',
      async isAvailable() { return true; },
      async search() { return { sources: [], totalCount: 0, metadata: { engine: 'arxiv', query: '', executedAt: '', duration: 0 } }; },
      async getStatus() { return { healthy: true }; }
    });
    
    mockCorpusManager.addAdapter({
      name: 'crossref', 
      async isAvailable() { return true; },
      async search() { return { sources: [], totalCount: 0, metadata: { engine: 'crossref', query: '', executedAt: '', duration: 0 } }; },
      async enrich(source) { return { ...source, doi: source.doi || 'test-doi' } as SourceRecord; },
      async getStatus() { return { healthy: true }; }
    });
    
    corpusBuilder = new Stage1CorpusBuilder({}, mockCorpusManager);
  });

  describe('buildCorpus', () => {
    it('should successfully build corpus from search strings', async () => {
      const mockSources = [
        createMockSourceRecord({ priority: 'A', is_seminal: true }),
        createMockSourceRecord({ priority: 'B', doi: '10.1000/test2' }),
        createMockSourceRecord({ priority: 'C' })
      ];
      mockCorpusManager.setMockResults(mockSources);

      const searchStrings = [
        createMockSearchString('machine learning'),
        createMockSearchString('neural networks')
      ];

      const result = await corpusBuilder.buildCorpus(searchStrings);

      expect(result.sources.length).toBe(6); // 3 sources × 2 searches
      expect(result.searchLog.length).toBe(2);
      expect(result.metrics.totalSearches).toBe(2);
      expect(result.metrics.errors).toBe(0);
      expect(result.library.sources).toEqual(result.sources);
    });

    it('should handle search failures gracefully', async () => {
      // Create an error manager
      const errorManager = new TestCorpusSourceManager();
      errorManager.search = async () => {
        throw new Error('API timeout');
      };

      const corpusBuilderWithError = new Stage1CorpusBuilder({}, errorManager);
      const searchStrings = [createMockSearchString('test query')];

      const result = await corpusBuilderWithError.buildCorpus(searchStrings);

      expect(result.sources.length).toBe(0);
      expect(result.metrics.errors).toBe(1);
      expect(result.searchLog[0].status).toBe('failed');
      expect(result.searchLog[0].errorMessage).toBe('API timeout');
    });

    it('should filter sources by quality threshold', async () => {
      const mockSources = [
        createMockSourceRecord({ priority: 'A' }),
        createMockSourceRecord({ priority: 'B' }),
        createMockSourceRecord({ priority: 'C' })
      ];
      mockCorpusManager.setMockResults(mockSources);

      // Configure to only accept A and B priority
      const highQualityBuilder = new Stage1CorpusBuilder(
        { minPriority: 'B' },
        mockCorpusManager
      );

      const searchStrings = [createMockSearchString('test')];
      const result = await highQualityBuilder.buildCorpus(searchStrings);

      expect(result.sources.length).toBe(2);
      expect(result.sources.every((s: SourceRecord) => ['A', 'B'].includes(s.priority))).toBe(true);
    });
  });

  describe('enrichSources', () => {
    it('should enrich sources with CrossRef data when DOI is available', async () => {
      const sources = [
        createMockSourceRecord({ doi: '10.1000/test' }),
        createMockSourceRecord({ doi: undefined })
      ];

      const enriched = await corpusBuilder.enrichSources(sources);

      expect(enriched.length).toBe(2);
      expect(enriched[0].doi).toBe('10.1000/test');
      expect(enriched[1].doi).toBeUndefined();
    });
  });

  describe('generateQualityMetrics', () => {
    it('should calculate comprehensive quality metrics', () => {
      const sources = [
        createMockSourceRecord({ priority: 'A', is_seminal: true, year: 2020, venue: 'Top Journal' }),
        createMockSourceRecord({ priority: 'B', is_seminal: false, year: 2021, venue: 'Good Journal' }),
        createMockSourceRecord({ priority: 'C', is_seminal: false, year: 2022, venue: 'Top Journal' }),
        createMockSourceRecord({ priority: 'A', is_seminal: true, year: 2023, venue: 'Another Journal' })
      ];

      const result = {
        sources,
        searchLog: [],
        library: { sources, generatedAt: new Date().toISOString() },
        metrics: {
          totalSearches: 1,
          totalResults: 4,
          deduplicatedResults: 4,
          averageResultsPerSearch: 4,
          adapterCoverage: { arxiv: 2, crossref: 2 },
          executionTime: 1000,
          errors: 0
        }
      };

      const metrics = corpusBuilder.generateQualityMetrics(result);

      expect(metrics.totalSources).toBe(4);
      expect(metrics.priorityDistribution).toEqual({ A: 2, B: 1, C: 1 });
      expect(metrics.seminalRatio).toBe(0.5); // 2 out of 4
      expect(metrics.doiCoverage).toBe(1.0); // All have DOI from mock
      expect(metrics.venueDiversity).toBeGreaterThan(0); // Multiple venues
      expect(metrics.yearSpread.min).toBe(2020);
      expect(metrics.yearSpread.max).toBe(2023);
    });

    it('should handle empty source list', () => {
      const result = {
        sources: [],
        searchLog: [],
        library: { sources: [], generatedAt: new Date().toISOString() },
        metrics: {
          totalSearches: 0,
          totalResults: 0,
          deduplicatedResults: 0,
          averageResultsPerSearch: 0,
          adapterCoverage: {},
          executionTime: 0,
          errors: 0
        }
      };

      const metrics = corpusBuilder.generateQualityMetrics(result);

      expect(metrics.totalSources).toBe(0);
      expect(metrics.priorityDistribution).toEqual({ A: 0, B: 0, C: 0 });
      expect(metrics.seminalRatio).toBe(0);
      expect(metrics.doiCoverage).toBe(0);
    });
  });

  describe('checkGateCriteria', () => {
    it('should pass gate criteria with sufficient quality sources', () => {
      const sources = [
        // 15 A + 15 B = 30 high priority sources
        ...Array.from({ length: 15 }, () => createMockSourceRecord({ priority: 'A', is_seminal: true })),
        ...Array.from({ length: 15 }, () => createMockSourceRecord({ priority: 'B', is_seminal: false })),
        // Additional sources don't affect gate criteria
        ...Array.from({ length: 5 }, () => createMockSourceRecord({ priority: 'C', is_seminal: false })),
      ];

      const result = {
        sources,
        searchLog: [],
        library: { sources, generatedAt: new Date().toISOString() },
        metrics: {
          totalSearches: 1,
          totalResults: sources.length,
          deduplicatedResults: sources.length,
          averageResultsPerSearch: sources.length,
          adapterCoverage: {},
          executionTime: 1000,
          errors: 0
        }
      };

      const gateCheck = corpusBuilder.checkGateCriteria(result);

      expect(gateCheck.passed).toBe(true);
      expect(gateCheck.criteria.every(c => c.passed)).toBe(true);
    });

    it('should fail gate criteria with insufficient quality', () => {
      const sources = [
        ...Array.from({ length: 10 }, () => createMockSourceRecord({ priority: 'C', is_seminal: false }))
      ];

      const result = {
        sources,
        searchLog: [],
        library: { sources, generatedAt: new Date().toISOString() },
        metrics: {
          totalSearches: 1,
          totalResults: sources.length,
          deduplicatedResults: sources.length,
          averageResultsPerSearch: sources.length,
          adapterCoverage: {},
          executionTime: 1000,
          errors: 0
        }
      };

      const gateCheck = corpusBuilder.checkGateCriteria(result);

      expect(gateCheck.passed).toBe(false);
      expect(gateCheck.criteria.find(c => c.name === 'High Priority Sources (A/B)')?.passed).toBe(false);
      expect(gateCheck.criteria.find(c => c.name === 'Seminal Sources')?.passed).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should apply custom configuration', () => {
      const config: CorpusBuildingConfig = {
        maxSourcesPerSearch: 25,
        minPriority: 'A',
        yearRange: [2020, 2023],
        includePreprints: false
      };

      const customBuilder = new Stage1CorpusBuilder(config);
      expect(customBuilder).toBeDefined();
    });

    it('should use default configuration when none provided', () => {
      const defaultBuilder = new Stage1CorpusBuilder();
      expect(defaultBuilder).toBeDefined();
    });
  });

  describe('adapter integration', () => {
    it('should track adapter coverage in metrics', async () => {
      const mockSources = [
        createMockSourceRecord({ id: 'arxiv-1' }),
        createMockSourceRecord({ id: 'crossref-1' })
      ];
      mockCorpusManager.setMockResults(mockSources);

      const searchStrings = [createMockSearchString('test query')];
      const result = await corpusBuilder.buildCorpus(searchStrings);

      expect(result.metrics.adapterCoverage).toHaveProperty('arxiv');
      expect(result.metrics.adapterCoverage).toHaveProperty('crossref');
    });

    it('should handle adapter health check integration', async () => {
      const healthCheck = await mockCorpusManager.checkHealth();
      expect(healthCheck.get('arxiv')).toBe(true);
      expect(healthCheck.get('crossref')).toBe(true);
    });
  });
});
