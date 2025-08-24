// Schema Integration Tests
// Verify that TypeScript interfaces align with JSON schemas and validation works correctly

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Stage0Validators, Stage1Validators, SchemaValidator } from '../validation';
import { isTopicScope, isSearchString, isSourceRecord, DomainUtils } from '../utils';
import type { TopicScope, SearchString, SourceRecord } from '../domain';

describe('Schema Integration Tests', () => {
  
  beforeEach(() => {
    SchemaValidator.clearCache();
  });

  describe('Stage 0 Schema Validation', () => {
    
    it('should validate a valid TopicScope object', () => {
      const validTopicScope: TopicScope = {
        topic_one_liner: 'Impact of AI on healthcare research methodologies',
        venue_style: 'APA',
        refined_questions: [
          'How has AI influenced systematic review processes?',
          'What are the current limitations of AI in meta-analysis?',
          'What ethical considerations emerge from AI-driven research?'
        ],
        inclusion_rules: ['Published after 2020', 'Peer-reviewed journals'],
        exclusion_rules: ['Non-English publications', 'Conference abstracts']
      };

      const result = Stage0Validators.validateTopicScope(validTopicScope);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual(validTopicScope);
    });

    it('should reject TopicScope with invalid venue_style', () => {
      const invalidTopicScope = {
        topic_one_liner: 'AI in healthcare research',
        venue_style: 'INVALID'
      };

      const result = Stage0Validators.validateTopicScope(invalidTopicScope);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('venue_style');
    });

    it('should reject TopicScope with short topic_one_liner', () => {
      const invalidTopicScope = {
        topic_one_liner: 'AI',
        venue_style: 'APA'
      };

      const result = Stage0Validators.validateTopicScope(invalidTopicScope);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

  });

  describe('Stage 1 Schema Validation', () => {
    
    it('should validate a valid SearchString object', () => {
      const validSearchString: SearchString = {
        id: 'search-123',
        text: 'artificial intelligence healthcare',
        rationale: 'Core search terms for AI in healthcare',
        enginesRun: ['pubmed', 'arxiv'],
        lastRunAt: '2025-08-23T10:30:00Z',
        stageGenerated: 1
      };

      const result = Stage1Validators.validateSearchString(validSearchString);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual(validSearchString);
    });

    it('should validate a valid SourceRecord object', () => {
      const validSourceRecord: SourceRecord = {
        id: 'src-456',
        doi: '10.1234/example.2025',
        title: 'Machine Learning in Clinical Decision Support Systems',
        authors: ['Smith, J.', 'Johnson, A.', 'Brown, M.'],
        venue: 'Journal of Medical AI',
        year: 2024,
        url: 'https://doi.org/10.1234/example.2025',
        pdf_available: true,
        is_seminal: true,
        priority: 'A',
        addedAt: '2025-08-23T10:30:00Z'
      };

      const result = Stage1Validators.validateSourceRecord(validSourceRecord);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual(validSourceRecord);
    });

    it('should reject SourceRecord with invalid priority', () => {
      const invalidSourceRecord = {
        title: 'Some Research Paper',
        priority: 'D' // Invalid priority
      };

      const result = Stage1Validators.validateSourceRecord(invalidSourceRecord);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject SourceRecord with invalid DOI format', () => {
      const invalidSourceRecord = {
        title: 'Some Research Paper',
        doi: 'invalid-doi',
        priority: 'A'
      };

      const result = Stage1Validators.validateSourceRecord(invalidSourceRecord);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

  });

  describe('Type Guards', () => {
    
    it('should correctly identify valid TopicScope objects', () => {
      const validTopicScope: TopicScope = {
        topic_one_liner: 'Impact of AI on healthcare research methodologies',
        venue_style: 'APA'
      };

      expect(isTopicScope(validTopicScope)).toBe(true);
      expect(isTopicScope({})).toBe(false);
      expect(isTopicScope(null)).toBe(false);
      expect(isTopicScope('not an object')).toBe(false);
    });

    it('should correctly identify valid SearchString objects', () => {
      const validSearchString: SearchString = {
        text: 'artificial intelligence healthcare'
      };

      expect(isSearchString(validSearchString)).toBe(true);
      expect(isSearchString({ text: 'AIHealth' })).toBe(true); // Minimum valid (3+ chars)
      expect(isSearchString({ text: 'AB' })).toBe(false); // Too short
      expect(isSearchString({})).toBe(false);
    });

    it('should correctly identify valid SourceRecord objects', () => {
      const validSourceRecord: SourceRecord = {
        title: 'Machine Learning in Clinical Decision Support Systems',
        priority: 'A'
      };

      expect(isSourceRecord(validSourceRecord)).toBe(true);
      expect(isSourceRecord({ title: 'Test', priority: 'D' })).toBe(false); // Invalid priority
      expect(isSourceRecord({ title: 'AB', priority: 'A' })).toBe(false); // Title too short
    });

  });

  describe('Domain Utilities', () => {
    
    it('should create valid ConversationTurn objects', () => {
      const turn = DomainUtils.createConversationTurn('turn-1', 'user', 'Hello AI');
      
      expect(turn.id).toBe('turn-1');
      expect(turn.role).toBe('user');
      expect(turn.content).toBe('Hello AI');
      expect(turn.ts).toBeDefined();
      expect(DomainUtils.isValidTimestamp(turn.ts)).toBe(true);
    });

    it('should create valid SourceRecord objects with defaults', () => {
      const source = DomainUtils.createSourceRecord('Test Paper', 'A');
      
      expect(source.title).toBe('Test Paper');
      expect(source.priority).toBe('A');
      expect(source.authors).toEqual([]);
      expect(source.pdf_available).toBe(false);
      expect(source.is_seminal).toBe(false);
      expect(source.addedAt).toBeDefined();
    });

    it('should validate DOI format correctly', () => {
      expect(DomainUtils.isValidDOI('10.1234/example.2025')).toBe(true);
      expect(DomainUtils.isValidDOI('10.5555/test')).toBe(true);
      expect(DomainUtils.isValidDOI('invalid-doi')).toBe(false);
      expect(DomainUtils.isValidDOI('11.1234/example')).toBe(false);
    });

    it('should generate unique IDs with prefix', () => {
      const id1 = DomainUtils.generateId('test');
      const id2 = DomainUtils.generateId('test');
      
      expect(id1).toContain('test-');
      expect(id2).toContain('test-');
      expect(id1).not.toBe(id2);
    });

  });

  describe('Schema Round-Trip Tests', () => {
    
    it('should validate objects that pass type guards through schemas', () => {
      const searchString = DomainUtils.createSearchString('machine learning healthcare', 'Primary search');
      
      // Type guard should pass
      expect(isSearchString(searchString)).toBe(true);
      
      // Schema validation should also pass
      const validationResult = Stage1Validators.validateSearchString(searchString);
      expect(validationResult.valid).toBe(true);
    });

    it('should handle schema validation errors gracefully', () => {
      const result = Stage1Validators.validateSourceRecord({ invalid: 'object' });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    });

  });

});
