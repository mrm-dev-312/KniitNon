// Research Engine Adapters - Corpus Source Integration
// Exports all adapter functionality for external data sources

export * from './types';
export * from './base';
export * from './arxiv';
export * from './crossref';
export * from './deduplicator';
export * from './manager';

// Re-export key classes and functions for convenience
export { ArXivAdapter } from './arxiv';
export { CrossRefAdapter } from './crossref';
export { CorpusDeduplicator, deduplicateSources, quickDedupe } from './deduplicator';
export { DefaultCorpusSourceManager, createCorpusSourceManager, createCustomCorpusSourceManager } from './manager';
