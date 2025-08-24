// CrossRef search adapter implementation
// Uses CrossRef API for DOI resolution, metadata enrichment, and citation search

import { BaseCorpusSourceAdapter } from './base';
import { SearchQuery, SearchResult, AdapterConfig } from './types';
import { SourceRecord } from '../domain/stage1';

/**
 * CrossRef API response structure
 */
interface CrossRefApiResponse {
  status: string;
  message: {
    'total-results': number;
    items: CrossRefWork[];
    query?: {
      'start-index': number;
      'search-terms': string;
    };
  };
}

interface CrossRefWork {
  DOI: string;
  title: string[];
  author?: Array<{
    given?: string;
    family: string;
    ORCID?: string;
  }>;
  published: {
    'date-parts': number[][];
  };
  'container-title'?: string[];
  publisher?: string;
  type: string;
  URL?: string;
  abstract?: string;
  subject?: string[];
  'is-referenced-by-count'?: number;
  score?: number; // Search relevance score
  indexed?: {
    'date-time': string;
  };
}

/**
 * CrossRef corpus source adapter
 * Provides DOI-based search and metadata enrichment
 */
export class CrossRefAdapter extends BaseCorpusSourceAdapter {
  private static readonly BASE_URL = 'https://api.crossref.org/works';
  private static readonly MAX_RESULTS_PER_REQUEST = 100;
  private static readonly POLITE_EMAIL = 'research@kniitnon.com'; // Required for polite pool

  constructor(config: AdapterConfig = {}) {
    super('crossref', {
      baseUrl: CrossRefAdapter.BASE_URL,
      rateLimit: { requestsPerMinute: 50 }, // CrossRef allows ~50/min for polite pool
      timeout: 20000,
      userAgent: 'KniitNon-Research-Engine/1.0 (mailto:research@kniitnon.com)',
      ...config
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Health check with minimal query
      const testUrl = new URL(this.config.baseUrl);
      testUrl.searchParams.set('query', 'machine learning');
      testUrl.searchParams.set('rows', '1');
      
      const response = await this.fetchWithTimeout(testUrl.toString(), {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async performSearch(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const searchUrl = this.buildSearchUrl(query);
    
    try {
      const response = await this.fetchWithTimeout(searchUrl, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`CrossRef API error: ${response.status} ${response.statusText}`);
      }
      
      const data: CrossRefApiResponse = await response.json();
      const sources = this.mapCrossRefWorksToSources(data.message.items);
      
      const duration = Date.now() - startTime;
      
      return {
        sources,
        totalCount: data.message['total-results'],
        metadata: {
          engine: this.name,
          query: query.query,
          executedAt: new Date().toISOString(),
          duration,
          rateLimitRemaining: this.getRateLimitRemaining(response)
        },
        warnings: this.generateWarnings(data, query)
      };
      
    } catch (error) {
      throw error; // Let base class handle error conversion
    }
  }

  /**
   * Enrich a source record with CrossRef metadata
   */
  async enrich(source: Partial<SourceRecord>): Promise<SourceRecord> {
    if (!source.doi) {
      return source as SourceRecord; // No DOI, can't enrich
    }

    try {
      const doiUrl = new URL(`${this.config.baseUrl}/${source.doi}`);
      const response = await this.fetchWithTimeout(doiUrl.toString(), {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        return source as SourceRecord; // Enrichment failed, return original
      }

      const data: { message: CrossRefWork } = await response.json();
      const enrichedSource = this.mapCrossRefWorkToSource(data.message);

      // Merge with original source, preserving existing fields
      return {
        ...enrichedSource,
        ...source, // Original source takes precedence
        id: source.id || enrichedSource.id,
        addedAt: source.addedAt || new Date().toISOString()
      } as SourceRecord;

    } catch (error) {
      console.warn(`CrossRef enrichment failed for DOI ${source.doi}:`, error);
      return source as SourceRecord;
    }
  }

  private buildSearchUrl(query: SearchQuery): string {
    const url = new URL(this.config.baseUrl);
    
    // Build CrossRef query string
    let searchTerms = query.query;
    
    // Add field-specific searches if needed
    if (query.categories?.length) {
      searchTerms += ` subject:"${query.categories.join('" OR subject:"')}"`;
    }
    
    url.searchParams.set('query', searchTerms);
    url.searchParams.set('rows', String(Math.min(query.maxResults || 20, CrossRefAdapter.MAX_RESULTS_PER_REQUEST)));
    url.searchParams.set('sort', this.mapSortOrder(query.sortBy || 'relevance'));
    
    // Year range filter
    if (query.yearRange) {
      const [startYear, endYear] = query.yearRange;
      url.searchParams.set('filter', `from-pub-date:${startYear},until-pub-date:${endYear}`);
    }
    
    // Only include journal articles if not including preprints
    if (!query.includePreprints) {
      const typeFilter = 'type:journal-article';
      const existingFilter = url.searchParams.get('filter');
      url.searchParams.set('filter', existingFilter ? `${existingFilter},${typeFilter}` : typeFilter);
    }
    
    return url.toString();
  }

  private mapCrossRefWorksToSources(works: CrossRefWork[]): SourceRecord[] {
    return works
      .filter(work => work.DOI && work.title?.length) // Must have DOI and title
      .map(work => this.mapCrossRefWorkToSource(work));
  }

  private mapCrossRefWorkToSource(work: CrossRefWork): SourceRecord {
    const authors = work.author?.map(author => {
      const given = author.given || '';
      const family = author.family || '';
      return given ? `${given} ${family}` : family;
    }) || [];

    const year = work.published?.['date-parts']?.[0]?.[0] || new Date().getFullYear();
    const venue = work['container-title']?.[0] || work.publisher || 'Unknown';
    const title = Array.isArray(work.title) ? work.title[0] : work.title || 'Untitled';

    // Determine priority based on citation count and journal reputation
    const citationCount = work['is-referenced-by-count'] || 0;
    const priority = this.calculatePriority(citationCount, venue, work.type);

    // Check if seminal (highly cited or in top venues)
    const isSeminal = this.isSeminalWork(citationCount, venue, work.type, year);

    return {
      id: `crossref:${work.DOI}`,
      doi: work.DOI,
      title,
      authors,
      venue,
      year,
      url: work.URL || `https://doi.org/${work.DOI}`,
      pdf_available: false, // CrossRef doesn't provide direct PDF access
      is_seminal: isSeminal,
      priority,
      addedAt: new Date().toISOString(),
      // Additional CrossRef-specific metadata can be stored separately if needed
      // metadata: {
      //   type: work.type,
      //   citationCount,
      //   publisher: work.publisher,
      //   indexed: work.indexed?.['date-time'],
      //   score: work.score
      // }
    };
  }

  private calculatePriority(citationCount: number, venue: string, type: string): 'A' | 'B' | 'C' {
    // High citation count = A priority
    if (citationCount > 100) return 'A';
    
    // Top venues get A priority
    if (this.isTopVenue(venue)) return 'A';
    
    // Journal articles with moderate citations = B
    if (type === 'journal-article' && citationCount > 10) return 'B';
    
    // Conference papers with some citations = B  
    if (type === 'proceedings-article' && citationCount > 5) return 'B';
    
    // Everything else = C
    return 'C';
  }

  private isSeminalWork(citationCount: number, venue: string, type: string, year: number): boolean {
    const age = new Date().getFullYear() - year;
    
    // Very highly cited works
    if (citationCount > 500) return true;
    
    // Highly cited recent works
    if (citationCount > 100 && age < 5) return true;
    
    // Papers in top venues with decent citations
    if (this.isTopVenue(venue) && citationCount > 50) return true;
    
    return false;
  }

  private isTopVenue(venue: string): boolean {
    // Simple venue reputation check - could be expanded with actual venue rankings
    const topVenues = [
      'Nature', 'Science', 'Cell', 'PNAS',
      'Nature Machine Intelligence', 'Nature Methods',
      'Journal of Machine Learning Research', 'Machine Learning',
      'Proceedings of the National Academy of Sciences',
      'ICML', 'NeurIPS', 'ICLR', 'AAAI', 'IJCAI'
    ];
    
    return topVenues.some(top => venue.toLowerCase().includes(top.toLowerCase()));
  }

  private mapSortOrder(sortBy: string): string {
    switch (sortBy) {
      case 'date': return 'published';
      case 'citations': return 'is-referenced-by-count';
      case 'relevance': 
      default: return 'score';
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': this.config.userAgent,
      'Accept': 'application/json'
    };
  }

  private getRateLimitRemaining(response: Response): number | undefined {
    const remaining = response.headers.get('X-Rate-Limit-Remaining');
    return remaining ? parseInt(remaining, 10) : undefined;
  }

  private generateWarnings(data: CrossRefApiResponse, query: SearchQuery): string[] {
    const warnings: string[] = [];
    
    if (data.message['total-results'] === 0) {
      warnings.push('No results found for query');
    }
    
    if (data.message.items.some(item => !item.DOI)) {
      warnings.push('Some results missing DOI');
    }
    
    if (query.maxResults && data.message['total-results'] > query.maxResults) {
      warnings.push(`Results truncated: ${data.message['total-results']} total, showing ${query.maxResults}`);
    }
    
    return warnings;
  }

  private async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    return super.fetchWithTimeout(url, options || {});
  }
}
