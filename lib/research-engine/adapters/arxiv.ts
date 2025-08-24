// ArXiv search adapter implementation
// Uses ArXiv API for academic paper search and metadata retrieval

import { BaseCorpusSourceAdapter } from './base';
import { SearchQuery, SearchResult, AdapterConfig } from './types';
import { SourceRecord } from '../domain/stage1';

/**
 * ArXiv-specific search categories
 */
export const ARXIV_CATEGORIES = {
  // Computer Science
  'cs.AI': 'Artificial Intelligence',
  'cs.CL': 'Computation and Language',
  'cs.CV': 'Computer Vision',
  'cs.LG': 'Machine Learning',
  'cs.SE': 'Software Engineering',
  
  // Mathematics
  'math.ST': 'Statistics Theory',
  'math.PR': 'Probability',
  'math.CO': 'Combinatorics',
  
  // Physics
  'physics.data-an': 'Data Analysis',
  'physics.soc-ph': 'Physics and Society',
  
  // Quantitative Biology
  'q-bio.QM': 'Quantitative Methods',
  'q-bio.GN': 'Genomics',
  
  // Quantitative Finance
  'q-fin.ST': 'Statistical Finance',
  'q-fin.CP': 'Computational Finance'
} as const;

/**
 * ArXiv API response structure
 */
interface ArXivApiResponse {
  feed: {
    entry?: ArXivEntry[];
    'opensearch:totalResults': { _: string };
  };
}

interface ArXivEntry {
  id: { _: string };
  title: { _: string };
  author?: Array<{ name: { _: string } }> | { name: { _: string } };
  published: { _: string };
  updated?: { _: string };
  category?: Array<{ _attributes: { term: string } }> | { _attributes: { term: string } };
  summary: { _: string };
  link?: Array<{ _attributes: { href: string; type?: string } }>;
  'arxiv:doi'?: { _: string };
  'arxiv:journal_ref'?: { _: string };
  'arxiv:comment'?: { _: string };
}

/**
 * ArXiv corpus source adapter
 */
export class ArXivAdapter extends BaseCorpusSourceAdapter {
  private static readonly BASE_URL = 'http://export.arxiv.org/api/query';
  private static readonly MAX_RESULTS_PER_REQUEST = 100;

  constructor(config: AdapterConfig = {}) {
    super('arxiv', {
      baseUrl: ArXivAdapter.BASE_URL,
      rateLimit: { requestsPerMinute: 20 }, // ArXiv recommends 3 seconds between requests
      timeout: 15000,
      ...config
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check - search for a single result
      const testUrl = new URL(this.config.baseUrl);
      testUrl.searchParams.set('search_query', 'all:test');
      testUrl.searchParams.set('max_results', '1');
      
      const response = await this.fetchWithTimeout(testUrl.toString());
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async performSearch(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const searchUrl = this.buildSearchUrl(query);
    
    try {
      const response = await this.fetchWithTimeout(searchUrl);
      const xmlText = await response.text();
      const data = await this.parseArXivXml(xmlText);
      
      const sources = data.feed.entry 
        ? (Array.isArray(data.feed.entry) ? data.feed.entry : [data.feed.entry])
            .map(entry => this.convertArXivEntry(entry))
            .filter((source): source is SourceRecord => source !== null)
        : [];
      
      const totalCount = parseInt(data.feed['opensearch:totalResults']._, 10) || sources.length;
      
      return {
        sources,
        totalCount,
        metadata: {
          engine: this.name,
          query: query.query,
          executedAt: new Date().toISOString(),
          duration: Date.now() - startTime
        },
        warnings: sources.length === 0 ? ['No results found'] : undefined
      };
      
    } catch (error) {
      console.error('ArXiv search failed:', error);
      throw error;
    }
  }

  /**
   * Build ArXiv search URL with proper query formatting
   */
  private buildSearchUrl(query: SearchQuery): string {
    const url = new URL(this.config.baseUrl);
    
    // Build search query string
    let searchQuery = this.formatArXivQuery(query.query);
    
    // Add category filters if specified
    if (query.categories && query.categories.length > 0) {
      const categoryFilter = query.categories
        .map(cat => `cat:${cat}`)
        .join(' OR ');
      searchQuery = `(${searchQuery}) AND (${categoryFilter})`;
    }
    
    // Add year range if specified
    if (query.yearRange) {
      const [startYear, endYear] = query.yearRange;
      searchQuery = `(${searchQuery}) AND submittedDate:[${startYear}0101 TO ${endYear}1231]`;
    }
    
    url.searchParams.set('search_query', searchQuery);
    url.searchParams.set('max_results', Math.min(
      query.maxResults || 25, 
      ArXivAdapter.MAX_RESULTS_PER_REQUEST
    ).toString());
    
    // Sort by relevance by default, or date if specified
    if (query.sortBy === 'date') {
      url.searchParams.set('sortBy', 'submittedDate');
      url.searchParams.set('sortOrder', 'descending');
    } else {
      url.searchParams.set('sortBy', 'relevance');
    }
    
    return url.toString();
  }

  /**
   * Format query for ArXiv search syntax
   */
  private formatArXivQuery(query: string): string {
    // Clean and normalize the query
    const cleaned = query.trim().replace(/['"]/g, '');
    
    // For multi-word queries, search in title, abstract, and authors
    if (cleaned.includes(' ')) {
      return `ti:"${cleaned}" OR abs:"${cleaned}" OR au:"${cleaned}"`;
    }
    
    // For single words, use the all field
    return `all:${cleaned}`;
  }

  /**
   * Parse ArXiv XML response
   */
  private async parseArXivXml(xmlText: string): Promise<ArXivApiResponse> {
    // Simple XML parsing - in production, consider using a proper XML parser
    // This is a basic implementation that works with ArXiv's consistent format
    
    try {
      // Extract total results
      const totalMatch = xmlText.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
      const totalResults = totalMatch ? totalMatch[1] : '0';
      
      // Extract entries
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const entries: ArXivEntry[] = [];
      let entryMatch;
      
      while ((entryMatch = entryRegex.exec(xmlText)) !== null) {
        const entryXml = entryMatch[1];
        const entry = this.parseArXivEntry(entryXml);
        if (entry) entries.push(entry);
      }
      
      return {
        feed: {
          entry: entries.length > 0 ? entries : undefined,
          'opensearch:totalResults': { _: totalResults }
        }
      };
    } catch (error) {
      console.error('Failed to parse ArXiv XML:', error);
      throw new Error('Invalid XML response from ArXiv');
    }
  }

  /**
   * Parse individual ArXiv entry from XML
   */
  private parseArXivEntry(entryXml: string): ArXivEntry | null {
    try {
      const extractText = (tag: string): string => {
        const match = entryXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return match ? match[1].trim() : '';
      };
      
      const extractAttribute = (tag: string, attr: string): string => {
        const match = entryXml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`));
        return match ? match[1] : '';
      };
      
      // Extract authors
      const authorMatches = entryXml.match(/<name>([^<]+)<\/name>/g) || [];
      const authors = authorMatches.map(match => {
        const nameMatch = match.match(/<name>([^<]+)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(Boolean);
      
      // Extract categories
      const categoryMatches = entryXml.match(/<category term="([^"]+)"/g) || [];
      const categories = categoryMatches.map(match => {
        const termMatch = match.match(/term="([^"]+)"/);
        return termMatch ? termMatch[1] : '';
      }).filter(Boolean);
      
      // Extract links
      const linkMatches = entryXml.match(/<link[^>]*href="([^"]+)"[^>]*(?:type="([^"]+)")?/g) || [];
      const links = linkMatches.map(match => {
        const hrefMatch = match.match(/href="([^"]+)"/);
        const typeMatch = match.match(/type="([^"]+)"/);
        return {
          _attributes: {
            href: hrefMatch ? hrefMatch[1] : '',
            type: typeMatch ? typeMatch[1] : undefined
          }
        };
      });
      
      const entry: ArXivEntry = {
        id: { _: extractText('id') },
        title: { _: extractText('title') },
        published: { _: extractText('published') },
        summary: { _: extractText('summary') }
      };
      
      // Add optional fields only if they have values
      if (authors.length > 0) {
        entry.author = authors.map(name => ({ name: { _: name } }));
      }
      
      const updatedText = extractText('updated');
      if (updatedText) {
        entry.updated = { _: updatedText };
      }
      
      if (categories.length > 0) {
        entry.category = categories.map(term => ({ _attributes: { term } }));
      }
      
      if (links.length > 0) {
        entry.link = links;
      }
      
      const doiText = extractText('arxiv:doi');
      if (doiText) {
        entry['arxiv:doi'] = { _: doiText };
      }
      
      const journalRefText = extractText('arxiv:journal_ref');
      if (journalRefText) {
        entry['arxiv:journal_ref'] = { _: journalRefText };
      }
      
      const commentText = extractText('arxiv:comment');
      if (commentText) {
        entry['arxiv:comment'] = { _: commentText };
      }
      
      return entry;
    } catch (error) {
      console.warn('Failed to parse ArXiv entry:', error);
      return null;
    }
  }

  /**
   * Convert ArXiv entry to SourceRecord
   */
  private convertArXivEntry(entry: ArXivEntry): SourceRecord | null {
    try {
      // Extract ArXiv ID for URL
      const arxivId = entry.id._.split('/').pop()?.replace('abs/', '') || '';
      
      // Get PDF and abstract URLs
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
      const abstractUrl = `https://arxiv.org/abs/${arxivId}`;
      
      // Extract authors
      const authors = entry.author
        ? Array.isArray(entry.author)
          ? entry.author.map(a => a.name._)
          : [entry.author.name._]
        : [];
      
      // Extract year from published date
      const publishedDate = entry.published._;
      const year = this.extractYear(publishedDate);
      
      // Determine venue from journal reference
      const venue = entry['arxiv:journal_ref']?._ || null;
      
      // Check for DOI
      const doi = entry['arxiv:doi']?._ || null;
      
      // Extract categories for priority determination
      const categories = entry.category
        ? Array.isArray(entry.category)
          ? entry.category.map(c => c._attributes.term)
          : [entry.category._attributes.term]
        : [];
      
      // Determine priority based on categories and other signals
      const priority = this.determineArXivPriority(categories, entry);
      
      return {
        title: entry.title._.replace(/\n/g, ' ').trim(),
        authors,
        doi,
        venue,
        year,
        url: abstractUrl,
        pdf_available: true, // ArXiv papers always have PDFs
        is_seminal: false, // Would need additional processing to determine
        priority,
        addedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to convert ArXiv entry:', error);
      return null;
    }
  }

  /**
   * Determine priority for ArXiv sources
   */
  private determineArXivPriority(categories: string[], entry: ArXivEntry): 'A' | 'B' | 'C' {
    // Check for high-impact categories
    const highImpactCategories = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'];
    const hasHighImpactCategory = categories.some(cat => highImpactCategories.includes(cat));
    
    // Check for journal publication
    const hasJournalRef = Boolean(entry['arxiv:journal_ref']?._);
    
    // Check for DOI (often indicates journal publication)
    const hasDoi = Boolean(entry['arxiv:doi']?._);
    
    // Priority logic
    if ((hasHighImpactCategory && hasJournalRef) || hasDoi) {
      return 'A';
    }
    
    if (hasHighImpactCategory || hasJournalRef) {
      return 'B';
    }
    
    return 'C';
  }

  /**
   * Enrich ArXiv source with additional metadata
   */
  async enrich(source: Partial<SourceRecord>): Promise<SourceRecord> {
    const enriched = await super.enrich(source);
    
    // If we have an ArXiv URL, try to extract more metadata
    if (enriched.url && enriched.url.includes('arxiv.org')) {
      // Could add additional enrichment logic here
      // For now, just ensure PDF availability is set correctly
      enriched.pdf_available = true;
    }
    
    return enriched;
  }
}
