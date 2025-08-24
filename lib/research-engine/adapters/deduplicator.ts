// Corpus deduplication utilities
// Identifies and merges duplicate sources using multiple strategies

import { SourceRecord } from '../domain/stage1';

/**
 * Deduplication strategy configuration
 */
export interface DeduplicationConfig {
  /** Enable DOI-based matching (exact match) */
  useDoi: boolean;
  /** Enable fuzzy title matching */
  useFuzzyTitle: boolean;
  /** Title similarity threshold (0-1) */
  titleThreshold: number;
  /** Enable author overlap matching */
  useAuthorOverlap: boolean;
  /** Author overlap threshold (0-1) */
  authorThreshold: number;
  /** Prefer higher priority sources in merges */
  priorityPreference: boolean;
}

/**
 * Duplicate detection result
 */
export interface DuplicateGroup {
  /** Primary source (highest priority or first found) */
  primary: SourceRecord;
  /** Duplicate sources to be merged */
  duplicates: SourceRecord[];
  /** Matching strategy that found this group */
  matchStrategy: 'doi' | 'title' | 'author' | 'composite';
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Deduplication result summary
 */
export interface DeduplicationResult {
  /** Deduplicated sources */
  deduplicated: SourceRecord[];
  /** Groups of duplicates found */
  duplicateGroups: DuplicateGroup[];
  /** Original count before deduplication */
  originalCount: number;
  /** Final count after deduplication */
  finalCount: number;
  /** Summary statistics */
  stats: {
    removedCount: number;
    removalRate: number;
    doiMatches: number;
    titleMatches: number;
    authorMatches: number;
  };
}

/**
 * Corpus deduplication engine
 */
export class CorpusDeduplicator {
  private config: DeduplicationConfig;

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = {
      useDoi: true,
      useFuzzyTitle: true,
      titleThreshold: 0.85,
      useAuthorOverlap: true,
      authorThreshold: 0.7,
      priorityPreference: true,
      ...config
    };
  }

  /**
   * Deduplicate a collection of sources
   */
  deduplicate(sources: SourceRecord[]): DeduplicationResult {
    const startTime = Date.now();
    const originalCount = sources.length;
    
    if (originalCount === 0) {
      return this.emptyResult(originalCount);
    }

    // Find duplicate groups using multiple strategies
    const duplicateGroups = this.findDuplicateGroups(sources);
    
    // Merge duplicates, keeping the best version of each
    const deduplicated = this.mergeDuplicateGroups(sources, duplicateGroups);
    
    const finalCount = deduplicated.length;
    const removedCount = originalCount - finalCount;

    return {
      deduplicated,
      duplicateGroups,
      originalCount,
      finalCount,
      stats: {
        removedCount,
        removalRate: originalCount > 0 ? removedCount / originalCount : 0,
        doiMatches: duplicateGroups.filter(g => g.matchStrategy === 'doi').length,
        titleMatches: duplicateGroups.filter(g => g.matchStrategy === 'title').length,
        authorMatches: duplicateGroups.filter(g => g.matchStrategy === 'author').length
      }
    };
  }

  private findDuplicateGroups(sources: SourceRecord[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const sourceId = source.id || `temp-${i}`;

      if (processed.has(sourceId)) {
        continue;
      }

      const duplicates: SourceRecord[] = [];
      let matchStrategy: DuplicateGroup['matchStrategy'] = 'doi';
      let confidence = 0;

      // Find all duplicates of this source
      for (let j = i + 1; j < sources.length; j++) {
        const candidate = sources[j];
        const candidateId = candidate.id || `temp-${j}`;

        if (processed.has(candidateId)) {
          continue;
        }

        const match = this.findDuplicateMatch(source, candidate);
        if (match.isDuplicate) {
          duplicates.push(candidate);
          processed.add(candidateId);
          matchStrategy = match.strategy;
          confidence = Math.max(confidence, match.confidence);
        }
      }

      if (duplicates.length > 0) {
        groups.push({
          primary: source,
          duplicates,
          matchStrategy,
          confidence
        });
        processed.add(sourceId);
      }
    }

    return groups;
  }

  private findDuplicateMatch(source1: SourceRecord, source2: SourceRecord): {
    isDuplicate: boolean;
    strategy: DuplicateGroup['matchStrategy'];
    confidence: number;
  } {
    // DOI matching (highest confidence)
    if (this.config.useDoi && this.hasSameDoi(source1, source2)) {
      return {
        isDuplicate: true,
        strategy: 'doi',
        confidence: 1.0
      };
    }

    // Title matching
    if (this.config.useFuzzyTitle) {
      const titleSimilarity = this.calculateTitleSimilarity(source1.title, source2.title);
      if (titleSimilarity >= this.config.titleThreshold) {
        return {
          isDuplicate: true,
          strategy: 'title',
          confidence: titleSimilarity
        };
      }
    }

    // Author overlap matching
    if (this.config.useAuthorOverlap) {
      const authorOverlap = this.calculateAuthorOverlap(source1.authors || [], source2.authors || []);
      if (authorOverlap >= this.config.authorThreshold) {
        // Also check if titles are reasonably similar
        const titleSim = this.calculateTitleSimilarity(source1.title, source2.title);
        if (titleSim >= 0.6) { // Lower threshold when combined with author match
          return {
            isDuplicate: true,
            strategy: 'author',
            confidence: (authorOverlap + titleSim) / 2
          };
        }
      }
    }

    return {
      isDuplicate: false,
      strategy: 'doi',
      confidence: 0
    };
  }

  private hasSameDoi(source1: SourceRecord, source2: SourceRecord): boolean {
    if (!source1.doi || !source2.doi) {
      return false;
    }
    
    // Normalize DOIs (remove prefixes, case insensitive)
    const doi1 = this.normalizeDoi(source1.doi);
    const doi2 = this.normalizeDoi(source2.doi);
    
    return doi1 === doi2;
  }

  private normalizeDoi(doi: string): string {
    return doi
      .toLowerCase()
      .replace(/^(doi:|https?:\/\/(dx\.)?doi\.org\/)/, '')
      .trim();
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    if (!title1 || !title2) {
      return 0;
    }

    // Normalize titles
    const norm1 = this.normalizeTitle(title1);
    const norm2 = this.normalizeTitle(title2);

    if (norm1 === norm2) {
      return 1.0;
    }

    // Use Jaccard similarity on word sets
    return this.jaccardSimilarity(norm1, norm2);
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private jaccardSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' ').filter(w => w.length > 2)); // Ignore short words
    const words2 = new Set(str2.split(' ').filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private calculateAuthorOverlap(authors1: string[], authors2: string[]): number {
    if (authors1.length === 0 || authors2.length === 0) {
      return 0;
    }

    // Normalize author names for comparison
    const norm1 = authors1.map(a => this.normalizeAuthorName(a));
    const norm2 = authors2.map(a => this.normalizeAuthorName(a));

    const set1 = new Set(norm1);
    const set2 = new Set(norm2);

    const intersection = new Set([...set1].filter(a => set2.has(a)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private normalizeAuthorName(name: string): string {
    // Simple normalization - could be enhanced with more sophisticated name matching
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mergeDuplicateGroups(sources: SourceRecord[], groups: DuplicateGroup[]): SourceRecord[] {
    const toRemove = new Set<string>();
    const merged = new Map<string, SourceRecord>();

    // Mark duplicates for removal and create merged versions
    for (const group of groups) {
      // Choose the best source as primary
      const primary = this.selectPrimarySource([group.primary, ...group.duplicates]);
      const primaryId = primary.id || `temp-${sources.indexOf(primary)}`;
      
      merged.set(primaryId, primary);

      // Mark all others for removal
      for (const dup of [group.primary, ...group.duplicates]) {
        const dupId = dup.id || `temp-${sources.indexOf(dup)}`;
        if (dupId !== primaryId) {
          toRemove.add(dupId);
        }
      }
    }

    // Return sources with duplicates removed and primaries replaced with merged versions
    return sources.filter((source, index) => {
      const sourceId = source.id || `temp-${index}`;
      return !toRemove.has(sourceId);
    }).map((source, index) => {
      const sourceId = source.id || `temp-${index}`;
      return merged.get(sourceId) || source;
    });
  }

  private selectPrimarySource(candidates: SourceRecord[]): SourceRecord {
    if (candidates.length === 1) {
      return candidates[0];
    }

    if (this.config.priorityPreference) {
      // Sort by priority (A > B > C) first
      const priorityOrder = { 'A': 3, 'B': 2, 'C': 1 };
      candidates.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] || 0;
        const priorityB = priorityOrder[b.priority] || 0;
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
        
        // If same priority, prefer DOI
        if (b.doi && !a.doi) return 1;
        if (a.doi && !b.doi) return -1;
        
        // If same priority and DOI status, use completeness score
        return this.calculateCompletenessScore(b) - this.calculateCompletenessScore(a);
      });
      
      return candidates[0];
    }

    // Prefer sources with DOI (only when priority preference is disabled)
    const withDoi = candidates.filter(c => c.doi);
    if (withDoi.length > 0) {
      return withDoi[0];
    }

    // Prefer sources with more complete metadata
    candidates.sort((a, b) => this.calculateCompletenessScore(b) - this.calculateCompletenessScore(a));

    return candidates[0];
  }

  private calculateCompletenessScore(source: SourceRecord): number {
    let score = 0;
    
    if (source.doi) score += 3;
    if (source.authors?.length) score += 2;
    if (source.venue) score += 2;
    if (source.year) score += 1;
    if (source.url) score += 1;
    
    return score;
  }

  private emptyResult(originalCount: number): DeduplicationResult {
    return {
      deduplicated: [],
      duplicateGroups: [],
      originalCount,
      finalCount: 0,
      stats: {
        removedCount: 0,
        removalRate: 0,
        doiMatches: 0,
        titleMatches: 0,
        authorMatches: 0
      }
    };
  }
}

/**
 * Factory function for easy deduplication
 */
export function deduplicateSources(
  sources: SourceRecord[], 
  config?: Partial<DeduplicationConfig>
): DeduplicationResult {
  const deduplicator = new CorpusDeduplicator(config);
  return deduplicator.deduplicate(sources);
}

/**
 * Quick deduplication with sensible defaults
 */
export function quickDedupe(sources: SourceRecord[]): SourceRecord[] {
  return deduplicateSources(sources).deduplicated;
}
