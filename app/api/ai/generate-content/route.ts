import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { 
  CONTENT_GENERATION_PROMPT, 
  generateContentPrompt,
  NodeData,
  ContentContext 
} from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      outline, 
      nodeIds, 
      targetLength = 'medium',
      tone = 'academic',
      audience,
      sectionId // Optional: generate content for specific section
    } = body;

    // Validate required parameters
    if (!outline) {
      return NextResponse.json(
        { error: 'Outline is required' },
        { status: 400 }
      );
    }

    if (!nodeIds || !Array.isArray(nodeIds)) {
      return NextResponse.json(
        { error: 'Node IDs array is required' },
        { status: 400 }
      );
    }

    // Validate target length and tone
    const validLengths = ['short', 'medium', 'long'];
    const validTones = ['academic', 'professional', 'casual'];

    if (!validLengths.includes(targetLength)) {
      return NextResponse.json(
        { error: 'Invalid target length. Must be: short, medium, or long' },
        { status: 400 }
      );
    }

    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { error: 'Invalid tone. Must be: academic, professional, or casual' },
        { status: 400 }
      );
    }

    // Fetch node data
    const nodes = await fetchNodesByIds(nodeIds);
    
    if (nodes.length === 0) {
      return NextResponse.json(
        { error: 'No valid nodes found for provided IDs' },
        { status: 404 }
      );
    }

    // Prepare context for content generation
    const context: ContentContext = {
      outline: sectionId ? extractSection(outline, sectionId) : outline,
      nodes,
      targetLength,
      tone,
      audience
    };

    // Generate content using OpenAI
    const contentPrompt = generateContentPrompt(context);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        CONTENT_GENERATION_PROMPT,
        contentPrompt
      ],
      temperature: 0.7,
      max_tokens: getMaxTokensForLength(targetLength),
    });

    const generatedContent = completion.choices[0].message.content;
    
    if (!generatedContent) {
      throw new Error('No content generated from OpenAI');
    }

    // Structure the response
    const response = {
      content: generatedContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        targetLength,
        tone,
        audience,
        sectionId,
        estimatedTokens: completion.usage?.total_tokens || 0,
        wordCount: estimateWordCount(generatedContent)
      },
      usedNodes: nodes.map(node => ({ 
        id: node.id, 
        title: node.title,
        relevanceScore: calculateRelevanceScore(node, context)
      })),
      suggestions: {
        nextSteps: generateNextSteps(context, generatedContent),
        improvementAreas: generateImprovementSuggestions(generatedContent, context)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating AI content:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract a specific section from the outline if sectionId is provided
 */
function extractSection(outline: any, sectionId: string): any {
  if (!outline.sections) return outline;
  
  const section = outline.sections.find((s: any) => s.id === sectionId);
  if (section) {
    return {
      title: `${outline.title} - ${section.title}`,
      sections: [section]
    };
  }
  
  // Look in subsections
  for (const section of outline.sections) {
    if (section.subsections) {
      const subsection = section.subsections.find((sub: any) => sub.id === sectionId);
      if (subsection) {
        return {
          title: `${outline.title} - ${section.title} - ${subsection.title}`,
          sections: [{
            ...section,
            subsections: [subsection]
          }]
        };
      }
    }
  }
  
  return outline; // Return full outline if section not found
}

/**
 * Get appropriate max tokens based on target length
 */
function getMaxTokensForLength(targetLength: string): number {
  switch (targetLength) {
    case 'short': return 800;
    case 'medium': return 1500;
    case 'long': return 2500;
    default: return 1500;
  }
}

/**
 * Estimate word count from text
 */
function estimateWordCount(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculate relevance score for a node based on content context
 */
function calculateRelevanceScore(node: NodeData, context: ContentContext): number {
  // Simple relevance scoring based on keyword matching
  const outlineText = JSON.stringify(context.outline).toLowerCase();
  const nodeKeywords = node.title.toLowerCase().split(' ');
  
  let score = 0;
  nodeKeywords.forEach(keyword => {
    if (outlineText.includes(keyword)) {
      score += 1;
    }
  });
  
  return Math.min(score / nodeKeywords.length, 1.0);
}

/**
 * Generate next steps suggestions
 */
function generateNextSteps(context: ContentContext, generatedContent: string): string[] {
  const suggestions = [
    'Review and fact-check the generated content against your research nodes',
    'Add specific citations and references where indicated',
    'Consider expanding sections that need more detail or examples'
  ];
  
  if (context.targetLength === 'short') {
    suggestions.push('Consider generating a longer version for more comprehensive coverage');
  }
  
  if (context.tone === 'academic') {
    suggestions.push('Review for proper academic terminology and citation format');
  }
  
  return suggestions;
}

/**
 * Generate improvement suggestions
 */
function generateImprovementSuggestions(content: string, context: ContentContext): string[] {
  const suggestions = [];
  const wordCount = estimateWordCount(content);
  
  if (wordCount < 200) {
    suggestions.push('Content may benefit from additional detail and examples');
  }
  
  if (!content.includes('Furthermore') && !content.includes('Moreover')) {
    suggestions.push('Consider adding transitional phrases to improve flow');
  }
  
  if (context.tone === 'academic' && !content.includes('research') && !content.includes('study')) {
    suggestions.push('Consider adding more references to research and studies');
  }
  
  return suggestions;
}

/**
 * Fetch nodes by their IDs - same implementation as outline generation
 */
async function fetchNodesByIds(nodeIds: string[]): Promise<NodeData[]> {
  const sampleNodes: NodeData[] = [
    {
      id: '1',
      title: 'Climate Change Overview',
      content: 'Climate change refers to long-term shifts in global or regional climate patterns, primarily attributed to human activities since the mid-20th century. The phenomenon encompasses rising global temperatures, changing precipitation patterns, and increased frequency of extreme weather events.',
      type: 'topic',
      source: 'IPCC Report 2023',
      connections: ['2', '3']
    },
    {
      id: '2', 
      title: 'Greenhouse Gas Emissions',
      content: 'The primary driver of climate change is the increase in greenhouse gases, particularly carbon dioxide from fossil fuel combustion. Since the Industrial Revolution, atmospheric CO2 levels have increased by over 40%, contributing to global warming through the greenhouse effect.',
      type: 'subtopic',
      source: 'NASA Climate Data',
      connections: ['1', '4']
    },
    {
      id: '3',
      title: 'Impact on Ecosystems',
      content: 'Climate change affects ecosystems through temperature changes, altered precipitation patterns, and extreme weather events. These changes disrupt food chains, migration patterns, and species distribution, leading to biodiversity loss and ecosystem degradation.',
      type: 'subtopic', 
      source: 'Nature Journal 2023',
      connections: ['1']
    },
    {
      id: '4',
      title: 'Carbon Footprint Measurement',
      content: 'Detailed methodologies for measuring and calculating carbon footprints across different industries and activities. This includes lifecycle assessments, emissions factors, and standardized reporting frameworks used by organizations to track their environmental impact.',
      type: 'detail',
      source: 'Environmental Science Research',
      connections: ['2']
    }
  ];

  return sampleNodes.filter(node => nodeIds.includes(node.id));
}
