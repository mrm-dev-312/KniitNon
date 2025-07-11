import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Force dynamic rendering for this route since it uses request.headers
export const dynamic = 'force-dynamic';

const aiProvider = process.env.AI_PROVIDER || 'openai';

let aiClient: any;
if (aiProvider === 'gemini') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  aiClient = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
} else {
  aiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface NodeData {
  id: string;
  title: string;
  content: string;
  type: 'topic' | 'subtopic' | 'detail';
  connections?: string[];
  source?: string;
  depth?: number;
  lens?: string;
}

interface ResearchGap {
  id: string;
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  suggestedApproach: string;
  relatedNodes: string[];
  potentialSources: string[];
}

interface TopicCluster {
  id: string;
  name: string;
  theme: string;
  nodes: string[];
  connections: string[];
  suggestedDirection: string;
}

interface AdvancedSuggestion {
  id: string;
  type: 'node_expansion' | 'research_gap' | 'connection_opportunity' | 'deeper_analysis' | 'alternative_perspective';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  suggestedNodes?: Partial<NodeData>[];
  implementationSteps: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { 
      nodes, 
      currentContext, 
      researchFocus, 
      academicLevel = 'undergraduate',
      suggestionTypes = ['node_expansion', 'research_gap', 'connection_opportunity'],
      maxSuggestions = 8
    } = await request.json();

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json({ error: 'No nodes provided for analysis' }, { status: 400 });
    }

    // Prepare analysis context
    const analysisContext = prepareAnalysisContext(nodes, currentContext, researchFocus);
    
    // Generate advanced AI suggestions
    const suggestions = await generateAdvancedSuggestions(
      analysisContext, 
      suggestionTypes, 
      academicLevel, 
      maxSuggestions
    );

    // Identify research gaps
    const researchGaps = await identifyResearchGaps(analysisContext, academicLevel);

    // Generate topic clusters
    const topicClusters = await generateTopicClusters(nodes);

    // Create automatic node suggestions
    const automaticNodes = await generateAutomaticNodeSuggestions(
      analysisContext, 
      researchGaps, 
      topicClusters
    );

    const response = {
      suggestions,
      researchGaps,
      topicClusters,
      automaticNodes,
      metadata: {
        generatedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        analysisDepth: academicLevel,
        researchFocus,
        totalSuggestions: suggestions.length,
        gapCount: researchGaps.length,
        clusterCount: topicClusters.length
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating advanced AI suggestions:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate advanced suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Prepare comprehensive analysis context for AI processing
 */
function prepareAnalysisContext(nodes: NodeData[], currentContext: any, researchFocus?: string) {
  const nodesByType = nodes.reduce((acc, node) => {
    acc[node.type] = acc[node.type] || [];
    acc[node.type].push(node);
    return acc;
  }, {} as Record<string, NodeData[]>);

  const connectionMap = new Map();
  nodes.forEach(node => {
    if (node.connections) {
      connectionMap.set(node.id, node.connections);
    }
  });

  return {
    totalNodes: nodes.length,
    nodesByType,
    connectionMap,
    researchFocus,
    currentContext,
    nodesByDepth: nodes.reduce((acc, node) => {
      const depth = node.depth || 0;
      acc[depth] = acc[depth] || [];
      acc[depth].push(node);
      return acc;
    }, {} as Record<number, NodeData[]>),
    domainDistribution: nodes.reduce((acc, node) => {
      const lens = node.lens || 'Other';
      acc[lens] = (acc[lens] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

/**
 * Generate advanced AI-powered suggestions
 */
async function generateAdvancedSuggestions(
  analysisContext: any,
  suggestionTypes: string[],
  academicLevel: string,
  maxSuggestions: number
): Promise<AdvancedSuggestion[]> {
  const systemPrompt = `You are an advanced research AI assistant specializing in deep academic analysis and research strategy. Your role is to analyze existing research nodes and provide sophisticated suggestions for expanding and improving research quality.

Analysis Context:
- Total Nodes: ${analysisContext.totalNodes}
- Research Focus: ${analysisContext.researchFocus || 'General exploration'}
- Academic Level: ${academicLevel}
- Node Distribution: ${JSON.stringify(analysisContext.nodesByType, null, 2)}
- Domain Coverage: ${JSON.stringify(analysisContext.domainDistribution, null, 2)}

Suggestion Types to Focus On: ${suggestionTypes.join(', ')}

For each suggestion, analyze:
1. Current research landscape gaps
2. Opportunities for deeper theoretical exploration
3. Interdisciplinary connection possibilities
4. Methodological improvements
5. Alternative perspectives and counter-arguments
6. Emerging trends and cutting-edge developments

Generate ${maxSuggestions} advanced suggestions in this JSON format:
{
  "suggestions": [
    {
      "id": "adv-suggestion-1",
      "type": "node_expansion" | "research_gap" | "connection_opportunity" | "deeper_analysis" | "alternative_perspective",
      "title": "Specific, actionable suggestion title",
      "description": "Detailed explanation of the suggestion and its value",
      "priority": "high" | "medium" | "low",
      "rationale": "Academic reasoning for why this suggestion is important",
      "suggestedNodes": [
        {
          "title": "Proposed node title",
          "content": "Detailed content description",
          "type": "topic" | "subtopic" | "detail",
          "lens": "Technology" | "Science" | "History" | "Philosophy" | "Ethics" | "Other"
        }
      ],
      "implementationSteps": [
        "Step 1: Specific action",
        "Step 2: Next action",
        "Step 3: Follow-up action"
      ]
    }
  ]
}

Focus on suggestions that:
- Address genuine knowledge gaps
- Provide actionable research directions
- Enhance academic rigor and depth
- Offer novel perspectives or approaches
- Connect disparate concepts meaningfully
- Align with current academic standards and emerging trends`;

  try {
    let generatedContent: string;

    if (aiProvider === 'gemini') {
      const result = await aiClient.generateContent(systemPrompt);
      generatedContent = result.response.text();
    } else {
      const response = await aiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
        max_tokens: 3000,
      });
      generatedContent = response.choices[0]?.message?.content || '';
    }

    const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.suggestions || [];
    }

    throw new Error('No valid JSON found in AI response');

  } catch (error) {
    console.error('Error generating advanced suggestions:', error);
    return generateFallbackSuggestions(analysisContext, suggestionTypes);
  }
}

/**
 * Identify research gaps using AI analysis
 */
async function identifyResearchGaps(
  analysisContext: any,
  academicLevel: string
): Promise<ResearchGap[]> {
  const systemPrompt = `Analyze the provided research context and identify significant gaps in knowledge, methodology, or perspective. Consider:

1. **Coverage Gaps**: Areas mentioned but not deeply explored
2. **Methodological Gaps**: Missing research approaches or analytical frameworks
3. **Perspective Gaps**: Underrepresented viewpoints or stakeholder voices
4. **Temporal Gaps**: Historical context or future implications not addressed
5. **Interdisciplinary Gaps**: Missing connections between fields
6. **Empirical Gaps**: Lack of data, case studies, or evidence

Current Research Context:
${JSON.stringify(analysisContext, null, 2)}

Academic Level: ${academicLevel}

Return a JSON array of research gaps:
{
  "gaps": [
    {
      "id": "gap-1",
      "title": "Specific gap title",
      "description": "Detailed description of what's missing",
      "importance": "high" | "medium" | "low",
      "suggestedApproach": "Recommended research approach",
      "relatedNodes": ["node-id-1", "node-id-2"],
      "potentialSources": ["Source 1", "Source 2", "Source 3"]
    }
  ]
}`;

  try {
    let generatedContent: string;

    if (aiProvider === 'gemini') {
      const result = await aiClient.generateContent(systemPrompt);
      generatedContent = result.response.text();
    } else {
      const response = await aiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.6,
        max_tokens: 2000,
      });
      generatedContent = response.choices[0]?.message?.content || '';
    }

    const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.gaps || [];
    }

    throw new Error('No valid JSON found in gaps analysis');

  } catch (error) {
    console.error('Error identifying research gaps:', error);
    return generateFallbackGaps(analysisContext);
  }
}

/**
 * Generate intelligent topic clusters
 */
async function generateTopicClusters(nodes: NodeData[]): Promise<TopicCluster[]> {
  // Group nodes by semantic similarity and connections
  const clusters: TopicCluster[] = [];
  const processedNodes = new Set<string>();

  // Simple clustering based on content similarity and connections
  for (const node of nodes) {
    if (processedNodes.has(node.id)) continue;

    const relatedNodes = findRelatedNodes(node, nodes);
    const clusterNodes = [node.id, ...relatedNodes.map(n => n.id)];
    
    relatedNodes.forEach(n => processedNodes.add(n.id));
    processedNodes.add(node.id);

    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      name: generateClusterName(node, relatedNodes),
      theme: identifyClusterTheme(node, relatedNodes),
      nodes: clusterNodes,
      connections: extractClusterConnections(clusterNodes, nodes),
      suggestedDirection: generateClusterDirection(node, relatedNodes)
    });
  }

  return clusters;
}

/**
 * Generate automatic node suggestions based on analysis
 */
async function generateAutomaticNodeSuggestions(
  analysisContext: any,
  researchGaps: ResearchGap[],
  topicClusters: TopicCluster[]
): Promise<Partial<NodeData>[]> {
  const suggestions: Partial<NodeData>[] = [];

  // Generate nodes to fill high-priority research gaps
  researchGaps
    .filter(gap => gap.importance === 'high')
    .slice(0, 3)
    .forEach((gap, index) => {
      suggestions.push({
        id: `auto-gap-${index + 1}`,
        title: gap.title,
        content: gap.description,
        type: 'topic',
        source: 'AI Gap Analysis',
        lens: 'Other'
      });
    });

  // Generate connecting nodes for isolated clusters
  topicClusters
    .filter(cluster => cluster.connections.length === 0)
    .slice(0, 2)
    .forEach((cluster, index) => {
      suggestions.push({
        id: `auto-connector-${index + 1}`,
        title: `${cluster.theme} Integration`,
        content: `Exploring connections between ${cluster.name} and broader research context. ${cluster.suggestedDirection}`,
        type: 'subtopic',
        source: 'AI Cluster Analysis',
        lens: 'Other'
      });
    });

  return suggestions;
}

/**
 * Helper functions for analysis
 */
function findRelatedNodes(targetNode: NodeData, allNodes: NodeData[]): NodeData[] {
  return allNodes.filter(node => {
    if (node.id === targetNode.id) return false;
    
    // Check for direct connections
    if (targetNode.connections?.includes(node.id) || node.connections?.includes(targetNode.id)) {
      return true;
    }
    
    // Check for content similarity (simple keyword matching)
    const targetWords = targetNode.content.toLowerCase().split(' ');
    const nodeWords = node.content.toLowerCase().split(' ');
    const commonWords = targetWords.filter(word => 
      word.length > 4 && nodeWords.includes(word)
    );
    
    return commonWords.length >= 2;
  });
}

function generateClusterName(mainNode: NodeData, relatedNodes: NodeData[]): string {
  const allTitles = [mainNode.title, ...relatedNodes.map(n => n.title)];
  const commonWords = findCommonWords(allTitles);
  return commonWords.length > 0 ? commonWords.slice(0, 2).join(' ') + ' Cluster' : mainNode.title + ' Group';
}

function identifyClusterTheme(mainNode: NodeData, relatedNodes: NodeData[]): string {
  const allContent = [mainNode.content, ...relatedNodes.map(n => n.content)].join(' ');
  
  // Simple theme identification based on keywords
  const themes = {
    'Technology': ['technology', 'digital', 'software', 'algorithm', 'data'],
    'Science': ['research', 'study', 'analysis', 'experiment', 'scientific'],
    'History': ['historical', 'past', 'evolution', 'development', 'timeline'],
    'Ethics': ['ethical', 'moral', 'values', 'responsibility', 'impact'],
    'Philosophy': ['philosophical', 'theory', 'concept', 'fundamental', 'principle']
  };
  
  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some(keyword => allContent.toLowerCase().includes(keyword))) {
      return theme;
    }
  }
  
  return 'General';
}

function generateClusterDirection(mainNode: NodeData, relatedNodes: NodeData[]): string {
  const directions = [
    'Consider exploring deeper theoretical foundations',
    'Investigate practical applications and case studies',
    'Examine historical development and future trends',
    'Analyze interdisciplinary connections and implications',
    'Evaluate different stakeholder perspectives'
  ];
  
  return directions[Math.floor(Math.random() * directions.length)];
}

function extractClusterConnections(clusterNodes: string[], allNodes: NodeData[]): string[] {
  const connections = new Set<string>();
  
  clusterNodes.forEach(nodeId => {
    const node = allNodes.find(n => n.id === nodeId);
    if (node?.connections) {
      node.connections.forEach(connId => {
        if (!clusterNodes.includes(connId)) {
          connections.add(connId);
        }
      });
    }
  });
  
  return Array.from(connections);
}

function findCommonWords(titles: string[]): string[] {
  const wordCounts = new Map<string, number>();
  
  titles.forEach(title => {
    const words = title.toLowerCase().split(' ').filter(word => word.length > 3);
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });
  
  return Array.from(wordCounts.entries())
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .map(([word, _]) => word);
}

/**
 * Fallback functions for when AI analysis fails
 */
function generateFallbackSuggestions(analysisContext: any, suggestionTypes: string[]): AdvancedSuggestion[] {
  const fallbacks: AdvancedSuggestion[] = [];
  
  if (suggestionTypes.includes('node_expansion')) {
    fallbacks.push({
      id: 'fallback-expansion-1',
      type: 'node_expansion',
      title: 'Expand Core Concepts',
      description: 'Add more detailed exploration of fundamental concepts in your research',
      priority: 'medium',
      rationale: 'Strong foundational understanding improves overall research quality',
      implementationSteps: [
        'Identify your most important core concepts',
        'Research additional academic sources',
        'Create detailed explanation nodes'
      ]
    });
  }
  
  if (suggestionTypes.includes('research_gap')) {
    fallbacks.push({
      id: 'fallback-gap-1',
      type: 'research_gap',
      title: 'Investigate Methodological Approaches',
      description: 'Explore different research methodologies and analytical frameworks',
      priority: 'medium',
      rationale: 'Diverse methodological approaches strengthen research validity',
      implementationSteps: [
        'Review current methodological approaches',
        'Identify alternative research methods',
        'Evaluate methodological strengths and limitations'
      ]
    });
  }
  
  return fallbacks;
}

function generateFallbackGaps(analysisContext: any): ResearchGap[] {
  return [
    {
      id: 'fallback-gap-1',
      title: 'Methodological Diversity',
      description: 'Research could benefit from exploring diverse methodological approaches',
      importance: 'medium',
      suggestedApproach: 'Systematic review of available research methods',
      relatedNodes: [],
      potentialSources: ['Academic methodology handbooks', 'Research design textbooks']
    }
  ];
}
