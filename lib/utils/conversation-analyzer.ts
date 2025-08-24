import { StructuredContentParser } from './structured-content-parser';

export interface ConversationNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  confidence: number;
  source: 'conversation' | 'structured' | 'hybrid';
  connections: string[];
  metadata: {
    conversationTurn: number;
    extractedFrom: string;
    relatedMessages: string[];
  };
}

export interface ConversationContext {
  recentTopics: string[];
  dominantThemes: string[];
  researchAreas: string[];
  questionTypes: string[];
}

export class ConversationAnalyzer {
  private static readonly MIN_CONTENT_LENGTH = 20;
  private static readonly RESEARCH_KEYWORDS = [
    'research', 'study', 'analyze', 'investigate', 'explore',
    'theory', 'hypothesis', 'methodology', 'data', 'evidence',
    'findings', 'conclusion', 'literature', 'academic', 'scholarly'
  ];
  
  private static readonly TOPIC_INDICATORS = [
    'about', 'regarding', 'concerning', 'related to', 'topic of',
    'subject of', 'focus on', 'discuss', 'examine', 'consider'
  ];

  /**
   * Analyze a conversation and extract research nodes
   */
  static analyzeConversation(messages: Array<{role: string, content: string}>): ConversationNode[] {
    const nodes: ConversationNode[] = [];
    const context = this.buildConversationContext(messages);
    
    // Process each AI response for node extraction
    messages.forEach((message, index) => {
      if (message.role === 'assistant' && message.content.trim().length >= this.MIN_CONTENT_LENGTH) {
        const extractedNodes = this.extractNodesFromResponse(
          message.content, 
          index, 
          context,
          messages.slice(Math.max(0, index - 2), index + 1) // Include context messages
        );
        nodes.push(...extractedNodes);
      }
    });

    // Connect related nodes
    this.createNodeConnections(nodes, context);
    
    return nodes;
  }

  /**
   * Extract nodes from a single AI response
   */
  private static extractNodesFromResponse(
    content: string, 
    messageIndex: number, 
    context: ConversationContext,
    contextMessages: Array<{role: string, content: string}>
  ): ConversationNode[] {
    const nodes: ConversationNode[] = [];
    
    // First, try structured content parsing
    if (StructuredContentParser.detectStructuredContent(content)) {
      const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const structuredNodes = StructuredContentParser.parseStructuredContent(lines);
      
      return structuredNodes.map((node, index) => ({
        id: `conv-structured-${messageIndex}-${index}`,
        title: node.title,
        content: node.content,
        type: this.determineNodeType(node.content, index, structuredNodes.length),
        confidence: 0.9,
        source: 'structured' as const,
        connections: [],
        metadata: {
          conversationTurn: messageIndex,
          extractedFrom: 'structured_parsing',
          relatedMessages: contextMessages.map(m => m.content.substring(0, 100))
        }
      }));
    }

    // Conversational analysis for unstructured content
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > this.MIN_CONTENT_LENGTH);
    
    // Extract topic-based nodes from paragraphs
    paragraphs.forEach((paragraph, pIndex) => {
      if (paragraph.trim().length >= 50) {
        const isResearchRelevant = this.isResearchRelevant(paragraph);
        const hasTopicIndicators = this.hasTopicIndicators(paragraph);
        
        if (isResearchRelevant || hasTopicIndicators) {
          const title = this.extractTitle(paragraph);
          
          nodes.push({
            id: `conv-para-${messageIndex}-${pIndex}`,
            title,
            content: paragraph.trim(),
            type: this.determineNodeType(paragraph, pIndex, paragraphs.length),
            confidence: isResearchRelevant ? 0.8 : 0.6,
            source: 'conversation' as const,
            connections: [],
            metadata: {
              conversationTurn: messageIndex,
              extractedFrom: 'paragraph_analysis',
              relatedMessages: contextMessages.map(m => m.content.substring(0, 100))
            }
          });
        }
      }
    });

    // If no paragraph-level nodes, extract from key sentences
    if (nodes.length === 0) {
      const keyTopics = this.extractKeyTopics(content, context);
      
      keyTopics.forEach((topic, index) => {
        nodes.push({
          id: `conv-topic-${messageIndex}-${index}`,
          title: topic.title,
          content: topic.content,
          type: 'detail' as const,
          confidence: 0.5,
          source: 'conversation' as const,
          connections: [],
          metadata: {
            conversationTurn: messageIndex,
            extractedFrom: 'topic_extraction',
            relatedMessages: contextMessages.map(m => m.content.substring(0, 100))
          }
        });
      });
    }

    return nodes;
  }

  /**
   * Build conversation context for better node extraction
   */
  private static buildConversationContext(messages: Array<{role: string, content: string}>): ConversationContext {
    const allContent = messages.map(m => m.content).join(' ');
    const words = allContent.toLowerCase().split(/\s+/);
    
    // Extract recent topics (from last 3 messages)
    const recentMessages = messages.slice(-3);
    const recentTopics = this.extractTopicsFromText(
      recentMessages.map(m => m.content).join(' ')
    );
    
    // Find dominant themes
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 4 && !this.isStopWord(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    const dominantThemes = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
    
    // Identify research areas
    const researchAreas = this.identifyResearchAreas(allContent);
    
    // Classify question types
    const questionTypes = this.classifyQuestions(messages.filter(m => m.role === 'user'));
    
    return {
      recentTopics,
      dominantThemes,
      researchAreas,
      questionTypes
    };
  }

  /**
   * Determine appropriate node type based on content and position
   */
  private static determineNodeType(content: string, index: number, total: number): 'topic' | 'subtopic' | 'detail' {
    if (total === 1) return 'topic';
    if (index === 0) return 'topic';
    if (index < total / 2) return 'subtopic';
    return 'detail';
  }

  /**
   * Check if content is research-relevant
   */
  private static isResearchRelevant(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.RESEARCH_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if content has topic indicators
   */
  private static hasTopicIndicators(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.TOPIC_INDICATORS.some(indicator => lowerText.includes(indicator));
  }

  /**
   * Extract a meaningful title from content
   */
  private static extractTitle(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0]?.trim() || content.substring(0, 50);
    
    // Try to extract the main topic
    const colonIndex = firstSentence.indexOf(':');
    if (colonIndex > 0 && colonIndex < 40) {
      return firstSentence.substring(0, colonIndex).trim();
    }
    
    // Look for topic patterns
    const topicMatch = firstSentence.match(/(?:about|regarding|concerning) (.+?)(?:\s|$|,)/i);
    if (topicMatch) {
      return topicMatch[1].trim();
    }
    
    // Fallback: first 6-8 words or until punctuation
    const words = firstSentence.split(/\s+/);
    const title = words.slice(0, Math.min(8, words.length)).join(' ');
    
    return title.length > 60 ? title.substring(0, 60) + '...' : title;
  }

  /**
   * Extract key topics from text using simple NLP
   */
  private static extractKeyTopics(text: string, context: ConversationContext): Array<{title: string, content: string}> {
    const topics: Array<{title: string, content: string}> = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (this.isTopicWorthy(trimmed, context)) {
        topics.push({
          title: this.extractTitle(trimmed),
          content: trimmed
        });
      }
    });
    
    return topics.slice(0, 3); // Limit to 3 key topics per response
  }

  /**
   * Check if a sentence contains topic-worthy content
   */
  private static isTopicWorthy(sentence: string, context: ConversationContext): boolean {
    const lowerSentence = sentence.toLowerCase();
    
    // Contains research keywords
    if (this.RESEARCH_KEYWORDS.some(kw => lowerSentence.includes(kw))) return true;
    
    // References recent topics
    if (context.recentTopics.some(topic => lowerSentence.includes(topic.toLowerCase()))) return true;
    
    // Contains domain-specific terms (capitalized words often indicate proper nouns/concepts)
    const capitalizedWords = sentence.match(/\b[A-Z][a-z]+/g) || [];
    if (capitalizedWords.length >= 2) return true;
    
    // Contains numbers/data (often research relevant)
    if (/\b\d+(\.\d+)?%?/.test(sentence)) return true;
    
    return false;
  }

  /**
   * Create connections between related nodes
   */
  private static createNodeConnections(nodes: ConversationNode[], context: ConversationContext): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = this.calculateContentSimilarity(nodes[i], nodes[j]);
        const contextRelatedness = this.calculateContextRelatedness(nodes[i], nodes[j], context);
        
        if (similarity > 0.3 || contextRelatedness > 0.5) {
          nodes[i].connections.push(nodes[j].id);
          nodes[j].connections.push(nodes[i].id);
        }
      }
    }
  }

  /**
   * Simple content similarity calculation
   */
  private static calculateContentSimilarity(node1: ConversationNode, node2: ConversationNode): number {
    const words1 = new Set(node1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(node2.content.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate relatedness based on conversation context
   */
  private static calculateContextRelatedness(node1: ConversationNode, node2: ConversationNode, context: ConversationContext): number {
    // Same conversation turn
    if (Math.abs(node1.metadata.conversationTurn - node2.metadata.conversationTurn) <= 1) {
      return 0.7;
    }
    
    // Related to same themes
    const node1Themes = context.dominantThemes.filter(theme => 
      node1.content.toLowerCase().includes(theme) || node1.title.toLowerCase().includes(theme)
    );
    const node2Themes = context.dominantThemes.filter(theme => 
      node2.content.toLowerCase().includes(theme) || node2.title.toLowerCase().includes(theme)
    );
    
    const commonThemes = node1Themes.filter(theme => node2Themes.includes(theme));
    return commonThemes.length > 0 ? 0.6 : 0.0;
  }

  // Helper methods
  private static extractTopicsFromText(text: string): string[] {
    // Simple topic extraction - look for capitalized phrases
    const topics = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    return [...new Set(topics)].slice(0, 5);
  }

  private static isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those'];
    return stopWords.includes(word.toLowerCase());
  }

  private static identifyResearchAreas(text: string): string[] {
    const disciplines = [
      'computer science', 'psychology', 'biology', 'physics', 'chemistry', 
      'mathematics', 'economics', 'sociology', 'philosophy', 'history',
      'literature', 'engineering', 'medicine', 'law', 'education'
    ];
    
    return disciplines.filter(discipline => 
      text.toLowerCase().includes(discipline)
    );
  }

  private static classifyQuestions(userMessages: Array<{role: string, content: string}>): string[] {
    const questions = userMessages
      .map(m => m.content)
      .filter(content => content.includes('?'))
      .map(question => {
        if (question.toLowerCase().startsWith('what')) return 'definition';
        if (question.toLowerCase().startsWith('how')) return 'process';
        if (question.toLowerCase().startsWith('why')) return 'causation';
        if (question.toLowerCase().startsWith('when')) return 'temporal';
        if (question.toLowerCase().startsWith('where')) return 'spatial';
        return 'general';
      });
    
    return [...new Set(questions)];
  }
}
