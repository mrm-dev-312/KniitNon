import { OutlineNode } from '@/lib/stores/outline-store';

export interface ResearchNode extends OutlineNode {
  level: number;
  parentId?: string;
  children?: ResearchNode[];
  isExpandable: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  expansionCount: number; // Track how many times this branch has been expanded
  pathContext: string[]; // Path from root for context
}

export interface ExpansionRequest {
  nodeId: string;
  nodePath: ResearchNode[];
  conversationContext: string[];
  maxLevels: number;
}

export interface ExpansionResult {
  success: boolean;
  nodes: ResearchNode[];
  error?: string;
}

export class InfiniteResearchTree {
  private static readonly MAX_INITIAL_LEVELS = 1;
  private static readonly MAX_SUBSEQUENT_LEVELS = 1;
  private static readonly MAX_CHILDREN_PER_NODE = 4;

  /**
   * Generates child nodes for expansion based on parent context
   */
  static async expandNode(request: ExpansionRequest): Promise<ExpansionResult> {
    try {
      const parentNode = request.nodePath[request.nodePath.length - 1];
      const rootNode = request.nodePath[0];
      
      // Determine expansion limits
      const isInitialExpansion = parentNode.expansionCount === 0;
      const maxLevels = isInitialExpansion 
        ? this.MAX_INITIAL_LEVELS 
        : this.MAX_SUBSEQUENT_LEVELS;

      // Build context for AI generation
      const expansionContext = this.buildExpansionContext(
        parentNode,
        request.nodePath,
        request.conversationContext
      );

      // Generate expansion prompt
      const prompt = this.generateExpansionPrompt(
        parentNode,
        expansionContext,
        maxLevels,
        parentNode.level + 1
      );

      // Call AI to generate child nodes
      const response = await fetch('/api/research/expand-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          parentNodeId: parentNode.id,
          parentLevel: parentNode.level,
          maxLevels,
          maxChildren: this.MAX_CHILDREN_PER_NODE,
          rootContext: rootNode.title,
          pathContext: request.nodePath.map(n => n.title)
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to ResearchNodes
      const childNodes = this.transformToResearchNodes(
        data.nodes,
        parentNode,
        request.nodePath
      );

      return {
        success: true,
        nodes: childNodes
      };
    } catch (error) {
      console.error('Node expansion error:', error);
      return {
        success: false,
        nodes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Builds comprehensive context for AI expansion
   */
  private static buildExpansionContext(
    parentNode: ResearchNode,
    nodePath: ResearchNode[],
    conversationContext: string[]
  ): string {
    const pathString = nodePath.map(n => n.title).join(' → ');
    const recentConversation = conversationContext.slice(-5).join('\n');
    
    return `
Research Path: ${pathString}
Current Focus: ${parentNode.title}
Node Content: ${parentNode.content}
Recent Conversation Context:
${recentConversation}

Parent Level: ${parentNode.level}
Expansion Count: ${parentNode.expansionCount}
    `.trim();
  }

  /**
   * Generates AI prompt for node expansion
   */
  private static generateExpansionPrompt(
    parentNode: ResearchNode,
    context: string,
    maxLevels: number,
    startLevel: number
  ): string {
    return `
You are helping expand a research tree. Based on the context below, generate ONLY direct children of "${parentNode.title}".

${context}

Requirements:
1. Generate ONLY direct children (immediate subtopics) of "${parentNode.title}"
2. Create 2-4 specific subtopics or research questions
3. Each should be a focused aspect of the parent topic
4. Make each node expandable for future user-driven exploration
5. Focus on academic/research quality content
6. Keep titles concise (max 60 chars)

Return a JSON structure with this FLAT format (NO nested children):
{
  "nodes": [
    {
      "title": "Specific Subtopic Title",
      "content": "Detailed description of this research area (100-200 chars)",
      "type": "subtopic",
      "isExpandable": true
    }
  ]
}

IMPORTANT: 
- Do NOT include nested "children" arrays
- Generate only the immediate children of "${parentNode.title}"
- Each node will be expanded separately when the user clicks on it
    `.trim();
  }

  /**
   * Transforms API response to ResearchNodes with proper hierarchy
   */
  private static transformToResearchNodes(
    apiNodes: any[],
    parentNode: ResearchNode,
    nodePath: ResearchNode[]
  ): ResearchNode[] {
    const result: ResearchNode[] = [];
    let nodeCounter = 0;

    const processNode = (apiNode: any, level: number, parent?: ResearchNode): ResearchNode => {
      nodeCounter++;
      const nodeId = `${parentNode.id}-child-${nodeCounter}`;
      
      const researchNode: ResearchNode = {
        id: nodeId,
        title: apiNode.title,
        content: apiNode.content || apiNode.title,
        type: apiNode.type || 'topic',
        order: result.length + 1,
        level,
        parentId: parent?.id || parentNode.id,
        children: [],
        isExpandable: apiNode.isExpandable !== false,
        isExpanded: false,
        isLoading: false,
        expansionCount: 0,
        pathContext: [...nodePath.map(n => n.title), apiNode.title],
        metadata: {
          source: 'tree-expansion',
          parentLevel: parentNode.level,
          expansionGeneration: parentNode.expansionCount + 1,
          ...apiNode.metadata
        }
      };

      // Process children recursively
      if (apiNode.children && Array.isArray(apiNode.children)) {
  researchNode.children = apiNode.children.map((child: any) =>
          processNode(child, level + 1, researchNode)
        );
      }

      return researchNode;
    };

    // Process all top-level nodes
    apiNodes.forEach(apiNode => {
      result.push(processNode(apiNode, parentNode.level + 1));
    });

    return result;
  }

  /**
   * Creates a root node from a research question
   */
  static createRootNode(title: string, content?: string): ResearchNode {
    return {
      id: `root-${Date.now()}`,
      title: title,
      content: content || title,
      type: 'topic',
      order: 1,
      level: 0,
      children: [],
      isExpandable: true,
      isExpanded: false,
      isLoading: false,
      expansionCount: 0,
      pathContext: [title],
      metadata: {
        source: 'user-created',
        confidence: 1.0,
        relationships: []
      }
    };
  }

  /**
   * Flattens tree structure for visualization compatibility
   */
  static flattenTree(nodes: ResearchNode[]): OutlineNode[] {
    const flattened: OutlineNode[] = [];
    
    const flatten = (node: ResearchNode) => {
      // Create outline node with simplified metadata
      const outlineNode: OutlineNode = {
        id: node.id,
        title: node.title,
        content: node.content,
        type: node.type,
        order: node.order,
        parentId: node.parentId,
        metadata: {
          source: node.metadata?.source || 'tree-expansion',
          confidence: node.metadata?.confidence || 0.85,
          relationships: node.metadata?.relationships || []
        }
      };
      
      flattened.push(outlineNode);
      
      // Recursively flatten children
      if (node.children) {
        node.children.forEach(child => flatten(child));
      }
    };

    nodes.forEach(node => flatten(node));
    return flattened;
  }

  /**
   * Converts a single outline node to research node format
   */
  static convertOutlineToResearch(outlineNode: OutlineNode): ResearchNode {
    return {
      ...outlineNode,
      level: 0, // Will be root level
      parentId: outlineNode.parentId,
      children: [],
      isExpandable: true,
      isExpanded: false,
      isLoading: false,
      expansionCount: 0,
      pathContext: [outlineNode.title]
    };
  }

  /**
   * Reconstructs tree structure from flattened nodes
   */
  static reconstructTree(flatNodes: OutlineNode[]): ResearchNode[] {
    const nodeMap = new Map<string, ResearchNode>();
    const rootNodes: ResearchNode[] = [];

    // First pass: create all nodes with default values
    flatNodes.forEach(flatNode => {
      const researchNode: ResearchNode = {
        ...flatNode,
        level: 0, // Will be calculated based on parent depth
        parentId: flatNode.parentId,
        children: [],
        isExpandable: true, // Default to expandable
        isExpanded: false,
        isLoading: false,
        expansionCount: 0,
        pathContext: [flatNode.title]
      };
      
      nodeMap.set(flatNode.id, researchNode);
    });

    // Second pass: build hierarchy and calculate levels
    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!;
        parent.children!.push(node);
        node.level = parent.level + 1;
      } else {
        rootNodes.push(node);
        node.level = 0;
      }
    });

    return rootNodes;
  }
}
