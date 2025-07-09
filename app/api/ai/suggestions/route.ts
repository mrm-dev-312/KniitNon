import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { 
  MCP_GUIDANCE_PROMPT,
  generateOutlineSuggestionsPrompt,
  generateNodeExplorationPrompt,
  NodeData 
} from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SuggestionType = 'outline_improvement' | 'node_exploration' | 'structure_optimization' | 'content_enhancement';

interface SuggestionRequest {
  type: SuggestionType;
  outline?: any;
  nodeIds?: string[];
  currentContent?: string;
  focusArea?: string;
  academicLevel?: 'undergraduate' | 'graduate' | 'professional';
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestionRequest = await request.json();
    const { type, outline, nodeIds, currentContent, focusArea, academicLevel } = body;

    // Validate required parameters
    if (!type || !['outline_improvement', 'node_exploration', 'structure_optimization', 'content_enhancement'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid suggestion type is required' },
        { status: 400 }
      );
    }

    let prompt;
    let nodes: NodeData[] = [];

    // Fetch nodes if nodeIds provided
    if (nodeIds && nodeIds.length > 0) {
      nodes = await fetchNodesByIds(nodeIds);
    }

    // Generate appropriate prompt based on suggestion type
    switch (type) {
      case 'outline_improvement':
        if (!outline) {
          return NextResponse.json(
            { error: 'Outline is required for outline improvement suggestions' },
            { status: 400 }
          );
        }
        prompt = generateOutlineSuggestionsPrompt(outline, nodes);
        break;

      case 'node_exploration':
        if (!outline) {
          return NextResponse.json(
            { error: 'Outline is required for node exploration suggestions' },
            { status: 400 }
          );
        }
        prompt = generateNodeExplorationPrompt(nodes, outline);
        break;

      case 'structure_optimization':
        prompt = createStructureOptimizationPrompt(outline, nodes, focusArea, academicLevel);
        break;

      case 'content_enhancement':
        if (!currentContent) {
          return NextResponse.json(
            { error: 'Current content is required for content enhancement suggestions' },
            { status: 400 }
          );
        }
        prompt = createContentEnhancementPrompt(currentContent, outline, nodes, focusArea);
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported suggestion type' },
          { status: 400 }
        );
    }

    // Generate suggestions using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        MCP_GUIDANCE_PROMPT,
        prompt
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const suggestionsContent = completion.choices[0].message.content;
    
    if (!suggestionsContent) {
      throw new Error('No suggestions generated from OpenAI');
    }

    // Parse and structure the suggestions
    const parsedSuggestions = parseSuggestions(suggestionsContent, type);

    const response = {
      suggestions: parsedSuggestions,
      type,
      metadata: {
        generatedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        focusArea,
        academicLevel,
        estimatedTokens: completion.usage?.total_tokens || 0
      },
      context: {
        outline: outline ? { title: outline.title, sectionCount: outline.sections?.length || 0 } : null,
        nodeIds,
        hasContent: !!currentContent
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Create prompt for structure optimization suggestions
 */
function createStructureOptimizationPrompt(
  outline: any, 
  nodes: NodeData[], 
  focusArea?: string,
  academicLevel?: string
) {
  return {
    role: 'user' as const,
    content: `Analyze the following research structure and provide optimization suggestions:

${outline ? `Current Outline:
${JSON.stringify(outline, null, 2)}` : 'No outline provided - please suggest optimal structure.'}

Available Research Nodes:
${nodes.map(node => `- ${node.title} (${node.type}): ${node.content.substring(0, 150)}...`).join('\n')}

${focusArea ? `Focus Area: ${focusArea}` : ''}
${academicLevel ? `Academic Level: ${academicLevel}` : ''}

Please provide specific suggestions for:
1. Optimal organization and flow of sections
2. Logical progression of arguments
3. Balance between different topics and subtopics
4. Integration opportunities for available research nodes
5. Missing structural elements for academic rigor
6. Potential restructuring for better impact

Format your response with clear categories and actionable recommendations.`
  };
}

/**
 * Create prompt for content enhancement suggestions
 */
function createContentEnhancementPrompt(
  currentContent: string,
  outline: any,
  nodes: NodeData[],
  focusArea?: string
) {
  return {
    role: 'user' as const,
    content: `Analyze the following content and provide enhancement suggestions:

Current Content:
${currentContent}

${outline ? `Related Outline Context:
${JSON.stringify(outline, null, 2)}` : ''}

Available Research Nodes for Integration:
${nodes.map(node => `- ${node.title}: ${node.content.substring(0, 100)}...`).join('\n')}

${focusArea ? `Focus Area: ${focusArea}` : ''}

Please provide specific suggestions for:
1. Content depth and detail improvements
2. Integration of additional research nodes
3. Clarity and flow enhancements
4. Academic rigor and evidence strengthening
5. Transition and connection improvements
6. Areas requiring more support or examples
7. Potential gaps or missing perspectives

Provide concrete, actionable recommendations with specific examples where possible.`
  };
}

/**
 * Parse suggestions response into structured format
 */
function parseSuggestions(content: string, type: SuggestionType) {
  // Split content into sections based on numbered lists or clear headers
  const sections = content.split(/\n(?=\d+\.|\*\*|##)/);
  
  const suggestions = {
    priority: [] as Array<{id: string, title: string, description: string, impact: string}>,
    secondary: [] as Array<{id: string, title: string, description: string, rationale: string}>,
    longTerm: [] as Array<{id: string, title: string, description: string, benefit: string}>,
    quickWins: [] as Array<{id: string, title: string, description: string}>,
    summary: '',
    nextSteps: [] as string[]
  };

  // Extract high-priority suggestions (usually in first sections)
  const highPriorityKeywords = ['critical', 'important', 'essential', 'immediate', 'urgent'];
  const quickWinKeywords = ['quick', 'easy', 'simple', 'immediate'];
  
  sections.forEach((section, index) => {
    const cleanSection = section.trim();
    if (!cleanSection) return;

    const isHighPriority = highPriorityKeywords.some(keyword => 
      cleanSection.toLowerCase().includes(keyword)
    );
    const isQuickWin = quickWinKeywords.some(keyword => 
      cleanSection.toLowerCase().includes(keyword)
    );

    // Extract title and description
    const lines = cleanSection.split('\n').filter(line => line.trim());
    const title = lines[0]?.replace(/^\d+\.\s*|\*\*|\##/g, '').trim() || `Suggestion ${index + 1}`;
    const description = lines.slice(1).join(' ').trim();

    const suggestionItem = {
      id: `suggestion_${index + 1}`,
      title,
      description,
      impact: isHighPriority ? 'High' : 'Medium',
      rationale: `Based on ${type.replace('_', ' ')} analysis`,
      benefit: 'Improves overall quality and academic rigor'
    };

    if (isHighPriority) {
      suggestions.priority.push(suggestionItem);
    } else if (isQuickWin) {
      suggestions.quickWins.push({
        id: suggestionItem.id,
        title: suggestionItem.title,
        description: suggestionItem.description
      });
    } else {
      suggestions.secondary.push(suggestionItem);
    }
  });

  // Generate summary and next steps
  suggestions.summary = generateSummary(type, suggestions);
  suggestions.nextSteps = generateNextSteps(type, suggestions);

  return suggestions;
}

/**
 * Generate summary based on suggestion type and content
 */
function generateSummary(type: SuggestionType, suggestions: any): string {
  const totalSuggestions = suggestions.priority.length + suggestions.secondary.length + suggestions.quickWins.length;
  
  switch (type) {
    case 'outline_improvement':
      return `Generated ${totalSuggestions} suggestions to improve outline structure and academic rigor. Focus on ${suggestions.priority.length} high-priority structural improvements.`;
    case 'node_exploration':
      return `Identified ${totalSuggestions} research areas and nodes to explore. Prioritize ${suggestions.priority.length} critical gaps in current research coverage.`;
    case 'structure_optimization':
      return `Provided ${totalSuggestions} optimization recommendations for improved organization and flow. ${suggestions.quickWins.length} quick wins available for immediate implementation.`;
    case 'content_enhancement':
      return `Suggested ${totalSuggestions} enhancements to strengthen content quality and depth. Focus on ${suggestions.priority.length} high-impact improvements first.`;
    default:
      return `Generated ${totalSuggestions} suggestions for improvement.`;
  }
}

/**
 * Generate next steps based on suggestion type
 */
function generateNextSteps(type: SuggestionType, suggestions: any): string[] {
  const baseSteps = [
    'Review all suggestions and prioritize based on your project timeline',
    'Implement quick wins first to see immediate improvements'
  ];

  switch (type) {
    case 'outline_improvement':
      return [
        ...baseSteps,
        'Restructure outline sections based on priority suggestions',
        'Review logical flow and ensure smooth transitions',
        'Validate changes against academic standards'
      ];
    case 'node_exploration':
      return [
        ...baseSteps,
        'Research and gather content for identified knowledge gaps',
        'Add new nodes to your knowledge graph',
        'Update outline to incorporate new research areas'
      ];
    case 'structure_optimization':
      return [
        ...baseSteps,
        'Reorganize content based on optimization recommendations',
        'Test new structure with stakeholders or advisors',
        'Refine based on feedback and academic requirements'
      ];
    case 'content_enhancement':
      return [
        ...baseSteps,
        'Enhance content depth in identified areas',
        'Integrate additional research and evidence',
        'Review for clarity and academic tone improvements'
      ];
    default:
      return baseSteps;
  }
}

/**
 * Fetch nodes by their IDs - reusing from other AI endpoints
 */
async function fetchNodesByIds(nodeIds: string[]): Promise<NodeData[]> {
  const sampleNodes: NodeData[] = [
    {
      id: '1',
      title: 'Climate Change Overview',
      content: 'Climate change refers to long-term shifts in global or regional climate patterns, primarily attributed to human activities since the mid-20th century.',
      type: 'topic',
      source: 'IPCC Report 2023',
      connections: ['2', '3']
    },
    {
      id: '2', 
      title: 'Greenhouse Gas Emissions',
      content: 'The primary driver of climate change is the increase in greenhouse gases, particularly carbon dioxide from fossil fuel combustion.',
      type: 'subtopic',
      source: 'NASA Climate Data',
      connections: ['1', '4']
    },
    {
      id: '3',
      title: 'Impact on Ecosystems',
      content: 'Climate change affects ecosystems through temperature changes, altered precipitation patterns, and extreme weather events.',
      type: 'subtopic', 
      source: 'Nature Journal 2023',
      connections: ['1']
    },
    {
      id: '4',
      title: 'Carbon Footprint Measurement',
      content: 'Detailed methodologies for measuring and calculating carbon footprints across different industries and activities.',
      type: 'detail',
      source: 'Environmental Science Research',
      connections: ['2']
    }
  ];

  return sampleNodes.filter(node => nodeIds.includes(node.id));
}

// GET endpoint for testing and documentation
export async function GET() {
  return NextResponse.json({
    message: 'AI Suggestions API is ready',
    supportedTypes: [
      'outline_improvement',
      'node_exploration', 
      'structure_optimization',
      'content_enhancement'
    ],
    usage: {
      endpoint: '/api/ai/suggestions',
      method: 'POST',
      requiredFields: ['type'],
      optionalFields: ['outline', 'nodeIds', 'currentContent', 'focusArea', 'academicLevel']
    },
    examples: {
      outlineImprovement: {
        type: 'outline_improvement',
        outline: { /* outline object */ },
        nodeIds: ['1', '2', '3']
      },
      nodeExploration: {
        type: 'node_exploration',
        outline: { /* outline object */ },
        nodeIds: ['1', '2']
      }
    }
  });
}
