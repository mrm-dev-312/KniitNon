// Tests for CorpusSourceAdapter implementations
// Comprehensive testing of ArXiv, CrossRef adapters and deduplication

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ArXivAdapter } from '../lib/research-engine/adapters/arxiv';
import { CrossRefAdapter } from '../lib/research-engine/adapters/crossref';
import { CorpusDeduplicator, deduplicateSources } from '../lib/research-engine/adapters/deduplicator';
import { DefaultCorpusSourceManager } from '../lib/research-engine/adapters/manager';
import { SearchQuery, SearchResult } from '../lib/research-engine/adapters/types';
import { SourceRecord } from '../lib/research-engine/domain/stage1';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('CorpusSourceAdapter Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('ArXivAdapter', () => {
    let adapter: ArXivAdapter;

    beforeEach(() => {
      adapter = new ArXivAdapter({
        timeout: 5000
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.name).toBe('arxiv');
    });

    it('should build correct search URL', async () => {
      const query: SearchQuery = {
        query: 'machine learning',
        maxResults: 10,
        yearRange: [2020, 2023],
        sortBy: 'date'
      };

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">0</opensearch:totalResults>
</feed>`)
      } as Response);

      await adapter.search(query);

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      // The ArXiv adapter uses URL encoding and creates complex queries for multi-word searches
      expect(callUrl).toContain('search_query='); 
      expect(callUrl).toContain('machine');
      expect(callUrl).toContain('learning');
      expect(callUrl).toContain('max_results=10');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.search({ query: 'test' });

      expect(result.sources).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Network error')]));
    });

    it('should parse ArXiv XML response correctly', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2101.00001v1</id>
    <title>Test Machine Learning Paper</title>
    <author><name>John Doe</name></author>
    <author><name>Jane Smith</name></author>
    <published>2021-01-01T00:00:00Z</published>
    <summary>This is a test paper about machine learning.</summary>
    <arxiv:doi>10.1000/test</arxiv:doi>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse)
      } as Response);

      const result = await adapter.search({ query: 'test' });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toMatchObject({
        title: 'Test Machine Learning Paper',
        authors: ['John Doe', 'Jane Smith'],
        doi: '10.1000/test',
        year: 2021
      });
    });
  });

  describe('CrossRefAdapter', () => {
    let adapter: CrossRefAdapter;

    beforeEach(() => {
      adapter = new CrossRefAdapter({
        timeout: 5000
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.name).toBe('crossref');
    });

    it('should build correct search URL with filters', async () => {
      const query: SearchQuery = {
        query: 'machine learning',
        maxResults: 20,
        yearRange: [2020, 2023],
        includePreprints: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'ok',
          message: {
            'total-results': 0,
            items: []
          }
        })
      } as Response);

      await adapter.search(query);

      const callUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain('query=machine+learning');
      expect(callUrl).toContain('rows=20');
      // The CrossRef adapter uses URL encoding for filters 
      expect(callUrl).toContain('filter=');
      expect(callUrl).toContain('from-pub-date');
      expect(callUrl).toContain('2020');
      expect(callUrl).toContain('2023');
    });

    it('should parse CrossRef JSON response correctly', async () => {
      const mockJsonResponse = {
        status: 'ok',
        message: {
          'total-results': 1,
          items: [{
            DOI: '10.1000/test',
            title: ['Test Machine Learning Paper'],
            author: [
              { given: 'John', family: 'Doe' },
              { given: 'Jane', family: 'Smith' }
            ],
            published: {
              'date-parts': [[2021, 1, 1]]
            },
            'container-title': ['Journal of AI'],
            type: 'journal-article',
            'is-referenced-by-count': 150,
            URL: 'https://example.com/paper'
          }]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJsonResponse),
        headers: {
          get: (name: string) => name === 'X-Rate-Limit-Remaining' ? '45' : null
        }
      } as unknown as Response);

      const result = await adapter.search({ query: 'test' });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toMatchObject({
        doi: '10.1000/test',
        title: 'Test Machine Learning Paper',
        authors: ['John Doe', 'Jane Smith'],
        venue: 'Journal of AI',
        year: 2021,
        priority: 'A' // Should be A due to high citation count
      });
      expect(result.metadata.rateLimitRemaining).toBe(45);
    });

    it('should enrich source with DOI lookup', async () => {
      const partialSource: Partial<SourceRecord> = {
        id: 'test-1',
        doi: '10.1000/test',
        title: 'Incomplete Title'
      };

      const mockEnrichResponse = {
        message: {
          DOI: '10.1000/test',
          title: ['Complete Title from CrossRef'],
          author: [{ given: 'John', family: 'Doe' }],
          published: { 'date-parts': [[2021, 1, 1]] },
          'container-title': ['Test Journal'],
          type: 'journal-article'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEnrichResponse)
      } as Response);

      const enriched = await adapter.enrich!(partialSource);

      expect(enriched).toMatchObject({
        id: 'test-1', // Original ID preserved
        title: 'Incomplete Title', // Original title preserved (takes precedence)
        authors: ['John Doe'], // Enriched data added
        venue: 'Test Journal'
      });
    });
  });

  describe('CorpusDeduplicator', () => {
    let deduplicator: CorpusDeduplicator;

    beforeEach(() => {
      deduplicator = new CorpusDeduplicator({
        useDoi: true,
        useFuzzyTitle: true,
        titleThreshold: 0.75, // Lower for testing
        useAuthorOverlap: true,
        authorThreshold: 0.5 // Lower for testing
      });
    });

    it('should deduplicate sources with identical DOIs', () => {
      const sources: SourceRecord[] = [
        {
          id: '1',
          doi: '10.1000/test',
          title: 'Test Paper',
          authors: ['John Doe'],
          priority: 'A',
          venue: 'Journal A',
          year: 2021
        },
        {
          id: '2', 
          doi: '10.1000/test', // Same DOI
          title: 'Test Paper (Different Title)',
          authors: ['John Doe'],
          priority: 'B',
          venue: 'Journal B',
          year: 2021
        }
      ];

      const result = deduplicator.deduplicate(sources);

      expect(result.finalCount).toBe(1);
      expect(result.stats.removedCount).toBe(1);
      expect(result.stats.doiMatches).toBe(1);
      expect(result.deduplicated[0].priority).toBe('A'); // Higher priority should be kept
    });

    it('should deduplicate sources with similar titles', () => {
      const sources: SourceRecord[] = [
        {
          id: '1',
          title: 'Machine Learning Applications in Healthcare',
          authors: ['Alice Smith'],
          priority: 'B',
          venue: 'Journal A',
          year: 2021
        },
        {
          id: '2',
          title: 'Machine Learning Applications Healthcare', // Very similar
          authors: ['Alice Smith'],
          priority: 'A',
          venue: 'Journal B', 
          year: 2021
        }
      ];

      const result = deduplicator.deduplicate(sources);

      expect(result.finalCount).toBe(1);
      expect(result.stats.titleMatches).toBe(1);
      expect(result.deduplicated[0].priority).toBe('A');
    });

    it('should deduplicate sources with author overlap', () => {
      const sources: SourceRecord[] = [
        {
          id: '1',
          title: 'Artificial Intelligence Research Methods', 
          authors: ['John Doe', 'Jane Smith', 'Bob Johnson'],
          priority: 'B',
          venue: 'Conference A',
          year: 2021
        },
        {
          id: '2',
          title: 'Artificial Intelligence Research Methods and Applications', // Very similar title
          authors: ['John Doe', 'Jane Smith', 'Alice Wilson'], // 2/3 authors match (66.7% overlap)
          priority: 'A',
          venue: 'Conference B',
          year: 2021
        }
      ];

      const result = deduplicator.deduplicate(sources);

      expect(result.finalCount).toBe(1);
      expect(result.stats.authorMatches).toBe(1);
    });

    it('should not deduplicate different papers', () => {
      const sources: SourceRecord[] = [
        {
          id: '1',
          title: 'Machine Learning in Healthcare',
          authors: ['Alice Smith'],
          priority: 'A',
          venue: 'Journal A',
          year: 2021
        },
        {
          id: '2',
          title: 'Deep Learning for Computer Vision',
          authors: ['Bob Jones'],
          priority: 'A',
          venue: 'Journal B',
          year: 2021
        }
      ];

      const result = deduplicator.deduplicate(sources);

      expect(result.finalCount).toBe(2);
      expect(result.stats.removedCount).toBe(0);
    });

    it('should handle empty source list', () => {
      const result = deduplicator.deduplicate([]);

      expect(result.finalCount).toBe(0);
      expect(result.originalCount).toBe(0);
      expect(result.stats.removalRate).toBe(0);
    });
  });

  describe('DefaultCorpusSourceManager', () => {
    let manager: DefaultCorpusSourceManager;

    beforeEach(() => {
      manager = new DefaultCorpusSourceManager({
        maxConcurrent: 2,
        searchTimeout: 5000
      });
    });

    it('should initialize with default adapters', () => {
      const adapters = manager.getAdapters();
      
      expect(adapters).toHaveLength(2);
      expect(adapters.some(a => a.name === 'arxiv')).toBe(true);
      expect(adapters.some(a => a.name === 'crossref')).toBe(true);
    });

    it('should add and remove adapters', () => {
      const initialCount = manager.getAdapters().length;
      
      // Simply test with existing adapter removal and re-addition
      manager.removeAdapter('arxiv');
      expect(manager.getAdapters()).toHaveLength(initialCount - 1);
      
      // Add ArXiv back
      manager.addAdapter(new ArXivAdapter());
      expect(manager.getAdapters()).toHaveLength(initialCount);
    });

    it('should execute multi-adapter search with deduplication', async () => {
      // Mock both adapters to return overlapping results
      const arxivResponse = {
        sources: [{
          id: 'arxiv:1',
          title: 'Test Paper',
          authors: ['John Doe'],
          priority: 'A' as const,
          venue: 'ArXiv',
          year: 2021
        }],
        totalCount: 1,
        metadata: {
          engine: 'arxiv',
          query: 'test',
          executedAt: '2023-01-01T00:00:00.000Z',
          duration: 1000
        }
      };

      const crossrefResponse = {
        sources: [{
          id: 'crossref:1',
          title: 'Test Paper', // Same title - should be deduplicated
          authors: ['John Doe'],
          priority: 'B' as const,
          venue: 'Journal',
          year: 2021
        }],
        totalCount: 1,
        metadata: {
          engine: 'crossref',
          query: 'test',
          executedAt: '2023-01-01T00:00:00.000Z',
          duration: 1200
        }
      };

      // Mock the search method for both adapters
      const arxivAdapter = manager.getAdapters().find(a => a.name === 'arxiv');
      const crossrefAdapter = manager.getAdapters().find(a => a.name === 'crossref');
      
      jest.spyOn(arxivAdapter!, 'search').mockResolvedValue(arxivResponse);
      jest.spyOn(crossrefAdapter!, 'search').mockResolvedValue(crossrefResponse);

      const result = await manager.search({ query: 'test' });

      expect(result.sources).toHaveLength(1); // Deduplicated from 2 to 1
      expect(result.metadata.adaptersUsed).toContain('arxiv');
      expect(result.metadata.adaptersUsed).toContain('crossref');
      expect(result.byAdapter.size).toBe(2);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate deduplication with search results', () => {
      const sources: SourceRecord[] = [
        {
          id: 'arxiv:1',
          title: 'Machine Learning Paper',
          authors: ['John Doe'],
          priority: 'A',
          venue: 'ArXiv',
          year: 2021
        },
        {
          id: 'crossref:1',
          doi: '10.1000/test',
          title: 'Machine Learning Paper', // Exact match
          authors: ['John Doe'],
          priority: 'B',
          venue: 'Journal',
          year: 2021
        }
      ];

      const result = deduplicateSources(sources);

      expect(result.deduplicated).toHaveLength(1);
      expect(result.deduplicated[0].priority).toBe('A'); // ArXiv version kept (higher priority)
    });

    it('should handle complex deduplication scenarios', () => {
      const sources: SourceRecord[] = [
        // DOI duplicate group
        { id: '1', doi: '10.1000/paper1', title: 'Paper 1', authors: ['A'], priority: 'A', venue: 'J1', year: 2021 },
        { id: '2', doi: '10.1000/paper1', title: 'Paper 1 (preprint)', authors: ['A'], priority: 'B', venue: 'ArXiv', year: 2021 },
        
        // Title similarity group - make more similar to meet threshold
        { id: '3', title: 'Deep Learning for Computer Vision Applications', authors: ['B'], priority: 'A', venue: 'J2', year: 2022 },
        { id: '4', title: 'Deep Learning for Computer Vision Applications', authors: ['B'], priority: 'C', venue: 'Conf', year: 2022 },
        
        // Author overlap group with similar titles  
        { id: '5', title: 'Natural Language Processing Methods and Applications', authors: ['C', 'D', 'E'], priority: 'B', venue: 'J3', year: 2021 },
        { id: '6', title: 'Natural Language Processing Methods and Applications', authors: ['C', 'D', 'F'], priority: 'A', venue: 'J4', year: 2021 },
        
        // Unique paper
        { id: '7', title: 'Completely Different Topic', authors: ['G'], priority: 'A', venue: 'J5', year: 2023 }
      ];

      const result = deduplicateSources(sources);

      expect(result.originalCount).toBe(7);
      expect(result.finalCount).toBe(4); // 3 duplicate groups + 1 unique = 4 final
      expect(result.stats.removedCount).toBe(3);
      expect(result.stats.removalRate).toBeCloseTo(3/7);
    });
  });
});
