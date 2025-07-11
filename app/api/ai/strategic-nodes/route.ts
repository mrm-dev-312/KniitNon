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

interface NodeGenerationRequest {
  topic: string;
  researchContext?: string;
  academicLevel?: 'undergraduate' | 'graduate' | 'professional';
  generationStrategy?: 'progressive_disclosure' | 'field_boundaries' | 'high_level_concepts' | 'comprehensive';
  maxDepth?: number;
  focusAreas?: string[];
  excludeAreas?: string[];
}

interface StrategicNode {
  id: string;
  title: string;
  content: string;
  type: 'field_boundary' | 'core_concept' | 'methodological_approach' | 'theoretical_framework';
  depth: number;
  importance: 'critical' | 'important' | 'supplementary';
  lens: string;
  strategicRationale: string;
  nextSteps: string[];
  prerequisiteNodes: string[];
  connections: string[];
  expansionPotential: 'high' | 'medium' | 'low';
}

interface NodeGenerationResponse {
  strategy: string;
  phase: 'foundation' | 'exploration' | 'analysis' | 'synthesis';
  nodes: StrategicNode[];
  fieldBoundaries: {
    included: string[];
    excluded: string[];
    reasoning: string;
  };
  conceptualFramework: {
    coreThemes: string[];
    methodologicalApproaches: string[];
    theoreticalFoundations: string[];
  };
  progressionMap: {
    currentPhase: string;
    nextPhase: string;
    readinessIndicators: string[];
  };
  metadata: {
    generatedAt: string;
    strategy: string;
    academicLevel: string;
    totalNodes: number;
    estimatedCompletionTime: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const {
      topic,
      researchContext,
      academicLevel = 'undergraduate',
      generationStrategy = 'progressive_disclosure',
      maxDepth = 2,
      focusAreas = [],
      excludeAreas = []
    }: NodeGenerationRequest = await request.json();

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Generate strategic nodes based on the chosen strategy
    const response = await generateStrategicNodes({
      topic,
      researchContext,
      academicLevel,
      generationStrategy,
      maxDepth,
      focusAreas,
      excludeAreas
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating strategic nodes:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate strategic nodes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate strategic nodes using the enhanced generation strategy
 */
async function generateStrategicNodes(request: NodeGenerationRequest): Promise<NodeGenerationResponse> {
  // Ensure all fields have default values
  const strategy = request.generationStrategy || 'progressive_disclosure';
  const academicLevel = request.academicLevel || 'undergraduate';
  const focusAreas = request.focusAreas || [];
  const excludeAreas = request.excludeAreas || [];
  
  const systemPrompt = createStrategicPrompt({
    ...request,
    generationStrategy: strategy,
    academicLevel,
    focusAreas,
    excludeAreas
  });
  
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
        max_tokens: 4000,
      });
      generatedContent = response.choices[0]?.message?.content || '';
    }

    // Parse the AI response
    const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure all required fields are present
      return {
        strategy,
        phase: determineCurrentPhase(strategy),
        nodes: parsed.nodes || [],
        fieldBoundaries: parsed.fieldBoundaries || { included: [], excluded: [], reasoning: '' },
        conceptualFramework: parsed.conceptualFramework || { 
          coreThemes: [], 
          methodologicalApproaches: [], 
          theoreticalFoundations: [] 
        },
        progressionMap: parsed.progressionMap || {
          currentPhase: 'foundation',
          nextPhase: 'exploration',
          readinessIndicators: []
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          strategy,
          academicLevel,
          totalNodes: parsed.nodes?.length || 0,
          estimatedCompletionTime: calculateEstimatedTime(parsed.nodes?.length || 0, academicLevel)
        }
      };
    }

    throw new Error('No valid JSON found in AI response');

  } catch (error) {
    console.error('Error in strategic node generation:', error);
    return generateFallbackResponse(request);
  }
}

/**
 * Create a strategic prompt based on the generation strategy
 */
function createStrategicPrompt(request: NodeGenerationRequest): string {
  const strategy = request.generationStrategy || 'progressive_disclosure';
  const academicLevel = request.academicLevel || 'undergraduate';
  const focusAreas = request.focusAreas || [];
  const excludeAreas = request.excludeAreas || [];
  
  const basePrompt = `You are an expert research strategist and academic advisor specializing in ${academicLevel}-level research design. Your role is to create a strategic node generation plan that prioritizes high-level conceptual understanding before detailed exploration.

Research Topic: "${request.topic}"
${request.researchContext ? `Research Context: ${request.researchContext}` : ''}
Academic Level: ${academicLevel}
Generation Strategy: ${strategy}
Maximum Depth: ${request.maxDepth}
${focusAreas.length > 0 ? `Focus Areas: ${focusAreas.join(', ')}` : ''}
${excludeAreas.length > 0 ? `Exclude Areas: ${excludeAreas.join(', ')}` : ''}

STRATEGIC PRINCIPLES:
1. **Foundation First**: Start with field boundaries and core concepts before exploring details
2. **Progressive Disclosure**: Reveal complexity gradually, ensuring solid understanding at each level
3. **Conceptual Clarity**: Prioritize understanding fundamental principles over comprehensive coverage
4. **Strategic Depth**: Focus on areas with highest learning impact and research potential
5. **Methodological Awareness**: Include approaches and frameworks appropriate to academic level

${getStrategySpecificInstructions(strategy)}

Generate a strategic research plan in this exact JSON format:
{
  "nodes": [
    {
      "id": "strategic-node-1",
      "title": "Field Boundary or Core Concept Title",
      "content": "Comprehensive explanation focusing on understanding rather than detail",
      "type": "field_boundary" | "core_concept" | "methodological_approach" | "theoretical_framework",
      "depth": 0-${request.maxDepth},
      "importance": "critical" | "important" | "supplementary",
      "lens": "Technology" | "Science" | "History" | "Philosophy" | "Ethics" | "Other",
      "strategicRationale": "Why this node is essential for foundational understanding",
      "nextSteps": ["Specific follow-up actions", "Areas for deeper exploration"],
      "prerequisiteNodes": ["node-ids that should be understood first"],
      "connections": ["related-node-ids"],
      "expansionPotential": "high" | "medium" | "low"
    }
  ],
  "fieldBoundaries": {
    "included": ["Major areas within scope"],
    "excluded": ["Areas deliberately excluded and why"],
    "reasoning": "Strategic rationale for boundary decisions"
  },
  "conceptualFramework": {
    "coreThemes": ["3-5 fundamental themes"],
    "methodologicalApproaches": ["Appropriate research methods"],
    "theoreticalFoundations": ["Key theoretical perspectives"]
  },
  "progressionMap": {
    "currentPhase": "foundation" | "exploration" | "analysis" | "synthesis",
    "nextPhase": "What comes after mastering current nodes",
    "readinessIndicators": ["Signs that student is ready for next phase"]
  }
}

QUALITY CRITERIA:
- Nodes should build logical progression from general to specific
- Each node should have clear learning objectives and outcomes
- Content should be substantial but not overwhelming
- Strategic rationale should be explicit and educationally sound
- Connections should reflect genuine conceptual relationships
- Focus on understanding over information coverage`;

  return basePrompt;
}

/**
 * Get strategy-specific instructions
 */
function getStrategySpecificInstructions(strategy: string): string {
  switch (strategy) {
    case 'progressive_disclosure':
      return `PROGRESSIVE DISCLOSURE STRATEGY:
- Start with 3-5 foundational concepts that establish field boundaries
- Each node should prepare understanding for the next level
- Avoid overwhelming detail in early stages
- Create clear "readiness indicators" for advancing to next level
- Design nodes that build confidence and competence gradually`;

    case 'field_boundaries':
      return `FIELD BOUNDARIES STRATEGY:
- Clearly define what is within and outside the research scope
- Identify major disciplinary perspectives and their limitations  
- Establish methodological boundaries appropriate to academic level
- Create nodes that help distinguish this field from related areas
- Focus on "big picture" understanding before specific topics`;

    case 'high_level_concepts':
      return `HIGH-LEVEL CONCEPTS STRATEGY:
- Prioritize fundamental principles and overarching themes
- Create nodes for major theoretical frameworks and paradigms
- Focus on conceptual understanding over factual knowledge
- Ensure each concept has clear real-world relevance and application
- Build abstract thinking skills appropriate to academic level`;

    case 'comprehensive':
      return `COMPREHENSIVE STRATEGY:
- Balance breadth and depth appropriately for academic level
- Include both theoretical and practical perspectives
- Create systematic coverage of major sub-areas
- Ensure methodological diversity in approaches
- Prepare for advanced research and analysis`;

    default:
      return `BALANCED STRATEGY:
- Combine elements of progressive disclosure and field boundaries
- Prioritize foundational understanding with strategic depth
- Maintain focus on academic level appropriateness`;
  }
}

/**
 * Determine the current phase based on strategy
 */
function determineCurrentPhase(strategy: string): 'foundation' | 'exploration' | 'analysis' | 'synthesis' {
  switch (strategy) {
    case 'progressive_disclosure':
    case 'field_boundaries':
    case 'high_level_concepts':
      return 'foundation';
    case 'comprehensive':
      return 'exploration';
    default:
      return 'foundation';
  }
}

/**
 * Calculate estimated completion time based on nodes and academic level
 */
function calculateEstimatedTime(nodeCount: number, academicLevel: string): string {
  const baseTimePerNode = {
    'undergraduate': 15, // minutes
    'graduate': 25,
    'professional': 35
  };

  const totalMinutes = nodeCount * (baseTimePerNode[academicLevel as keyof typeof baseTimePerNode] || 20);
  
  if (totalMinutes < 60) {
    return `${totalMinutes} minutes`;
  } else if (totalMinutes < 120) {
    return `${Math.round(totalMinutes / 60 * 10) / 10} hours`;
  } else {
    return `${Math.round(totalMinutes / 60)} hours`;
  }
}

/**
 * Generate fallback response when AI generation fails
 */
function generateFallbackResponse(request: NodeGenerationRequest): NodeGenerationResponse {
  const strategy = request.generationStrategy || 'progressive_disclosure';
  const academicLevel = request.academicLevel || 'undergraduate';
  
  const fallbackNodes: StrategicNode[] = [
    {
      id: 'fallback-field-boundary',
      title: `${request.topic} - Field Overview`,
      content: `This node provides a foundational overview of ${request.topic}, establishing the scope and boundaries of this research area. Understanding these boundaries is essential before diving into specific details.`,
      type: 'field_boundary',
      depth: 0,
      importance: 'critical',
      lens: 'Other',
      strategicRationale: 'Establishing clear field boundaries prevents scope creep and ensures focused research',
      nextSteps: ['Define specific research questions', 'Identify key stakeholders and perspectives'],
      prerequisiteNodes: [],
      connections: [],
      expansionPotential: 'high'
    },
    {
      id: 'fallback-core-concept',
      title: `Core Concepts in ${request.topic}`,
      content: `This node introduces the fundamental concepts and terminology essential for understanding ${request.topic}. These concepts form the foundation for all subsequent exploration.`,
      type: 'core_concept',
      depth: 0,
      importance: 'critical',
      lens: 'Other',
      strategicRationale: 'Solid conceptual foundation is prerequisite for meaningful research',
      nextSteps: ['Explore applications of core concepts', 'Examine relationships between concepts'],
      prerequisiteNodes: ['fallback-field-boundary'],
      connections: ['fallback-field-boundary'],
      expansionPotential: 'high'
    }
  ];

  return {
    strategy,
    phase: 'foundation',
    nodes: fallbackNodes,
    fieldBoundaries: {
      included: [request.topic],
      excluded: ['Areas requiring specialized expertise beyond current scope'],
      reasoning: 'Conservative scope to ensure solid foundational understanding'
    },
    conceptualFramework: {
      coreThemes: ['Foundational Understanding', 'Scope Definition'],
      methodologicalApproaches: ['Literature Review', 'Conceptual Analysis'],
      theoreticalFoundations: ['To be determined based on field boundaries']
    },
    progressionMap: {
      currentPhase: 'foundation',
      nextPhase: 'exploration',
      readinessIndicators: ['Clear understanding of field boundaries', 'Familiarity with core concepts']
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      strategy,
      academicLevel,
      totalNodes: fallbackNodes.length,
      estimatedCompletionTime: calculateEstimatedTime(fallbackNodes.length, academicLevel)
    }
  };
}
