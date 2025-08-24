'use client';

import { OutlineNode } from '@/lib/stores/outline-store';

export interface ParsedNodeData {
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  parentTitle?: string;
  level: number;
}

export class StructuredContentParser {
  
  static parseResponse(response: string): ParsedNodeData[] {
    const nodes: ParsedNodeData[] = [];
    const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Try to detect if this is a structured document (TOC, outline, etc.)
    const isStructured = this.detectStructuredContent(response);
    
    if (isStructured) {
      return this.parseStructuredContent(lines);
    } else {
      return this.parseUnstructuredContent(response);
    }
  }
  
  static detectStructuredContent(response: string): boolean {
    const indicators = [
      'table of contents',
      'toc',
      /^\d+\./m,  // numbered lists
      /^#+\s/m,   // markdown headers
      /^\*\s/m,   // bullet points
      /^\-\s/m,   // dash points
      /^\d+\.\d+/m // nested numbering
    ];
    
    const lowerResponse = response.toLowerCase();
    
    return indicators.some(indicator => {
      if (typeof indicator === 'string') {
        return lowerResponse.includes(indicator);
      } else {
        return indicator.test(response);
      }
    });
  }
  
  static parseStructuredContent(lines: string[]): ParsedNodeData[] {
    const nodes: ParsedNodeData[] = [];
    let currentMainTopic: ParsedNodeData | null = null;
    let currentSubtopic: ParsedNodeData | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip headers and empty lines
      if (this.isHeaderLine(line) || line.length < 3) continue;
      
      const nodeData = this.parseLineForNode(line);
      if (!nodeData) continue;
      
      // Determine hierarchy based on numbering and indentation
      if (nodeData.level === 1) {
        // Main topic (e.g., "1. Introduction to Python")
        currentMainTopic = {
          ...nodeData,
          type: 'topic'
        };
        currentSubtopic = null;
        nodes.push(currentMainTopic);
        
      } else if (nodeData.level === 2) {
        // Subtopic (e.g., "2.1 System Requirements")
        currentSubtopic = {
          ...nodeData,
          type: 'subtopic',
          parentTitle: currentMainTopic?.title
        };
        nodes.push(currentSubtopic);
        
      } else if (nodeData.level >= 3) {
        // Detail level (e.g., "2.2.1 Windows Installation")
        const detailNode: ParsedNodeData = {
          ...nodeData,
          type: 'detail',
          parentTitle: currentSubtopic?.title || currentMainTopic?.title
        };
        nodes.push(detailNode);
      }
    }
    
    return nodes;
  }
  
  private static parseUnstructuredContent(response: string): ParsedNodeData[] {
    // For unstructured content, create nodes based on paragraphs or sentences
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 20);
    
    if (paragraphs.length === 0) {
      // Fallback to sentence-based parsing
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 15);
      if (sentences.length > 0) {
        return [{
          title: sentences[0].trim().substring(0, 60) + '...',
          content: response.trim(),
          type: 'topic',
          level: 1
        }];
      }
      return [];
    }
    
    return paragraphs.map((paragraph, index) => {
      const firstLine = paragraph.split('\n')[0].trim();
      const title = firstLine.length > 60 
        ? firstLine.substring(0, 60) + '...'
        : firstLine;
        
      return {
        title,
        content: paragraph.trim(),
        type: index === 0 ? 'topic' as const : 'subtopic' as const,
        level: index === 0 ? 1 : 2
      };
    });
  }
  
  private static isHeaderLine(line: string): boolean {
    const headerPatterns = [
      /^#+\s*table of contents/i,
      /^#+\s*toc/i,
      /^table of contents/i,
      /^#+\s*$/,
      /^=+$/,
      /^-+$/
    ];
    
    return headerPatterns.some(pattern => pattern.test(line));
  }
  
  private static parseLineForNode(line: string): ParsedNodeData | null {
    // Remove markdown formatting
    line = line.replace(/^\*+\s*/, '').replace(/^-+\s*/, '');
    
    // Parse numbered items (1., 1.1, 1.1.1, etc.)
    const numberedMatch = line.match(/^(\d+(?:\.\d+)*)\s*\.?\s*(.+)/);
    if (numberedMatch) {
      const [, number, title] = numberedMatch;
      const level = number.split('.').length;
      const cleanTitle = title.replace(/^\*\*(.+)\*\*$/, '$1').trim(); // Remove bold formatting
      
      return {
        title: cleanTitle,
        content: cleanTitle,
        type: level === 1 ? 'topic' : level === 2 ? 'subtopic' : 'detail',
        level
      };
    }
    
    // Parse lettered items (a., b., etc.)
    const letteredMatch = line.match(/^([a-z])\.\s*(.+)/i);
    if (letteredMatch) {
      const [, , title] = letteredMatch;
      const cleanTitle = title.replace(/^\*\*(.+)\*\*$/, '$1').trim();
      
      return {
        title: cleanTitle,
        content: cleanTitle,
        type: 'detail',
        level: 3
      };
    }
    
    // Parse bullet points or dash items
    if (line.match(/^[-•]\s*/)) {
      const title = line.replace(/^[-•]\s*/, '').replace(/^\*\*(.+)\*\*$/, '$1').trim();
      if (title.length > 3) {
        return {
          title,
          content: title,
          type: 'subtopic',
          level: 2
        };
      }
    }
    
    return null;
  }
  
  static createOutlineNodes(parsedNodes: ParsedNodeData[], baseOrder: number = 0): OutlineNode[] {
    const titleToIdMap = new Map<string, string>();
    const outlineNodes: OutlineNode[] = [];
    
    parsedNodes.forEach((parsed, index) => {
      const nodeId = `parsed-${Date.now()}-${index}`;
      titleToIdMap.set(parsed.title, nodeId);
      
      // Find parent ID if there's a parent title
      let parentId: string | undefined;
      if (parsed.parentTitle) {
        parentId = titleToIdMap.get(parsed.parentTitle);
      }
      
      const outlineNode: OutlineNode = {
        id: nodeId,
        title: parsed.title,
        content: parsed.content,
        type: parsed.type,
        order: baseOrder + index + 1,
        parentId,
        metadata: {
          source: 'Structured Content Parser',
          confidence: 0.9,
          relationships: []
        }
      };
      
      outlineNodes.push(outlineNode);
    });
    
    return outlineNodes;
  }
}
