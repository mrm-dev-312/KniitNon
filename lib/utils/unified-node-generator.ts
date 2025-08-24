import { StructuredContentParser } from './structured-content-parser';
import { ConversationAnalyzer, ConversationNode } from './conversation-analyzer';

export interface UnifiedNode {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  parentId?: string;
  level: number;
  confidence: number;
  source: 'conversation' | 'structured' | 'hybrid';
  connections: string[];
  metadata: {
    generatedAt: string;
    method: 'structured' | 'conversational' | 'hybrid';
    conversationTurn?: number;
    originalResponse?: string;
  };
}

export interface GenerationStats {
  totalNodes: number;
  structuredNodes: number;
  conversationalNodes: number;
  confidence: number;
  processingTime: number;
}

export class UnifiedNodeGenerator {
  private static readonly MIN_RESPONSE_LENGTH = 30;
  
  /**
   * Main entry point - analyze any content and generate appropriate nodes
   */
  static async generateNodes(
    content: string, 
    context?: {
      conversationHistory?: Array<{role: string, content: string}>,
      messageIndex?: number,
      existingNodes?: UnifiedNode[]
    }
  ): Promise<{nodes: UnifiedNode[], stats: GenerationStats}> {
    const startTime = Date.now();
    const nodes: UnifiedNode[] = [];
    let structuredCount = 0;
    let conversationalCount = 0;
    
    if (!content || content.trim().length < this.MIN_RESPONSE_LENGTH) {
      return {
        nodes: [],
        stats: {
          totalNodes: 0,
          structuredNodes: 0,
          conversationalNodes: 0,
          confidence: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
    
    try {
      // Step 1: Try structured content parsing first
      const structuredNodes = await this.generateStructuredNodes(content, context);
      if (structuredNodes.length > 0) {
        nodes.push(...structuredNodes);
        structuredCount = structuredNodes.length;
      }
      
      // Step 2: If no structured content or limited structured content, use conversational analysis
      if (nodes.length < 3 && context?.conversationHistory) {
        const conversationalNodes = await this.generateConversationalNodes(
          content, 
          context.conversationHistory,
          context.messageIndex || 0
        );
        nodes.push(...conversationalNodes);
        conversationalCount = conversationalNodes.length;
      }
      
      // Step 3: If still minimal nodes, create fallback nodes
      if (nodes.length === 0) {
        const fallbackNodes = this.generateFallbackNodes(content);
        nodes.push(...fallbackNodes);
        conversationalCount = fallbackNodes.length;
      }
      
      // Step 4: Connect related nodes
      this.connectRelatedNodes(nodes);
      
      // Step 5: Calculate overall confidence
      const avgConfidence = nodes.length > 0 
        ? nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length 
        : 0;
      
      return {
        nodes,
        stats: {
          totalNodes: nodes.length,
          structuredNodes: structuredCount,
          conversationalNodes: conversationalCount,
          confidence: Math.round(avgConfidence * 100) / 100,
          processingTime: Date.now() - startTime
        }
      };
      
    } catch (error) {
      console.error('Error generating nodes:', error);
      
      // Return fallback nodes on error
      const fallbackNodes = this.generateFallbackNodes(content);
      
      return {
        nodes: fallbackNodes,
        stats: {
          totalNodes: fallbackNodes.length,
          structuredNodes: 0,
          conversationalNodes: fallbackNodes.length,
          confidence: 0.3,
          processingTime: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * Generate nodes using structured content parsing
   */
  private static async generateStructuredNodes(
    content: string, 
    context?: any
  ): Promise<UnifiedNode[]> {
    const nodes: UnifiedNode[] = [];
    
    try {
      const parsedNodes = StructuredContentParser.parseResponse(content);
      
      parsedNodes.forEach((parsedNode, index) => {
        const node: UnifiedNode = {
          id: `structured-${Date.now()}-${index}`,
          title: parsedNode.title,
          content: parsedNode.content,
          type: parsedNode.type,
          level: parsedNode.level || 0,
          confidence: 0.85, // Higher confidence for structured content
          source: 'structured',
          connections: [],
          metadata: {
            generatedAt: new Date().toISOString(),
            method: 'structured',
            conversationTurn: context?.messageIndex,
            originalResponse: content.substring(0, 200) + '...'
          }
        };
        
        nodes.push(node);
      });
      
    } catch (error) {
      console.error('Error parsing structured content:', error);
    }
    
    return nodes;
  }
  
  /**
   * Generate nodes using conversational analysis
   */
  private static async generateConversationalNodes(
    content: string,
    conversationHistory: Array<{role: string, content: string}>,
    messageIndex: number
  ): Promise<UnifiedNode[]> {
    const nodes: UnifiedNode[] = [];
    
    try {
      // Create a conversation context including the current response
      const fullConversation = [...conversationHistory, { role: 'assistant', content }];
      const conversationNodes = ConversationAnalyzer.analyzeConversation(fullConversation);
      
      // Filter to only nodes from the current response (last message)
      const currentResponseNodes = conversationNodes.filter(node => 
        node.metadata.conversationTurn === fullConversation.length - 1
      );
      
      currentResponseNodes.forEach((convNode, index) => {
        const node: UnifiedNode = {
          id: `conv-${Date.now()}-${index}`,
          title: convNode.title,
          content: convNode.content,
          type: convNode.type,
          level: this.mapTypeToLevel(convNode.type),
          confidence: convNode.confidence,
          source: 'conversation',
          connections: convNode.connections,
          metadata: {
            generatedAt: new Date().toISOString(),
            method: 'conversational',
            conversationTurn: messageIndex,
            originalResponse: content.substring(0, 200) + '...'
          }
        };
        
        nodes.push(node);
      });
      
    } catch (error) {
      console.error('Error analyzing conversation:', error);
    }
    
    return nodes;
  }
  
  /**
   * Generate simple fallback nodes when other methods don't work
   */
  private static generateFallbackNodes(content: string): UnifiedNode[] {
    const nodes: UnifiedNode[] = [];
    
    // Split content into meaningful chunks
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 30);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    if (paragraphs.length > 1) {
      // Use paragraphs if available
      paragraphs.slice(0, 5).forEach((paragraph, index) => {
        const title = this.extractSimpleTitle(paragraph);
        
        nodes.push({
          id: `fallback-para-${Date.now()}-${index}`,
          title,
          content: paragraph.trim(),
          type: index === 0 ? 'topic' : (index < paragraphs.length / 2 ? 'subtopic' : 'detail'),
          level: index === 0 ? 0 : (index < paragraphs.length / 2 ? 1 : 2),
          confidence: 0.4,
          source: 'conversation',
          connections: [],
          metadata: {
            generatedAt: new Date().toISOString(),
            method: 'conversational',
            originalResponse: content.substring(0, 200) + '...'
          }
        });
      });
    } else {
      // Use sentences as a last resort
      const topSentences = sentences.slice(0, 3);
      
      topSentences.forEach((sentence, index) => {
        const title = this.extractSimpleTitle(sentence);
        
        nodes.push({
          id: `fallback-sent-${Date.now()}-${index}`,
          title,
          content: sentence.trim(),
          type: 'detail',
          level: 2,
          confidence: 0.3,
          source: 'conversation',
          connections: [],
          metadata: {
            generatedAt: new Date().toISOString(),
            method: 'conversational',
            originalResponse: content.substring(0, 200) + '...'
          }
        });
      });
    }
    
    return nodes;
  }
  
  /**
   * Connect related nodes based on content similarity and context
   */
  private static connectRelatedNodes(nodes: UnifiedNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = this.calculateSimilarity(nodes[i], nodes[j]);
        const levelRelation = this.checkLevelRelation(nodes[i], nodes[j]);
        
        if (similarity > 0.3 || levelRelation) {
          if (!nodes[i].connections.includes(nodes[j].id)) {
            nodes[i].connections.push(nodes[j].id);
          }
          if (!nodes[j].connections.includes(nodes[i].id)) {
            nodes[j].connections.push(nodes[i].id);
          }
        }
      }
    }
  }
  
  /**
   * Calculate content similarity between two nodes
   */
  private static calculateSimilarity(node1: UnifiedNode, node2: UnifiedNode): number {
    const words1 = new Set(node1.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(node2.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);
    
    const intersection = words1Array.filter(x => words2.has(x));
    const union = [...words1Array, ...words2Array.filter(x => !words1.has(x))];
    
    return intersection.length / union.length;
  }
  
  /**
   * Check if nodes should be connected based on their hierarchical levels
   */
  private static checkLevelRelation(node1: UnifiedNode, node2: UnifiedNode): boolean {
    // Connect parent-child relationships (1 level difference)
    return Math.abs(node1.level - node2.level) === 1;
  }
  
  /**
   * Determine node type based on content and position
   */
  private static determineNodeType(content: string, index: number, total: number): 'topic' | 'subtopic' | 'detail' {
    if (total === 1) return 'topic';
    if (index === 0) return 'topic';
    if (content.length > 200) return 'topic';
    if (index < total / 3) return 'topic';
    if (index < 2 * total / 3) return 'subtopic';
    return 'detail';
  }
  
  /**
   * Map conversation node types to hierarchical levels
   */
  private static mapTypeToLevel(type: 'topic' | 'subtopic' | 'detail'): number {
    switch (type) {
      case 'topic': return 0;
      case 'subtopic': return 1;
      case 'detail': return 2;
      default: return 0;
    }
  }
  
  /**
   * Extract a simple title from content
   */
  private static extractSimpleTitle(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0]?.trim() || content.substring(0, 50);
    
    // Try to extract main concept
    const words = firstSentence.split(/\s+/);
    const title = words.slice(0, Math.min(6, words.length)).join(' ');
    
    // Clean up and limit length
    const cleanTitle = title.replace(/['""`]/g, '').trim();
    return cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + '...' : cleanTitle;
  }
  
  /**
   * Convert UnifiedNode to OutlineNode format for the outline store
   */
  static convertToOutlineNodes(unifiedNodes: UnifiedNode[]): Array<any> {
    return unifiedNodes.map((node, index) => ({
      id: node.id,
      title: node.title,
      content: node.content,
      type: node.type,
      order: index + 1,
      metadata: {
        source: `${node.source} (${node.metadata.method})`,
        confidence: node.confidence,
        connections: node.connections,
        level: node.level,
        generatedAt: node.metadata.generatedAt
      }
    }));
  }
}
