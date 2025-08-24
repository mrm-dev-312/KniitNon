// Stage 0: Exploration & Scope - Domain Model Interfaces
// These interfaces match the corresponding JSON schemas in /schemas/

/**
 * Core topic scoping artifact with research boundaries
 * Maps to: topic-scope.schema.json
 */
export interface TopicScope {
  topic_one_liner: string;
  venue_style: 'APA' | 'MLA' | 'IEEE';
  refined_questions?: string[]; // exactly 3 questions when present
  inclusion_rules?: string[];
  exclusion_rules?: string[];
}

/**
 * Research questions artifact for Stage 0
 * Maps to: research-questions.schema.json
 */
export interface ResearchQuestions {
  questions: string[]; // exactly 3 questions
}

/**
 * Inclusion/exclusion rules for systematic review
 * Maps to: inclusion-rules.schema.json
 */
export interface InclusionExclusionRules {
  inclusion_rules: string[];
  exclusion_rules: string[];
}

/**
 * Base conversation turn entity for pipeline tracking
 * Core entity from Research Engine Plan section 2
 */
export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: string; // ISO 8601 timestamp
}

// Stage 0 gate evaluation types
export type Stage0Artifacts = {
  topicScope?: TopicScope;
  researchQuestions?: ResearchQuestions;
  inclusionRules?: InclusionExclusionRules;
  conversationHistory?: ConversationTurn[];
};
